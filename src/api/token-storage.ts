import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'la501_token';

// Stored in the iOS Keychain / Android Keystore-encrypted storage (never AsyncStorage,
// which is plain text), readable only while the device is unlocked and never migrated
// to backups or other devices.
const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// SecureStore has no web implementation; on web the token lives only in memory so it
// is never written to localStorage where any injected script could read it.
const isWeb = Platform.OS === 'web';
let cachedToken: string | null | undefined;

export async function getToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  cachedToken = isWeb ? null : await SecureStore.getItemAsync(TOKEN_KEY, secureOptions);
  return cachedToken;
}

/**
 * `persist: false` ("Mantener sesión iniciada" unchecked) keeps the token in memory
 * only, so the session ends when the app is closed.
 */
export async function saveToken(token: string, { persist = true } = {}): Promise<void> {
  cachedToken = token;
  if (isWeb) return;
  if (persist) await SecureStore.setItemAsync(TOKEN_KEY, token, secureOptions);
  else await SecureStore.deleteItemAsync(TOKEN_KEY, secureOptions);
}

export async function clearToken(): Promise<void> {
  cachedToken = null;
  if (!isWeb) await SecureStore.deleteItemAsync(TOKEN_KEY, secureOptions);
}

export async function hasToken(): Promise<boolean> {
  return !!(await getToken());
}
