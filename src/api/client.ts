import { API_BASE_URL, API_TIMEOUT_MS } from '@/config/api';

import { clearToken, getToken } from './token-storage';

if (!API_BASE_URL.startsWith('https://')) {
  // Tokens and customer data must never travel over plain HTTP.
  throw new Error('API_BASE_URL must use HTTPS');
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

type RequestOptions = {
  method?: Method;
  body?: unknown;
  /** Send the bearer token if one is stored (guests still work without it). */
  auth?: boolean;
  signal?: AbortSignal;
};

export class ApiError extends Error {
  readonly status: number;
  /** Seconds the server asked us to wait (429 Too Many Requests). */
  readonly retryAfter: number | null;

  constructor(message: string, status: number, retryAfter: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

const GENERIC_ERROR = 'Ocurrió un problema. Intenta de nuevo en unos momentos.';
const NETWORK_ERROR = 'No hay conexión con el servidor. Revisa tu internet.';

type SessionListener = () => void;
const sessionExpiredListeners = new Set<SessionListener>();

/** Notified when the server rejects the stored token (401), so the UI can go to login. */
export function onSessionExpired(listener: SessionListener) {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

// Only relative API paths are accepted, so the bearer token can never be sent to
// another host through a crafted or absolute URL.
function assertSafePath(path: string) {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('..') || path.includes('://')) {
    throw new Error('Invalid API path');
  }
}

// Server messages are only shown for client errors (validation, wrong password...).
// 5xx responses may contain stack traces or SQL details, so they are never surfaced.
function userMessage(status: number, data: unknown, retryAfter: number | null): string {
  // Laravel's throttle message is in English; always explain it in Spanish.
  if (status === 429) {
    return retryAfter
      ? `Hay muchas solicitudes en este momento. Intenta de nuevo en ${retryAfter} segundos.`
      : 'Hay muchas solicitudes en este momento. Espera un momento e intenta de nuevo.';
  }
  if (status >= 400 && status < 500 && data && typeof data === 'object') {
    const { message, error } = data as { message?: unknown; error?: unknown };
    const text = typeof message === 'string' ? message : typeof error === 'string' ? error : null;
    if (text && text.length <= 200) return text;
  }
  if (status === 401) return 'Tu sesión expiró. Inicia sesión de nuevo.';
  // The code helps the restaurant's developers find the failure in the server logs.
  if (status >= 500) return `El servidor tuvo un error (código ${status}). Intenta de nuevo más tarde.`;
  return GENERIC_ERROR;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false, signal } = options;
  assertSafePath(path);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener('abort', abortFromCaller);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      credentials: 'omit',
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError(NETWORK_ERROR, 0);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data: unknown = isJson ? await res.json().catch(() => null) : null;

  if (res.status === 401 && auth) {
    await clearToken();
    sessionExpiredListeners.forEach((listener) => listener());
  }

  if (!res.ok) {
    const parsed = Number.parseInt(res.headers.get('retry-after') ?? '', 10);
    const retryAfter = Number.isFinite(parsed) ? parsed : null;
    throw new ApiError(userMessage(res.status, data, retryAfter), res.status, retryAfter);
  }

  return data as T;
}

/** User-facing text for any error thrown by the API layer. */
export function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : GENERIC_ERROR;
}
