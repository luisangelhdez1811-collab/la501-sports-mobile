import { Image } from 'expo-image';

import { deleteDataCopies } from '@/data/data-export';

/**
 * Personal data that isn't in the offline cache: copies of "Mis datos" left in the cache
 * folder and downloaded images (the profile photo among them). Wiped when the session ends,
 * so nothing personal stays on the phone (LFPDPPP, M-26). Menu photos download again.
 */
export async function forgetPersonalFiles() {
  deleteDataCopies();
  await Promise.all([Image.clearMemoryCache(), Image.clearDiskCache()]).catch(() => {});
}
