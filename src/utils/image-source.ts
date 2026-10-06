import type { ImageSource } from 'expo-image';

import { SNAPSHOT_IMAGES } from '@/data/menu-snapshot-images';

/**
 * Image source for a dish photo: the copy bundled in the app when there is one (works
 * offline from the first launch), otherwise the remote URL (cached after first view).
 */
export function menuImage(url: string | null): ImageSource | number | null {
  if (!url) return null;
  return SNAPSHOT_IMAGES[url] ?? { uri: url };
}

/** Whether a photo already ships inside the app (no need to download it). */
export function isBundledImage(url: string) {
  return url in SNAPSHOT_IMAGES;
}
