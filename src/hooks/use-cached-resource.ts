import { useEffect, useState } from 'react';

import { errorMessage } from '@/api/client';
import { useOnReconnect } from '@/hooks/use-connectivity';
import { readCache, writeCache } from '@/utils/offline-cache';

type ResourceState<T> = {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  /** Only set when there is nothing to show. */
  error: string | null;
  /** The data on screen is older than the last attempt (the server couldn't be reached). */
  stale: boolean;
};

type Options<T> = {
  /**
   * Also keep a copy on the device so it shows after a restart without internet.
   * Off by default to keep the app light; only prioritized screens opt in.
   */
  persist?: boolean;
  /** Turns cached JSON back into the right shape (e.g. revive dates). */
  revive?: (cached: T) => T;
  enabled?: boolean;
};

/**
 * Loads server data for a screen: shows "Sin conexión" while offline and refreshes by
 * itself when the connection comes back.
 */
export function useCachedResource<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  { persist = false, revive, enabled = true }: Options<T> = {},
) {
  const [state, setState] = useState<ResourceState<T>>({
    data: null,
    loading: true,
    refreshing: false,
    error: null,
    stale: false,
  });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const fromDisk = async () => {
      if (!persist) return null;
      const cached = await readCache<T>(key);
      return cached ? (revive ? revive(cached.data) : cached.data) : null;
    };

    // Show the saved copy right away, unless fresh data already arrived.
    fromDisk().then((data) => {
      if (data === null || controller.signal.aborted) return;
      setState((s) => (s.data === null ? { ...s, data, loading: false } : s));
    });

    fetcher(controller.signal)
      .then((data) => {
        if (persist) writeCache(key, data);
        setState({ data, loading: false, refreshing: false, error: null, stale: false });
      })
      .catch(async (err: unknown) => {
        if (controller.signal.aborted) return;
        const saved = await fromDisk();
        setState((s) => {
          const data = s.data ?? saved;
          return {
            data,
            loading: false,
            refreshing: false,
            error: data === null ? errorMessage(err) : null,
            stale: data !== null,
          };
        });
      });

    return () => controller.abort();
    // fetcher/revive are recreated every render; the key and reloads drive refetching.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reloadKey, enabled]);

  const reload = () => {
    setState((s) => ({ ...s, loading: s.data === null, error: null }));
    setReloadKey((k) => k + 1);
  };

  // Back online: refresh automatically if the last attempt failed.
  useOnReconnect(() => {
    if (enabled && (state.stale || state.error)) reload();
  });

  const refresh = () => {
    setState((s) => ({ ...s, refreshing: true }));
    setReloadKey((k) => k + 1);
  };

  return { ...state, reload, refresh };
}
