import { ApiError, request } from './client';
import { asArray, asNumber, asObject, asString, pick, unwrap } from './parse';

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'ready'
  | 'delivering'
  | 'delivered'
  | 'cancelled'
  | 'unknown';

export type OrderSummary = {
  key: string;
  folio: string;
  createdAt: Date | null;
  total: number;
  status: OrderStatus;
  trackingToken: string | null;
};

/** Oposición (ARCO): secondary uses of the customer's data they can switch off. */
export type Privacy = {
  promoEmail: boolean;
  /** Off until the customer turns it on. */
  promoSms: boolean;
  /** Recommendations based on their past orders; on unless they oppose. */
  personalizedRecommendations: boolean;
};

export type Account = {
  phone: string;
  memberSince: Date | null;
  points: number;
  achievements: number;
  reservations: number;
  promoSubscribed: boolean;
  /** null: the server doesn't offer the privacy preferences yet. */
  privacy: Privacy | null;
  recentOrders: OrderSummary[];
};

const STATUSES: OrderStatus[] = ['pending', 'paid', 'ready', 'delivering', 'delivered', 'cancelled'];

export function toStatus(value: unknown): OrderStatus {
  const status = asString(value).toLowerCase();
  if (status === 'canceled') return 'cancelled';
  return STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : 'unknown';
}

