import { Alert } from 'react-native';

import { pendingCount } from '@/data/waiter-outbox';
import { useAuth } from '@/hooks/use-auth';

/**
 * Sign out, unless this user still has orders saved on the phone: only this session can
 * send them, so signing out now would leave the kitchen without them.
 */
export function useGuardedSignOut() {
  const { user, signOut } = useAuth();

  return () => {
    const pending = pendingCount(user?.email ?? null);
    if (pending > 0) {
      Alert.alert(
        'Hay pedidos sin enviar',
        `Tienes ${pending} ${pending === 1 ? 'pedido guardado' : 'pedidos guardados'} en el teléfono. Conéctate a internet para que se envíen al sistema y después cierra sesión.`,
      );
      return;
    }
    signOut();
  };
}
