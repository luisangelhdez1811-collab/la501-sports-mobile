import { useNetworkState } from 'expo-network';
import { useEffect, useRef } from 'react';

/**
 * True as soon as the device loses its connection (no reload needed). Unknown states
 * (still detecting) count as online so the app never flashes "Sin conexión" on launch.
 */
export function useIsOffline() {
  const state = useNetworkState();
  return state.isConnected === false || state.isInternetReachable === false;
}

/** Runs `callback` when the connection comes back after being lost. */
export function useOnReconnect(callback: () => void) {
  const offline = useIsOffline();
  const wasOffline = useRef(offline);
  const latest = useRef(callback);

  useEffect(() => {
    latest.current = callback;
  });

  useEffect(() => {
    if (wasOffline.current && !offline) latest.current();
    wasOffline.current = offline;
  }, [offline]);
}
