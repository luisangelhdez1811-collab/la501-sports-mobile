import { router, useLocalSearchParams } from 'expo-router';

/** Screens that can ask to come back after signing in; anything else goes to the menu. */
const RETURN_TO = { carrito: '/carrito' } as const;

type ReturnTo = keyof typeof RETURN_TO;

const isReturnTo = (value: unknown): value is ReturnTo => typeof value === 'string' && value in RETURN_TO;

/**
 * Where a customer lands after signing in or creating an account: the menu, unless the
 * sign-in was opened from the cart (they were about to buy). The login and register
 * screens are closed on the way, so "back" never shows them again.
 */
export function useAfterSignIn() {
  const { volver } = useLocalSearchParams<{ volver?: string }>();
  const returnTo = isReturnTo(volver) ? volver : null;

  const goOn = () => {
    if (returnTo) {
      router.dismissTo(RETURN_TO[returnTo]);
      return;
    }
    if (router.canDismiss()) router.dismissAll();
    router.navigate('/');
  };

  /** Keeps the way back when switching between sign-in and register. */
  const params = returnTo ? { volver: returnTo } : {};

  return { goOn, params };
}
