import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Last good copy of the essentials (menu, dish details, cart, profile) so the app still
 * works without internet, PWA-style. Kept deliberately small: only prioritized data is
 * saved. Files live in the app's private document directory; the auth token is never
 * stored here (it stays in SecureStore).
 */

export type Cached<T> = { data: T; savedAt: number };

// Bump when the shape of cached data changes, so old files are ignored.
const VERSION = 2;
const isWeb = Platform.OS === 'web';

function cacheDir() {
  const dir = new Directory(Paths.document, 'offline-cache');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function fileFor(key: string) {
  // Keys become file names; keep them to a safe character set.
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  return new File(cacheDir(), `${safe}.json`);
}

export async function readCache<T>(key: string): Promise<Cached<T> | null> {
  if (isWeb) return null;
  try {
    const file = fileFor(key);
    if (!file.exists) return null;
    const parsed = JSON.parse(await file.text()) as { v?: number; savedAt?: number; data?: T };
    if (parsed.v !== VERSION || typeof parsed.savedAt !== 'number' || parsed.data === undefined) return null;
    return { data: parsed.data, savedAt: parsed.savedAt };
  } catch {
    // A corrupt or unreadable file just means "no cache".
    return null;
  }
}

export function writeCache<T>(key: string, data: T) {
  if (isWeb) return;
  try {
    fileFor(key).write(JSON.stringify({ v: VERSION, savedAt: Date.now(), data }));
  } catch {
    // Caching is best effort; the app keeps working with live data.
  }
}

export function deleteCache(...keys: string[]) {
  if (isWeb) return;
  for (const key of keys) {
    try {
      const file = fileFor(key);
      if (file.exists) file.delete();
    } catch {
      // Ignore: nothing to clean up.
    }
  }
}

/** Keys holding data of the signed-in user; wiped on sign-out. */
export const USER_CACHE_KEYS = ['session-user'] as const;

// Data no longer saved this way; remove old copies.
const RETIRED_KEYS = ['promotions', 'news', 'account', 'my-orders'];

export function pruneRetiredCache() {
  if (isWeb) return;
  deleteCache(...RETIRED_KEYS);
  try {
    // Dish details used to be one file per dish; they now live in a single file.
    for (const entry of cacheDir().list()) {
      if (entry instanceof File && /^product-\d+\.json$/.test(entry.name)) entry.delete();
    }
  } catch {
    // Best effort.
  }
}
