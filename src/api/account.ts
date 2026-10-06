import { request } from './client';
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

export type Account = {
  phone: string;
  memberSince: Date | null;
  points: number;
  achievements: number;
  reservations: number;
  promoSubscribed: boolean;
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

export async function getAccount(signal?: AbortSignal): Promise<Account> {
  const data = unwrap(await request<unknown>('/app/account', { auth: true, signal }));
  const user = asObject(data.user) ?? data;
  const stats = asObject(data.stats) ?? data;
  return {
    phone: asString(pick(user, 'telefono', 'phone') ?? pick(data, 'telefono', 'phone')),
    memberSince: toDate(pick(user, 'created_at', 'member_since') ?? data.member_since),
    points: asNumber(pick(stats, 'points', 'puntos') ?? user.points),
    achievements: asNumber(pick(stats, 'achievements', 'achievements_count', 'logros')),
    reservations: asNumber(pick(stats, 'reservations', 'reservations_count', 'reservas')),
    promoSubscribed: Boolean(
      pick(data, 'promo_subscription', 'promo_subscribed') ??
        pick(user, 'promo_subscription', 'promo_subscribed'),
    ),
    recentOrders: toOrders(pick(data, 'orders', 'recent_orders') ?? []),
  };
}

export async function updatePhone(phone: string) {
  await request('/app/account/phone', { method: 'PUT', body: { telefono: phone }, auth: true });
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
  await request('/app/orders/lookup/request-otp', { method: 'POST', body: { telefono: phone } });
}

export async function verifyOrderOtp(phone: string, code: string) {
  return toOrders(
    await request<unknown>('/app/orders/lookup/verify-otp', {
      method: 'POST',
      body: { telefono: phone, codigo: code.trim() },
    }),
  );
}
