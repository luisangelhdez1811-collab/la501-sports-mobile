import { useSyncExternalStore } from 'react';

import { ApiError, errorMessage } from '@/api/client';
import { sendToKitchen, type KitchenItem } from '@/api/waiter';
import { readCache, writeCache } from '@/utils/offline-cache';

/**
 * Orders the waiter took while the server couldn't be reached. They're saved on the phone
 * the moment they're taken and sent in the same order once there's a connection, each with
 * its own reference so the server never registers one twice. Charging always needs a
 * connection, so only orders (no money) ever wait here.
 */

export type OutboxItem = KitchenItem & { name: string; price: number };

export type OutboxOrder = {
  ref: string;
  tableId: number;
  tableNumber: string;
  /** Diner ("Persona 1") or the name the waiter typed. */
  label: string;
  items: OutboxItem[];
  /** Estimate from the menu prices on the phone; the server recalculates it. */
  total: number;
  createdAt: string;
  /** Email of the waiter who took it: only their session sends it. */
  owner: string;
  attempts: number;
  /** The server rejected it; it waits for the waiter to retry or discard it. */
  error: string | null;
};

type NewOrder = Omit<OutboxOrder, 'attempts' | 'error'>;

type OutboxState = {
  entries: OutboxOrder[];
  syncing: boolean;
};

const DISK_KEY = 'waiter-outbox';

let state: OutboxState = { entries: [], syncing: false };
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(patch: Partial<OutboxState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function setEntries(entries: OutboxOrder[]) {
  // Written right away (synchronously): an order must survive the app closing.
  writeCache(DISK_KEY, entries);
  setState({ entries });
}

/** Unique enough for one phone; the server also enforces uniqueness. */
export function newRef(prefix: 'pedido' | 'cobro') {
  const random = Math.random().toString(36).slice(2, 12);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

export function loadOutbox() {
  loading ??= readCache<OutboxOrder[]>(DISK_KEY).then((saved) => {
    if (!saved || !Array.isArray(saved.data)) return;
    // Only orders: anything else saved by an older version of the app is ignored.
    const orders = saved.data.filter((e) => Array.isArray(e?.items));
    // Anything queued before the saved copy finished loading goes after it.
    const known = new Set(orders.map((e) => e.ref));
    setEntries([...orders, ...state.entries.filter((e) => !known.has(e.ref))]);
  });
  return loading;
}

export function enqueue(order: NewOrder) {
  setEntries([...state.entries, { ...order, attempts: 0, error: null }]);
}

function update(ref: string, patch: Partial<OutboxOrder>) {
  setEntries(state.entries.map((e) => (e.ref === ref ? { ...e, ...patch } : e)));
}

function remove(ref: string) {
  setEntries(state.entries.filter((e) => e.ref !== ref));
}

function send(order: OutboxOrder) {
  return sendToKitchen(order.tableId, {
    items: order.items,
    label: order.label,
    clientRef: order.ref,
    offline: true,
    createdAt: order.createdAt,
  });
}

// Worth retrying later on their own: no connection, server down, rate limit, session.
const isTemporary = (err: unknown) =>
  err instanceof ApiError && (err.status === 0 || err.status === 401 || err.status === 429 || err.status >= 500);

/**
 * Sends every order this user has pending, oldest first. Stops at the first temporary
 * failure (the rest would fail the same way, and the kitchen gets them in order). Safe to
 * call often; only one run at a time.
 */
export async function syncOutbox(owner: string | null) {
  if (state.syncing || !owner) return;
  await loadOutbox();
  if (!state.entries.some((e) => e.owner === owner && !e.error)) return;

  setState({ syncing: true });
  let sent = 0;
  try {
    for (const entry of state.entries) {
      if (entry.owner !== owner || entry.error) continue;
      try {
        await send(entry);
        remove(entry.ref);
        sent += 1;
      } catch (err) {
        if (isTemporary(err)) {
          update(entry.ref, { attempts: entry.attempts + 1 });
          break;
        }
        update(entry.ref, { attempts: entry.attempts + 1, error: errorMessage(err) });
      }
    }
  } finally {
    setState({ syncing: false });
  }
  return sent;
}

/** After fixing whatever the server rejected (or just to try again). */
export function retryEntry(ref: string) {
  update(ref, { error: null });
}

/** Only an order the server rejected; one still waiting for a connection stays. */
export function discardRejectedOrder(ref: string) {
  if (state.entries.find((e) => e.ref === ref)?.error) remove(ref);
}

export function pendingCount(owner: string | null) {
  return state.entries.filter((e) => e.owner === owner).length;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function outboxSnapshot() {
  return state;
}

export function useOutbox() {
  return useSyncExternalStore(subscribe, outboxSnapshot);
}
