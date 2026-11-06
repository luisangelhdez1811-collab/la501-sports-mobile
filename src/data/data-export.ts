import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

import type { Json } from '@/api/parse';

/**
 * The customer's copy of their data (derecho de Acceso) as a .json file they can keep in
 * Files or Drive. It lives in the app's cache only while it's shared, and every copy is
 * deleted on sign-out (M-26): it holds personal data.
 */

const PREFIX = 'mis-datos-la501-';

export async function shareDataCopy(copy: Json) {
  const json = JSON.stringify(copy, null, 2);
  if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
    await Share.share({ title: 'Mis datos — La 501 Sports', message: json });
    return;
  }
  const file = new File(Paths.cache, `${PREFIX}${new Date().toISOString().slice(0, 10)}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Guardar mi copia de datos',
    UTI: 'public.json',
  });
}

/** Removes every copy left in the cache. */
export function deleteDataCopies() {
  if (Platform.OS === 'web') return;
  try {
    for (const entry of new Directory(Paths.cache).list()) {
      if (entry instanceof File && entry.name.startsWith(PREFIX)) entry.delete();
    }
  } catch {
    // Best effort: the system also clears the cache when it needs space.
  }
}
