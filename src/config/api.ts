/**
 * Public, non-secret configuration only. Anything shipped in the app bundle can be
 * extracted from the APK/IPA, so database credentials, APP_KEY, payment keys or any
 * other secret must stay on the Laravel server and never be added here.
 */
export const API_BASE_URL = 'https://lavender-ram-537394.hostingersite.com/api/v1';

export const API_TIMEOUT_MS = 15000;

const WEB_BASE_URL = API_BASE_URL.replace(/\/api\/v1$/, '');

/**
 * Public web pages, as a fallback when /public/info can't be reached (the server's links
 * win). `deleteAccount` is the page Google Play asks for; the web publishes it in B-17.
 */
export const WEB_URLS = {
  privacy: `${WEB_BASE_URL}/aviso-de-privacidad`,
  terms: `${WEB_BASE_URL}/terminos-y-condiciones`,
  deleteAccount: `${WEB_BASE_URL}/eliminar-cuenta`,
} as const;

/**
 * Card payments (Mercado Pago). Turned off here or from the server (`payments.card_enabled`
 * in /public/info) when the real $1 test charge fails: the checkout then only offers cash.
 */
export const CARD_PAYMENTS_ENABLED = true;

// Plain string parsing: React Native's URL doesn't implement `hostname` everywhere.
export const API_HOST = API_BASE_URL.replace(/^https:\/\//, '').split(/[/:]/)[0];

/**
 * Certificate pinning (anti-MitM): base64 SHA-256 of the Subject Public Key Info of the
 * certificates the API is allowed to present. The server's own certificate is renewed
 * every few weeks, so the pins are Let's Encrypt's intermediates and roots: a renewal
 * keeps working, a certificate from anyone else is rejected.
 *
 * Current chain (2026-10-23): *.hostingersite.com ← Let's Encrypt YE1 ← Root YE ← ISRG Root X2.
 * How to recompute and rotate them: docs/seguridad-sesion.md.
 */
export const SSL_PINS = [
  'brzvtCELCIZUo4sD/qPX0ccRtPsd3DY6RfmxpOU9oB4=', // Let's Encrypt YE1 (ECDSA, in use)
  's/tdAOmUzd8syaTuqfgGvFcn6DzA5Cmb+Vby1ST+U3Y=', // Let's Encrypt YE2 (ECDSA)
  'ppiiCCS+BOR6GjPE+kiHMb6SAR8jox6QDiyibJwqz84=', // Let's Encrypt YE3 (ECDSA, backup)
  'LoMHBotttiDko50Gi13uXW71eIy7LAttI+rYT8wXF4w=', // Let's Encrypt YR1 (RSA)
  'nWN7PSep5XDQdge5zK24CnCRXHr3KvzhKEGxsdqCX9E=', // Let's Encrypt YR2 (RSA)
  'UaqofZhLVZrGnpKfiIoCLYMuCJ/026CkErUQG8pLx5k=', // Let's Encrypt YR3 (RSA, backup)
  'sCkq5UWXjg+7mKu9lMhhYF5bGLsy7VI/UNW3tccdR7w=', // Root YE
  'fk6IOKit1ild5647BH06ujSIq5XbCgqlbYl6ANhhi88=', // Root YR
  'diGVwiVYbubAI3RW4hB9xU8e/CH2GnkuvVFZE8zmgzI=', // ISRG Root X2
  'C5+lpZ7tcVwmwQIMcRtPbsQtWLABXhQzejna0wHFr8M=', // ISRG Root X1
];

/**
 * After this date the app stops enforcing the pins instead of locking out users who never
 * updated it (YE1 expires 2028-09-02). Ship new pins before then.
 */
export const SSL_PINS_EXPIRATION = '2028-08-01';
