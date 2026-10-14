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
  /** Machine-readable reason from the server, e.g. "phone_taken" or "invalid_or_expired_code". */
  readonly code: string | null;

  constructor(message: string, status: number, retryAfter: number | null = null, code: string | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfter = retryAfter;
    this.code = code;
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

/** "45 segundos" / "8 minutos". */
export function formatWait(seconds: number) {
  if (seconds < 60) return `${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
}

// Verification-code errors get fixed wording, the same on every screen.
function codeMessage(code: string | null, retryAfter: number | null): string | null {
  if (code === 'too_many_attempts') {
    return retryAfter
      ? `Ya pediste varios códigos. Podrás pedir otro en ${formatWait(retryAfter)}.`
      : 'Ya pediste varios códigos. Espera unos minutos para pedir otro.';
  }
  if (code === 'invalid_or_expired_code') return 'El código no es correcto o ya caducó. Revísalo o pide uno nuevo.';
  if (code === 'phone_taken') return 'Ese teléfono ya está registrado en otra cuenta.';
  if (code === 'phone_change_requires_otp') return 'Para cambiar tu teléfono usa la opción "Cambiar teléfono".';
  if (code === 'sms_unavailable') {
    return 'No pudimos enviar el SMS en este momento. Intenta de nuevo en unos minutos.';
  }
  return null;
}

// Server messages are only shown for client errors (validation, wrong password...).
// 5xx responses may contain stack traces or SQL details, so they are never surfaced.
function userMessage(status: number, data: unknown, retryAfter: number | null, code: string | null): string {
  const verification = codeMessage(code, retryAfter);
  if (verification) return verification;
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
    const reason = (data as { error?: unknown } | null)?.error;
    // A short snake_case token is a reason code; longer text is a message.
    const code = typeof reason === 'string' && /^[a-z_]{3,40}$/.test(reason) ? reason : null;
    throw new ApiError(userMessage(res.status, data, retryAfter, code), res.status, retryAfter, code);
  }

  return data as T;
}

/** User-facing text for any error thrown by the API layer. */
export function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : GENERIC_ERROR;
}
