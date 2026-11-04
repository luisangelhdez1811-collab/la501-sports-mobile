import type { OrderStatus } from '@/api/account';
import { deleteCache, readCache, writeCache } from '@/data/offline-cache';

/**
 * Home-delivery orders the app keeps an eye on to tell the customer when they leave the
 * kitchen. Only the tracking token and the last step announced are kept, for two days at
 * most, and the list is wiped on sign-out (M-26).
 */

export type FollowedOrder = { token: string; announced: OrderStatus | null; since: number };

const KEY = 'followed-orders';
const MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000;
const MAX_ORDERS = 5;

let orders: FollowedOrder[] | null = null;

async function load(): Promise<FollowedOrder[]> {
  if (orders) return orders;
  const saved = await readCache<FollowedOrder[]>(KEY);
  const now = Date.now();
  orders = (Array.isArray(saved?.data) ? saved.data : []).filter((o) => now - o.since < MAX_AGE_MS);
  return orders;
}

function save(next: FollowedOrder[]) {
  orders = next;
  writeCache(KEY, next);
}

export async function followedOrders() {
  return [...(await load())];
}

export async function followOrder(token: string) {
  const current = await load();
  if (current.some((o) => o.token === token)) return;
  save([...current, { token, announced: null, since: Date.now() }].slice(-MAX_ORDERS));
}

export async function markAnnounced(token: string, announced: OrderStatus) {
  save((await load()).map((o) => (o.token === token ? { ...o, announced } : o)));
}

/** Delivered or cancelled: nothing else to tell. */
export async function unfollowOrder(token: string) {
  save((await load()).filter((o) => o.token !== token));
}

export function forgetFollowedOrders() {
  orders = [];
  deleteCache(KEY);
}
