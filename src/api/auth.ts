import { ApiError, request } from './client';
import { asHttpsUrl, asId, asNumber, asObject, asString, pick, unwrap, type Json } from './parse';
import { clearToken, saveToken } from './token-storage';

export type Role = 'cliente' | 'mesero' | 'admin';

export type User = {
  id: number | null;
  name: string;
  email: string;
  role: Role;
  points: number;
  avatar: string | null;
};

// The role may come as "admin", "Administrador", { name: "admin" } or an is_admin flag.
function toRole(obj: Json): Role {
  if (obj.is_admin === true || obj.is_admin === 1) return 'admin';
  const raw = pick(obj, 'role', 'rol', 'tipo', 'user_type');
  const role = asString(asObject(raw)?.name ?? asObject(raw)?.nombre ?? raw).toLowerCase();
  if (role === 'admin' || role === 'administrador' || role === 'administrator') return 'admin';
  if (role === 'mesero' || role === 'waiter') return 'mesero';
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
      terms: true,
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

export async function forgotPassword(email: string) {
  await request('/app/auth/forgot-password', {
    method: 'POST',
    body: { email: email.trim().toLowerCase() },
  });
}

export async function resetPassword(input: {
  email: string;
  code: string;
  password: string;
  passwordConfirmation: string;
}) {
  await request('/app/auth/reset-password', {
    method: 'POST',
    body: {
      email: input.email.trim().toLowerCase(),
      code: input.code.trim(),
      password: input.password,
      password_confirmation: input.passwordConfirmation,
    },
  });
}
