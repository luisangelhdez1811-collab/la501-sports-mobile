import { Alert } from 'react-native';

import { pendingCount } from '@/data/waiter-outbox';
import { useAuth } from '@/hooks/use-auth';

/**
 * Sign out, unless this user still has orders or charges saved on the phone: they could
 * only be sent with this session, and a charge that never reaches the server looks like
 * missing money.
 */
export function useGuardedSignOut() {
  const { user, signOut } = useAuth();

  return () => {
    const pending = pendingCount(user?.email ?? null);
    if (pending > 0) {
      Alert.alert(
        'Hay operaciones sin enviar',
        `Tienes ${pending} ${pending === 1 ? 'pedido o cobro guardado' : 'pedidos o cobros guardados'} en el teléfono. Conéctate a internet para que se envíen al sistema y después cierra sesión.`,
      );
      return;
    }
    signOut();
  };
}