function toDate(value: unknown): Date | null {
  const text = asString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Tracking tokens go into URL paths, so only safe characters are accepted.
function toTrackingToken(value: unknown): string | null {
  const token = asString(value);
  return /^[A-Za-z0-9_-]{6,128}$/.test(token) ? token : null;
}

export function toOrder(raw: unknown, index: number): OrderSummary | null {
  const obj = asObject(raw);
  if (!obj) return null;
  const id = asString(obj.id);
  const folio = asString(pick(obj, 'folio', 'number', 'id'));
  return {
    key: id || folio || String(index),
    folio: folio ? folio.replace(/^#/, '') : '—',
    createdAt: toDate(pick(obj, 'created_at', 'date', 'fecha')),
    total: asNumber(pick(obj, 'total', 'amount')),
    status: toStatus(pick(obj, 'status', 'estado')),
    trackingToken: toTrackingToken(pick(obj, 'tracking_token', 'token')),
  };
}

export function toOrders(data: unknown): OrderSummary[] {
  const list = asArray(data);
  const source = list.length > 0 ? list : asArray(unwrap(data).orders);
  return source.map(toOrder).filter((o): o is OrderSummary => o !== null);
}

// The server answers at /profile (ARCO names) and, before that update, only at /account.
const notOnServer = (err: unknown) => err instanceof ApiError && (err.status === 404 || err.status === 405);

async function profileRequest<T>(options: Parameters<typeof request>[1] = {}) {
  try {
    return await request<T>('/app/profile', options);
  } catch (err) {
    if (notOnServer(err)) return request<T>('/app/account', options);
    throw err;
  }
}

function toPrivacy(raw: unknown): Privacy | null {
  const obj = asObject(raw);
  // Without these fields it isn't the preferences (e.g. a bare `{ success: true }`).
  if (!obj || !('promos_sms' in obj) || !('recomendaciones_personalizadas' in obj)) return null;
  return {
    promoEmail: Boolean(obj.promos_correo),
    promoSms: Boolean(obj.promos_sms),
    personalizedRecommendations: obj.recomendaciones_personalizadas !== false,
  };
}

/** Acceso (ARCO): GET /profile. */
export async function getAccount(signal?: AbortSignal): Promise<Account> {
  const data = unwrap(await profileRequest<unknown>({ auth: true, signal }));
  const user = asObject(data.user) ?? data;
  const stats = asObject(data.stats) ?? data;
  const privacy = toPrivacy(data.privacy);
  return {
    phone: asString(pick(user, 'telefono', 'phone') ?? pick(data, 'telefono', 'phone')),
    memberSince: toDate(pick(user, 'created_at', 'member_since') ?? data.member_since),
    points: asNumber(pick(stats, 'points', 'puntos') ?? user.points),
    achievements: asNumber(pick(stats, 'achievements', 'achievements_count', 'logros')),
    reservations: asNumber(pick(stats, 'reservations', 'reservations_count', 'reservas')),
    promoSubscribed:
      privacy?.promoEmail ??
      Boolean(
        pick(data, 'subscribed_to_promos', 'promo_subscription', 'promo_subscribed') ??
          pick(user, 'subscribed_to_promos', 'promo_subscription', 'promo_subscribed'),
      ),
    privacy,
    recentOrders: toOrders(pick(data, 'orders', 'recent_orders') ?? []),
  };
}

/** Sends a code to the NEW number; the change is saved only once that code is confirmed. */
export async function requestPhoneOtp(phone: string) {
  await request('/app/account/phone/request-otp', {
    method: 'POST',
    auth: true,
    body: { telefono: phone, canal: 'sms' },
  });
}

// This endpoint names the code "codigo" (the others use "code").
export async function updatePhone(phone: string, code: string) {
  await request('/app/account/phone', { method: 'PUT', body: { telefono: phone, codigo: code.trim() }, auth: true });
}

// ---- Derechos ARCO ----

/**
 * Rectificación (PUT /profile): corrects name and email. `phone` must be the current one:
 * a new number goes through requestPhoneOtp + updatePhone.
 */
export async function updateProfile(input: { name: string; email: string; phone: string }) {
  await profileRequest({
    method: 'PUT',
    auth: true,
    body: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      telefono: input.phone,
    },
  });
}

/**
 * Oposición (PUT /profile/privacy): changes only the preferences sent and returns all of
 * them as the server saved them.
 */
export async function updatePrivacy(changes: Partial<Privacy>): Promise<Privacy> {
  const body: Record<string, boolean> = {};
  if (changes.promoEmail !== undefined) body.promos_correo = changes.promoEmail;
  if (changes.promoSms !== undefined) body.promos_sms = changes.promoSms;
  if (changes.personalizedRecommendations !== undefined) {
    body.recomendaciones_personalizadas = changes.personalizedRecommendations;
  }
  const saved = toPrivacy(unwrap(await request<unknown>('/app/profile/privacy', { method: 'PUT', auth: true, body })));
  if (!saved) throw new ApiError('El servidor no confirmó tus preferencias. Intenta de nuevo.', 0);
  return saved;
}

/**
 * Cancelación (DELETE /account): deletes the account and its personal data on the server. The password is
 * asked again so a borrowed, unlocked phone can't erase someone's account.
 */
export async function deleteAccount(password: string) {
  await request('/app/account', {
    method: 'DELETE',
    auth: true,
    body: { password, confirmacion: 'ELIMINAR' },
  });
}

export async function updatePassword(input: {
  current: string;
  password: string;
  passwordConfirmation: string;
}) {
  await request('/app/account/password', {
    method: 'PUT',
    auth: true,
    body: {
      current_password: input.current,
      password: input.password,
      password_confirmation: input.passwordConfirmation,
    },
  });
}

/** Returns the new subscription state when the server reports it. */
export async function togglePromoSubscription(): Promise<boolean | null> {
  const data = unwrap(
    await request<unknown>('/app/account/promo-subscription/toggle', { method: 'POST', auth: true }),
  );
  const value = pick(data, 'subscribed', 'promo_subscription', 'promo_subscribed');
  return typeof value === 'boolean' ? value : null;
}

export async function getMyOrders(signal?: AbortSignal) {
  return toOrders(await request<unknown>('/app/orders', { auth: true, signal }));
}

export async function trackOrder(token: string, signal?: AbortSignal) {
  if (!toTrackingToken(token)) throw new Error('Invalid tracking token');
  const data = unwrap(await request<unknown>(`/app/orders/track/${token}`, { signal }));
  const order = asObject(data.order) ?? data;
  return {
    status: toStatus(pick(data, 'status') ?? order.status),
    folio: asString(pick(order, 'folio', 'id')),
    total: asNumber(order.total),
  };
}

export async function requestOrderOtp(phone: string) {
  await request('/app/orders/lookup/request-otp', { method: 'POST', body: { telefono: phone, canal: 'sms' } });
}

export async function verifyOrderOtp(phone: string, code: string) {
  return toOrders(
    await request<unknown>('/app/orders/lookup/verify-otp', {
      method: 'POST',
      // The server reads "codigo" here (its notes said "code"); both are sent so either works.
      body: { telefono: phone, codigo: code.trim(), code: code.trim() },
    }),
  );
}
