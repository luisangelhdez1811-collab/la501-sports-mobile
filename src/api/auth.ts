import { ApiError, request } from './client';
import { asHttpsUrl, asId, asNumber, asObject, asString, pick, unwrap, type Json } from './parse';
import { clearToken, saveToken } from './token-storage';

import { normalizePhone } from '@/utils/validation';

export type Role = 'cliente' | 'mesero' | 'admin';

export type User = {
  id: number | null;
  name: string;
  email: string;
  role: Role;
  points: number;
  avatar: string | null;
};

const ADMIN_ROLES = /^(super ?admin|admin|administrador|administradora|administrator|dueno|owner|gerente|manager)$/;
// Every employee uses the waiter section (tables, orders, charging).
const STAFF_ROLES = /^(mesero|mesera|meseros|waiter|waitress|empleado|empleada|employee|staff|personal|camarero|camarera|cajero|cajera)$/;

const normalizeRole = (value: unknown) =>
  asString(asObject(value)?.name ?? asObject(value)?.nombre ?? asObject(value)?.slug ?? value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/**
 * The role may come as text ("Mesero", "empleado"), an object ({ name: "admin" }), a list
 * (roles: ["mesero"]) or flags (is_admin, is_staff). Unknown values count as customer:
 * staff screens are never shown by mistake, and the server checks the role anyway.
 */
function toRole(obj: Json): Role {
  if (obj.is_admin === true || obj.is_admin === 1) return 'admin';
  const single = pick(obj, 'role', 'rol', 'tipo', 'tipo_usuario', 'user_type', 'user_role', 'perfil');
  const list = Array.isArray(obj.roles) ? obj.roles : [];
  const names = [single, ...list].map(normalizeRole).filter(Boolean);
  if (names.some((name) => ADMIN_ROLES.test(name))) return 'admin';
  if (names.some((name) => STAFF_ROLES.test(name))) return 'mesero';
  if ([obj.is_staff, obj.is_employee, obj.es_empleado].some((flag) => flag === true || flag === 1)) return 'mesero';
  return 'cliente';
}

export function toUser(raw: unknown): User | null {
  const obj = asObject(raw);
  if (!obj) return null;
  const email = asString(obj.email);
  if (!email) return null;
  return {
    id: asId(obj.id),
    name: asString(pick(obj, 'name', 'nombre'), email),
    email,
    role: toRole(obj),
    points: asNumber(pick(obj, 'points', 'puntos')),
    avatar: asHttpsUrl(obj.avatar),
  };
}

function readSession(data: unknown): { token: string; user: User | null } {
  const root = asObject(data) ?? {};
  const body: Json = unwrap(data);
  const token = asString(pick(root, 'token', 'access_token') ?? pick(body, 'token', 'access_token'));
  return { token, user: toUser(pick(root, 'user') ?? pick(body, 'user')) };
}

export async function login(email: string, password: string, { remember = true } = {}) {
  const data = await request<unknown>('/app/auth/login', {
    method: 'POST',
    body: { email: email.trim().toLowerCase(), password },
  });
  const session = readSession(data);
  // Says which part is missing, so a backend change is easy to spot.
  if (!session.token) throw new ApiError('El servidor no envió la sesión (token). Avisa al administrador.', 200);
  if (!session.user) throw new ApiError('El servidor no envió los datos del usuario. Avisa al administrador.', 200);
  try {
    await saveToken(session.token, { persist: remember });
  } catch {
    throw new ApiError('No se pudo guardar la sesión en este teléfono. Intenta de nuevo.', 0);
  }
  return session.user;
}

// Field names verified against the backend validation (422 responses).
export type RegisterInput = {
  name: string;
  email: string;
  phone: string;
  securityQuestion: string;
  securityAnswer: string;
  password: string;
  passwordConfirmation: string;
  /** Optional, never pre-checked: promotions by email (secondary purpose). */
  promoOptIn: boolean;
};

export async function register(input: RegisterInput) {
  const data = await request<unknown>('/app/auth/register', {
    method: 'POST',
    body: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      telefono: input.phone,
      pregunta_secreta: input.securityQuestion,
      respuesta_secreta: input.securityAnswer.trim(),
      password: input.password,
      password_confirmation: input.passwordConfirmation,
      // Explicit consent recorded with the account (checkboxes are never pre-checked).
      terms: true,
      acepta_aviso_privacidad: true,
      acepta_promociones: input.promoOptIn,
    },
  });
  // Some backends log the user in on registration; if a token comes back, keep it.
  const session = readSession(data);
  if (session.token && session.user) {
    await saveToken(session.token);
    return session.user;
  }
  return null;
}

export async function logout() {
  try {
    await request('/app/auth/logout', { method: 'POST', auth: true });
  } finally {
    // The local session ends even if the server can't be reached.
    await clearToken();
  }
}

export async function me(signal?: AbortSignal) {
  const data = await request<unknown>('/app/auth/me', { auth: true, signal });
  const body = unwrap(data);
  return toUser(pick(body, 'user') ?? body);
}

/** Where a password-reset code goes: the email, or the phone (by SMS). */
export type RecoveryTarget = { email: string } | { phone: string };

function recoveryId(target: RecoveryTarget) {
  return 'email' in target ? { email: target.email.trim().toLowerCase() } : { telefono: normalizePhone(target.phone) };
}

/** Always succeeds whether or not the account exists, so it can't be used to probe accounts. */
export async function forgotPassword(target: RecoveryTarget) {
  await request('/app/auth/forgot-password', {
    method: 'POST',
    body: 'email' in target ? recoveryId(target) : { ...recoveryId(target), canal: 'sms' },
  });
}

/**
 * Step 2 of 3: checks the code before asking for the new password (like the website).
 * Returns the one-time reset token, or null while the server has no separate check
 * (404): then the code itself goes with the new password, as before.
 */
export async function verifyResetCode(target: RecoveryTarget, code: string): Promise<string | null> {
  try {
    const data = await request<unknown>('/app/auth/verify-reset-code', {
      method: 'POST',
      body: { ...recoveryId(target), code: code.trim() },
    });
    const root = asObject(data) ?? {};
    return asString(pick(root, 'reset_token') ?? pick(unwrap(data), 'reset_token')) || null;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** Step 3 of 3: sets the new password; the server ends every session of the account. */
export async function resetPassword(input: {
  target: RecoveryTarget;
  /** From verifyResetCode; without it, the code is checked here. */
  resetToken: string | null;
  code: string;
  password: string;
  passwordConfirmation: string;
}) {
  await request('/app/auth/reset-password', {
    method: 'POST',
    body: {
      ...recoveryId(input.target),
      ...(input.resetToken ? { reset_token: input.resetToken } : { code: input.code.trim() }),
      password: input.password,
      password_confirmation: input.passwordConfirmation,
    },
  });
}
