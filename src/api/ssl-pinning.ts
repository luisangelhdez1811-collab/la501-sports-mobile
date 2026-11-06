import { Platform } from 'react-native';
import {
  addSslPinningErrorListener,
  initializeSslPinning,
  isSslPinningAvailable,
} from 'react-native-ssl-public-key-pinning';

import { API_HOST, SSL_PINS, SSL_PINS_EXPIRATION } from '@/config/api';

/**
 * Certificate pinning for every API request (OkHttp CertificatePinner on Android,
 * TrustKit on iOS): a connection whose certificate chain doesn't contain one of
 * SSL_PINS is refused, even if the phone trusts that certificate (anti-MitM).
 */

let ready: Promise<void> | null = null;
let violationAt = 0;

/**
 * Enables pinning once, before the first request. Without the native module (Expo Go,
 * the web or the tests) requests go unpinned only while developing; a release build
 * that can't pin refuses to talk to the server.
 */
export function ensureSslPinning(): Promise<void> {
  ready ??= (async () => {
    // Browsers manage TLS themselves: pinning isn't possible on the web.
    if (Platform.OS === 'web') return;
    if (!isSslPinningAvailable()) {
      if (__DEV__) return;
      throw new Error('SSL pinning is not available in this build');
    }
    await initializeSslPinning({
      [API_HOST]: { includeSubdomains: false, publicKeyHashes: SSL_PINS, expirationDate: SSL_PINS_EXPIRATION },
    });
    addSslPinningErrorListener(() => {
      violationAt = Date.now();
    });
  })();
  return ready;
}

/** The last connection was refused because the certificate didn't match the pins. */
export function recentPinningViolation() {
  return Date.now() - violationAt < 5000;
}
