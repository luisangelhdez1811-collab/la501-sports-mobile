import { useSyncExternalStore } from 'react';

import { getProductDetail, type ProductDetail } from '@/api/catalog';
import { ApiError } from '@/api/client';
import { SNAPSHOT_AT, snapshotDetails } from '@/data/menu-snapshot';
import { readCache, writeCache } from '@/utils/offline-cache';

/**
 * Ingredients + subcategory of every dish, so the dish card, the "ingredientes a incluir"
 * checklist and the subcategory cards work without internet.
 *
 * Starts from the copy bundled in the app (all dishes at build time). Newer copies saved
 * on the device replace it, and a slow background sync only fetches what's missing or
 * old: the API exposes this per dish and allows 60 requests/min.
 */

type Entry = ProductDetail & { at: number };

const DISK_KEY = 'product-details';
// Ingredients rarely change; refresh each dish about once a week.
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
// ~30 requests/min: leaves room under the 60/min limit for everything else the app does.
const SYNC_INTERVAL_MS = 2000;
const PERSIST_DELAY_MS = 3000;

// Seeded synchronously with the bundled details, so they're available on first render.
const store = new Map<number, Entry>(
  [...snapshotDetails()].map(([id, detail]) => [id, { ...detail, at: SNAPSHOT_AT }]),
);
const listeners = new Set<() => void>();
let version = 0;
let loading: Promise<void> | null = null;
let syncing = false;
let persistTimer: ReturnType<typeof setTimeout> | undefined;

function notify() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function persistSoon() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => writeCache(DISK_KEY, Object.fromEntries(store)), PERSIST_DELAY_MS);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Loads the saved details from disk once per app session. */
export function loadDetails() {
  loading ??= readCache<Record<string, Entry>>(DISK_KEY).then((saved) => {
    if (!saved) return;
    for (const [id, entry] of Object.entries(saved.data)) {
      // Keep whichever copy is newer: the one saved on the device or the bundled one.
      const current = store.get(Number(id));
      if (!current || entry.at > current.at) store.set(Number(id), entry);
    }
    notify();
  });
  return loading;
}

export function getCachedDetail(id: number | null): ProductDetail | null {
  return id === null ? null : (store.get(id) ?? null);
}

export function saveDetail(id: number, detail: ProductDetail) {
  store.set(id, { ...detail, at: Date.now() });
  notify();
  persistSoon();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Re-renders the caller whenever more dish details become available. */
export function useDetailsVersion() {
  return useSyncExternalStore(subscribe, () => version);
}

/**
 * Background sync of every dish's details. Safe to call repeatedly: only one runs at a
 * time and dishes saved recently are skipped. Stops when offline (the next menu load,
 * e.g. after reconnecting, starts it again) and waits out rate limits.
 */
export async function syncDetails(ids: number[]) {
  if (syncing) return;
  syncing = true;
  try {
    await loadDetails();
    const now = Date.now();
    const pending = ids.filter((id) => {
      const entry = store.get(id);
      return !entry || now - entry.at > TTL_MS;
    });

    for (const id of pending) {
      try {
        saveDetail(id, await getProductDetail(id));
      } catch (err) {
        if (err instanceof ApiError && err.status === 0) break; // offline
        if (err instanceof ApiError && err.status === 429) {
          await wait((err.retryAfter ?? 60) * 1000);
          continue; // this dish is retried on the next sync
        }
        // Dish removed (404): remember it has no details, so it doesn't block its
        // category's subcategory cards. Other errors (5xx) are retried on the next sync.
        if (err instanceof ApiError && err.status === 404) {
          saveDetail(id, { ingredients: [], subcategory: '' });
        }
      }
      await wait(SYNC_INTERVAL_MS);
    }
  } finally {
    syncing = false;
    clearTimeout(persistTimer);
    writeCache(DISK_KEY, Object.fromEntries(store));
  }
}
