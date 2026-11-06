import { Image } from 'expo-image';

import type { Category } from '@/types/product';
import { isBundledImage } from '@/utils/image-source';

const BATCH_SIZE = 12;
// URLs already handed to the image cache this session (the native cache skips files it
// already has, but this avoids re-queuing them on every menu refresh).
const prefetched = new Set<string>();
let running = false;

/**
 * Saves dish photos that aren't bundled in the app (e.g. dishes added after the build)
 * to the device's image cache, so they can be seen without internet. Runs in small
 * batches to avoid flooding the connection.
 */
export async function prefetchMenuImages(categories: Category[]) {
  if (running) return;
  running = true;
  try {
    const urls = [
      ...new Set(categories.flatMap((category) => category.products.map((product) => product.image))),
    ].filter((url): url is string => !!url && !prefetched.has(url) && !isBundledImage(url));

    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batch = urls.slice(i, i + BATCH_SIZE);
      const ok = await Image.prefetch(batch, 'disk').catch(() => false);
      if (ok) batch.forEach((url) => prefetched.add(url));
    }
  } finally {
    running = false;
  }
}
