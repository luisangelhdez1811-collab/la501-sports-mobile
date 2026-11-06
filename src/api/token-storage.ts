import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { asObject, asString, pick, unwrap } from './parse';

const TOKEN_KEY = 'la501_token';
const REFRESH_KEY = 'la501_refresh_token';

// Stored in the iOS Keychain / Android Keystore-encrypted storage (never AsyncStorage,
// which is plain text), readable only while the device is unlocked and never migrated
// to backups or other devices.
const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// SecureStore has no web implementation; on web the tokens live only in memory so they
// are never written to localStorage where any injected script could read them.
const isWeb = Platform.OS === 'web';

// Singleton: one copy of the session for the whole app (HTTP client, sign-in, sign-out).
let cachedToken: string | null | undefined;
let cachedRefresh: string | null | undefined;
// Whether this session is kept on the device ("Mantener sesión iniciada").
let persisted = true;

/** JWT access token (short-lived) sent as "Authorization: Bearer". */
export async function getToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  cachedToken = isWeb ? null : await SecureStore.getItemAsync(TOKEN_KEY, secureOptions);
  return cachedToken;
}

/** One-use token that buys a new access token when the current one expires. */
export async function getRefreshToken(): Promise<string | null> {
  if (cachedRefresh !== undefined) return cachedRefresh;
  cachedRefresh = isWeb ? null : await SecureStore.getItemAsync(REFRESH_KEY, secureOptions);
  return cachedRefresh;
}

export type SessionTokens = { accessToken: string; refreshToken: string | null };

/**
 * `persist: false` ("Mantener sesión iniciada" unchecked) keeps the tokens in memory
 * only, so the session ends when the app is closed.
 */
export async function saveSession(tokens: SessionTokens, { persist = true } = {}): Promise<void> {
  cachedToken = tokens.accessToken;
  cachedRefresh = tokens.refreshToken;
  persisted = persist;
  if (isWeb) return;
  if (persist) {
    await SecureStore.setItemAsync(TOKEN_KEY, tokens.accessToken, secureOptions);
    if (tokens.refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken, secureOptions);
    else await SecureStore.deleteItemAsync(REFRESH_KEY, secureOptions);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY, secureOptions);
    await SecureStore.deleteItemAsync(REFRESH_KEY, secureOptions);
  }
}

/** A session without a refresh token (servers before JWT). */
export function saveToken(token: string, options: { persist?: boolean } = {}) {
  return saveSession({ accessToken: token, refreshToken: null }, options);
}

/** After a refresh: the new pair is kept the same way as the session it replaces. */
export function replaceSession(tokens: SessionTokens) {
  return saveSession(tokens, { persist: persisted });
}

/** Keeps the current in-memory session on the device (the waiter's session always is). */
export async function persistSession(): Promise<void> {
  const accessToken = await getToken();
  if (accessToken) await saveSession({ accessToken, refreshToken: (await getRefreshToken()) ?? null });
}

export async function clearToken(): Promise<void> {
  cachedToken = null;
  cachedRefresh = null;
  if (isWeb) return;
  await SecureStore.deleteItemAsync(TOKEN_KEY, secureOptions);
  await SecureStore.deleteItemAsync(REFRESH_KEY, secureOptions);
}

export async function hasToken(): Promise<boolean> {
  return !!(await getToken());
}

/**
 * Tokens from a sign-in, sign-up or refresh response: `access_token` + `refresh_token`
 * (JWT) or just `token` (Sanctum, before the JWT update).
 */
export function readTokens(data: unknown): SessionTokens {
  const root = asObject(data) ?? {};
  const body = unwrap(data);
  const value = (...keys: string[]) => asString(pick(root, ...keys) ?? pick(body, ...keys));
  return { accessToken: value('access_token', 'token'), refreshToken: value('refresh_token') || null };
}
