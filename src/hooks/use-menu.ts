import { useEffect, useState } from 'react';

import { getMenu, type MenuResult } from '@/api/catalog';
import { errorMessage } from '@/api/client';
import { prefetchMenuImages } from '@/data/menu-images';
import { SNAPSHOT_AT, snapshotMenu } from '@/data/menu-snapshot';
import { syncDetails } from '@/data/product-details';
import { useOnReconnect } from '@/hooks/use-connectivity';
import type { Category } from '@/types/product';
import { readCache, writeCache } from '@/utils/offline-cache';

const CACHE_MS = 10 * 60 * 1000;
// A full menu load costs ~18 of the API's 60 requests/min, so quick repeated
// pull-to-refresh gestures reuse the data that just arrived.
const MIN_REFRESH_MS = 30 * 1000;
const DISK_KEY = 'menu';

// Sources, newest first: live server data → in-memory copy shared by Menú and "Arma tu
// pedido" → copy saved on the device → menu bundled in the app (first launch offline).
let cache: { categories: Category[]; missing: string[]; at: number } | null = null;
// One network load at a time: every screen using the menu shares it (e.g. all of them
// reloading together when the connection comes back).
let inflight: Promise<MenuResult> | null = null;

function freshCache() {
  return cache && Date.now() - cache.at < CACHE_MS ? cache : null;
}

function recentlyLoaded() {
  return !!cache && cache.missing.length === 0 && Date.now() - cache.at < MIN_REFRESH_MS;
}

function loadMenu(previous: Category[]) {
  inflight ??= getMenu(undefined, previous).finally(() => {
    inflight = null;
  });
  return inflight;
}

// Everything needed to browse the menu offline: every photo and every dish's
// ingredients. Both run in the background and resume on the next successful load.
function saveForOffline(categories: Category[]) {
  prefetchMenuImages(categories);
  const ids = categories.flatMap((c) => c.products.map((p) => p.id)).filter((id): id is number => id !== null);
  syncDetails(ids);
}

type MenuState = {
  categories: Category[];
  /** Categories that failed to load; shown as a retry banner, never silently hidden. */
  missing: string[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  /** The menu on screen is the saved copy because the server couldn't be reached. */
  stale: boolean;
};

export function useMenu() {
  const [state, setState] = useState<MenuState>(() => {
    // Something to show from the very first frame: the shared copy or the bundled menu.
    const categories = freshCache()?.categories ?? cache?.categories ?? snapshotMenu();
    return {
      categories,
      missing: freshCache()?.missing ?? [],
      loading: categories.length === 0,
      refreshing: false,
      error: null,
      stale: false,
    };
  });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // The first mount can reuse a fresh in-memory copy; explicit reloads hit the server.
    if (reloadKey === 0 && freshCache()) return;
    let active = true;

    (async () => {
      // A copy saved on the device replaces the bundled one if it's newer.
      const disk = cache ? null : await readCache<Category[]>(DISK_KEY);
      const saved = disk && disk.savedAt > SNAPSHOT_AT ? disk : null;
      if (!active) return;
      if (saved && !cache) setState((s) => ({ ...s, categories: saved.data, loading: false }));
      // Fallback for any category that fails to load, and for offline.
      const previous = cache?.categories ?? saved?.data ?? snapshotMenu();

      try {
        const { categories, missing } = await loadMenu(previous);
        cache = { categories, missing, at: Date.now() };
        if (missing.length === 0) writeCache(DISK_KEY, categories);
        saveForOffline(categories);
        if (active) {
          setState({ categories, missing, loading: false, refreshing: false, error: null, stale: false });
        }
      } catch (err) {
        if (!active) return;
        const fallback = previous.length ? previous : null;
        setState((s) => ({
          ...s,
          categories: fallback ?? s.categories,
          loading: false,
          refreshing: false,
          // With a saved menu the customer still sees everything; only say "Sin conexión".
          error: fallback ? null : errorMessage(err),
          stale: !!fallback,
        }));
      }
    })();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const reload = () => {
    setState((s) => ({ ...s, loading: s.categories.length === 0, error: null }));
    setReloadKey((k) => k + 1);
  };

  // Back online: refresh automatically if what's on screen is old or incomplete.
  useOnReconnect(() => {
    if (state.stale || state.error || state.missing.length > 0) reload();
  });

  const refresh = () => {
    if (recentlyLoaded()) return;
    setState((s) => ({ ...s, refreshing: true }));
    setReloadKey((k) => k + 1);
  };

  return { ...state, reload, refresh };
}
