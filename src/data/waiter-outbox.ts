import { useSyncExternalStore } from 'react';

import { ApiError, errorMessage } from '@/api/client';
import { chargeTable, sendToKitchen, type KitchenItem, type Payment } from '@/api/waiter';
import { readCache, writeCache } from '@/utils/offline-cache';

/**
 * Orders and charges the waiter made while the server couldn't be reached. They're saved
 * on the phone the moment they happen and sent in the same order once there's a
 * connection, each with its own reference so the server never registers one twice.
 *
 * It's the restaurant's record of money collected, so the waiter can't delete it: a charge
 * stays until the server confirms it, and signing out is blocked while anything is pending.
 * Only an order the server rejected can be discarded (no money involved).
 */

export type OutboxItem = KitchenItem & { name: string; price: number };

type OutboxBase = {
  ref: string;
  tableId: number;
  tableNumber: string;
  /** Diner ("Persona 1") or "Mesa completa" for a charge of everything. */
  label: string;
  /** Estimate from the menu prices on the phone; the server recalculates it. */
  total: number;
  createdAt: string;
  /** Email of the waiter who did it: only their session sends it. */
  owner: string;
  attempts: number;
  /** The server rejected it; it waits for the waiter to retry (or discard, for orders). */
  error: string | null;
};

export type OutboxOrder = OutboxBase & { kind: 'order'; items: OutboxItem[] };
export type OutboxCharge = OutboxBase & {
  kind: 'charge';
  payments: Payment[];
  orderIds: number[];
  orderRefs: string[];
};
export type OutboxEntry = OutboxOrder | OutboxCharge;

type NewEntry = Omit<OutboxOrder, 'attempts' | 'error'> | Omit<OutboxCharge, 'attempts' | 'error'>;

type OutboxState = {
  entries: OutboxEntry[];
  syncing: boolean;
  /** Messages for the waiter about charges the server flagged for the admin. */
  notices: string[];
};

const DISK_KEY = 'waiter-outbox';

let state: OutboxState = { entries: [], syncing: false, notices: [] };
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(patch: Partial<OutboxState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function setEntries(entries: OutboxEntry[]) {
  // Written right away (synchronously): money collected must survive the app closing.
  writeCache(DISK_KEY, entries);
  setState({ entries });
}

/** Unique enough for one phone; the server also enforces uniqueness. */
export function newRef(prefix: 'pedido' | 'cobro') {
  const random = Math.random().toString(36).slice(2, 12);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

export function loadOutbox() {
  loading ??= readCache<OutboxEntry[]>(DISK_KEY).then((saved) => {
    if (!saved || !Array.isArray(saved.data)) return;
    // Anything queued before the saved copy finished loading goes after it.
    const known = new Set(saved.data.map((e) => e.ref));
    setEntries([...saved.data, ...state.entries.filter((e) => !known.has(e.ref))]);
  });
  return loading;
}

export function enqueue(entry: NewEntry) {
  setEntries([...state.entries, { ...entry, attempts: 0, error: null } as OutboxEntry]);
}

function update(ref: string, patch: Partial<OutboxBase>) {
  setEntries(state.entries.map((e) => (e.ref === ref ? { ...e, ...patch } : e)));
}

function remove(ref: string) {
  setEntries(state.entries.filter((e) => e.ref !== ref));
}

async function send(entry: OutboxEntry) {
  if (entry.kind === 'order') {
    await sendToKitchen(entry.tableId, {
      items: entry.items,
      label: entry.label,
      clientRef: entry.ref,
      offline: true,
      createdAt: entry.createdAt,
    });
    return;
  }
  const status = await chargeTable(entry.tableId, {
    payments: entry.payments,
    orderIds: entry.orderIds,
    orderRefs: entry.orderRefs,
    clientRef: entry.ref,
    offline: true,
    chargedAt: entry.createdAt,
  });
  if (status !== 'applied') {
    setState({
      notices: [
        ...state.notices,
        status === 'conflict'
          ? `El cobro de la mesa ${entry.tableNumber} se guardó, pero la mesa ya estaba cobrada. Quedó para revisión del administrador.`
          : `El cobro de la mesa ${entry.tableNumber} se guardó con un monto menor al total. Quedó para revisión del administrador.`,
      ],
    });
  }
}

// Worth retrying later on their own: no connection, server down, rate limit, session.
const isTemporary = (err: unknown) =>
  err instanceof ApiError && (err.status === 0 || err.status === 401 || err.status === 429 || err.status >= 500);

/**
 * Sends everything this user has pending, oldest first. Stops at the first temporary
 * failure (the rest would fail the same way, and order matters: a charge goes after the
 * orders it pays). Safe to call often; only one run at a time.
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

/** Only a rejected order (nothing was charged); a charge always stays until it's sent. */
export function discardRejectedOrder(ref: string) {
  const entry = state.entries.find((e) => e.ref === ref);
  if (entry?.kind === 'order' && entry.error) remove(ref);
}

export function dismissNotices() {
  setState({ notices: [] });
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
