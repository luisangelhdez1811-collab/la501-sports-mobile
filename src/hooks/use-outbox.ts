import { useEffect } from 'react';
import { AppState } from 'react-native';

import { discardRejectedOrder, loadOutbox, retryEntry, syncOutbox, useOutbox } from '@/data/waiter-outbox';
import { useAuth } from '@/hooks/use-auth';
import { useIsOffline } from '@/hooks/use-connectivity';

const RETRY_MS = 30_000;

/**
 * Sends the waiter's saved orders in the background: right away, when the connection comes
 * back, when the app returns to the foreground and every 30 s while anything is pending.
 */
export function useOutboxSync() {
  const { user } = useAuth();
  const offline = useIsOffline();
  const { entries } = useOutbox();
  const owner = user?.email ?? null;
  const pending = entries.some((e) => e.owner === owner && !e.error);

  useEffect(() => {
    loadOutbox();
  }, []);

  useEffect(() => {
    if (!offline && pending) syncOutbox(owner);
  }, [offline, pending, owner]);

  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => syncOutbox(owner), RETRY_MS);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') syncOutbox(owner);
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [pending, owner]);
}

/** This waiter's orders still on the phone (of one table, or all): waiting and rejected. */
export function useMyOutbox(tableId?: number) {
  const { user } = useAuth();
  const offline = useIsOffline();
  const { entries, syncing } = useOutbox();
  const mine = entries.filter((e) => e.owner === user?.email && (tableId === undefined || e.tableId === tableId));
  const rejected = mine.filter((e) => e.error);
  return {
    offline,
    syncing,
    waiting: mine.length - rejected.length,
    rejected,
    retry: retryEntry,
    discard: discardRejectedOrder,
  };
}
