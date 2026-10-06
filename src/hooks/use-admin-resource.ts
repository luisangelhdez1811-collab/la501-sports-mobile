import { useEffect, useState } from 'react';

import { ApiError, errorMessage } from '@/api/client';
import { useIsOffline } from '@/hooks/use-connectivity';

type State<T> = {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  /** The server doesn't offer this endpoint yet (404). */
  unavailable: boolean;
};

const EMPTY = { data: null, loading: true, refreshing: false, error: null, unavailable: false };

/**
 * Loads admin panel data. It's sensitive, so it lives only on the server: nothing is
 * saved on the device, it's dropped from memory as soon as the connection is lost, and
 * it's fetched fresh when the connection returns. `key` changes (a new filter) refetch.
 */
export function useAdminResource<T>(key: string, fetcher: (signal: AbortSignal) => Promise<T>) {
  const offline = useIsOffline();
  const [state, setState] = useState<State<T>>(EMPTY);
  const [reloadKey, setReloadKey] = useState(0);
  const [wasOffline, setWasOffline] = useState(offline);

  // Connection changed: forget the data when it drops, reload it when it's back.
  if (offline !== wasOffline) {
    setWasOffline(offline);
    setState(EMPTY);
    if (!offline) setReloadKey((k) => k + 1);
  }

  useEffect(() => {
    if (offline) return;
    const controller = new AbortController();
    fetcher(controller.signal)
      .then((data) => setState({ data, loading: false, refreshing: false, error: null, unavailable: false }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const unavailable = err instanceof ApiError && err.status === 404;
        setState((s) => ({
          ...s,
          loading: false,
          refreshing: false,
          unavailable,
          error: unavailable ? null : errorMessage(err),
        }));
      });
    return () => controller.abort();
    // The fetcher is recreated every render; the key and reloads drive refetching.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reloadKey, offline]);

  const reload = () => {
    setState((s) => ({ ...s, loading: s.data === null, error: null }));
    setReloadKey((k) => k + 1);
  };
  const refresh = () => {
    setState((s) => ({ ...s, refreshing: true }));
    setReloadKey((k) => k + 1);
  };

  return { ...state, reload, refresh };
}
