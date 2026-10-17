import { useSyncExternalStore } from 'react';

import { readCache, writeCache } from '@/utils/offline-cache';

/**
 * How often each dish is ordered from this phone, so the "Frecuentes" list in "Tomar
 * pedido" puts the restaurant's usual dishes first. Not personal data: only product ids.
 */

const DISK_KEY = 'waiter-favorites';
const MAX_TRACKED = 200;

let counts: Record<string, number> = {};
let loaded = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function loadFavorites() {
  if (loaded) return;
  loaded = true;
  readCache<Record<string, number>>(DISK_KEY).then((saved) => {
    if (!saved) return;
    counts = { ...saved.data, ...counts };
    notify();
  });
}

export function recordOrdered(productIds: number[]) {
  const next = { ...counts };
  for (const id of productIds) next[id] = (next[id] ?? 0) + 1;
  // Keep the file small: drop the least ordered dishes.
  counts = Object.fromEntries(
    Object.entries(next)
      .sort(([, a], [, b]) => b - a)
      .slice(0, MAX_TRACKED),
  );
  writeCache(DISK_KEY, counts);
  notify();
}

/** Product ids ordered at least twice, most ordered first. */
export function topDishes(limit: number): number[] {
  return Object.entries(counts)
    .filter(([, n]) => n >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([id]) => Number(id));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useFavoritesVersion() {
  return useSyncExternalStore(subscribe, () => counts);
}
