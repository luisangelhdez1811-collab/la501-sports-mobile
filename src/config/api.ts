/**
 * Public, non-secret configuration only. Anything shipped in the app bundle can be
 * extracted from the APK/IPA, so database credentials, APP_KEY, payment keys or any
 * other secret must stay on the Laravel server and never be added here.
 */
export const API_BASE_URL = 'https://lavender-ram-537394.hostingersite.com/api/v1';

export const API_TIMEOUT_MS = 15000;
