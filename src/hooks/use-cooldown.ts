import { useEffect, useState } from 'react';

import { ApiError } from '@/api/client';

/** Seconds before another code can be requested after one is sent. */
export const RESEND_SECONDS = 30;

/**
 * Countdown for "Reenviar código". `track` wraps a send: success starts the normal wait,
 * and a 429 from the server starts the wait it asked for (Retry-After).
 */
export function useCooldown() {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until === 0) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= until) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [until]);

  const start = (seconds: number) => {
    const t = Date.now();
    setNow(t);
    setUntil(t + seconds * 1000);
  };

  const track = async (send: () => Promise<void>) => {
    try {
      await send();
      start(RESEND_SECONDS);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429 && err.retryAfter) start(err.retryAfter);
      throw err;
    }
  };

  return { remaining: Math.max(0, Math.ceil((until - now) / 1000)), track };
}
