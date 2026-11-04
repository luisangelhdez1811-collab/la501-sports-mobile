import { useEffect, useState } from 'react';

import { cancelOrder, trackOrder, type OrderStatus, type Tracking } from '@/api/account';
import { errorMessage } from '@/api/client';
import { useCart } from '@/hooks/use-cart';

const POLL_MS = 10000;

// Nothing else will change once the order gets here.
export const FINAL_STATUSES: OrderStatus[] = ['delivered', 'cancelled'];
// The restaurant has it: a card payment went through (or it's cash).
const CONFIRMED: OrderStatus[] = ['paid', 'preparing', 'ready', 'delivering', 'delivered'];

/**
 * Order tracking ViewModel: asks the server every few seconds until the order is delivered or
 * cancelled (and stops on leaving), lets the customer cancel while the kitchen hasn't started,
 * and lets a card order's cart go once its payment is confirmed.
 */
export function useOrderTracking(token: string) {
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const { paymentConfirmed } = useCart();
  const status = tracking?.status;

  // A card order keeps the cart until its payment is confirmed (then it can go).
  useEffect(() => {
    if (status && CONFIRMED.includes(status)) paymentConfirmed(token);
  }, [status, token, paymentConfirmed]);

  useEffect(() => {
    let controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = () => {
      controller = new AbortController();
      trackOrder(token, controller.signal)
        .then((data) => {
          setTracking(data);
          setError(null);
          if (!FINAL_STATUSES.includes(data.status)) timer = setTimeout(load, POLL_MS);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setError(errorMessage(err));
          timer = setTimeout(load, POLL_MS * 3);
        });
    };
    load();

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [token, reloadKey]);

  const cancel = async () => {
    setCancelling(true);
    try {
      setTracking(await cancelOrder(token));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCancelling(false);
      // The server's answer may be partial: read the order again.
      setReloadKey((k) => k + 1);
    }
  };

  return { tracking, error, cancelling, cancel };
}
