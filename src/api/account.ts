import { optionsSummary, type TicketOption } from '@/domain/order-ticket';

import { ApiError, request } from './client';
import { asArray, asHttpsUrl, asNumber, asObject, asString, pick, unwrap, type Json } from './parse';

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'preparing'
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

/**
 * Oposición (ARCO): secondary uses of the customer's data they can switch off. There is no
 * SMS preference: the restaurant doesn't send promotions by SMS (M-24, B-33).
 */
export type Privacy = {
  promoEmail: boolean;
  /** Recommendations based on their past orders; on unless they oppose. */
  personalizedRecommendations: boolean;
};

export type Account = {
  phone: string;
  /** Profile photo (the same as on the website); https only. */
  avatar: string | null;
  memberSince: Date | null;
  points: number;
  achievements: number;
  reservations: number;
  promoSubscribed: boolean;
  /** null: the server doesn't offer the privacy preferences yet. */
  privacy: Privacy | null;
  recentOrders: OrderSummary[];
  /** The Aviso or the Terms changed since the customer accepted them (M-22). */
  legalUpdateRequired: boolean;
};

const STATUSES: OrderStatus[] = ['pending', 'paid', 'failed', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'];

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
  if (!obj || !('recomendaciones_personalizadas' in obj)) return null;
  return {
    promoEmail: Boolean(obj.promos_correo),
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
    avatar: asHttpsUrl(pick(user, 'avatar', 'avatar_url', 'foto')),
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
    legalUpdateRequired: (pick(data, 'legal_update_required') ?? user.legal_update_required) === true,
  };
}

/**
 * Records that the customer accepted the current Terms and Aviso (Código de Comercio: proof
 * of which version each person accepted). The versions come from /public/info.
 */
export async function acceptLegal(versions: { termsVersion: string; privacyVersion: string }) {
  await request('/app/account/accept-legal', {
    method: 'POST',
    auth: true,
    body: { terms_version: versions.termsVersion, privacy_version: versions.privacyVersion },
  });
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

/** cancelled: whether the card payment was returned automatically or will be by hand. */
export type RefundStatus = 'refunded' | 'manual' | null;

/** One line of the ticket, as the kitchen got it. */
export type TicketLine = {
  name: string;
  quantity: number;
  subtotal: number;
  /** "Salsa: BBQ · Término: Medio"; '' without options. */
  options: string;
  excluded: string[];
  notes: string;
};

/** Who ordered and where it goes; '' when the server doesn't send it. */
export type TicketCustomer = { name: string; phone: string; address: string };

export type Tracking = {
  status: OrderStatus;
  /** The server's text for the status ("Confirmado", never "Pagado"); '' if it doesn't send one. */
  statusLabel: string;
  folio: string;
  total: number;
  /** null: older servers don't say it. */
  paymentMethod: 'efectivo' | 'tarjeta' | null;
  /** The kitchen hasn't started: the customer can still cancel. */
  canCancel: boolean;
  refundStatus: RefundStatus;
  isDelivery: boolean;
  createdAt: Date | null;
  lines: TicketLine[];
  customer: TicketCustomer;
};

const toOption = (raw: unknown): TicketOption | null => {
  const obj = asObject(raw);
  const name = obj ? asString(obj.name) : '';
  return obj && name ? { group: asString(obj.group), name, quantity: asNumber(obj.quantity) || 1 } : null;
};

function toTicketLine(raw: unknown): TicketLine | null {
  const obj = asObject(raw);
  if (!obj) return null;
  const name = asString(pick(obj, 'product_name', 'name'));
  if (!name) return null;
  const quantity = asNumber(obj.quantity) || 1;
  return {
    name,
    quantity,
    subtotal: asNumber(obj.subtotal) || asNumber(obj.price) * quantity,
    options: optionsSummary(asArray(obj.options).map(toOption).filter((o): o is TicketOption => o !== null)),
    excluded: asArray(obj.excluded_ingredients).map((item) => asString(item)).filter(Boolean),
    notes: asString(obj.notes),
  };
}

function toTracking(raw: unknown): Tracking {
  const data = unwrap(raw);
  const order = asObject(data.order) ?? data;
  const field = (key: string) => pick(data, key) ?? pick(order, key);
  const method = asString(field('payment_method')).toLowerCase();
  const refund = asString(field('refund_status')).toLowerCase();
  return {
    status: toStatus(field('status')),
    statusLabel: asString(field('status_label')).slice(0, 40),
    folio: asString(pick(order, 'folio', 'id')),
    total: asNumber(order.total),
    paymentMethod: method.startsWith('tarjeta') ? 'tarjeta' : method.startsWith('efectivo') ? 'efectivo' : null,
    canCancel: field('can_cancel') === true,
    refundStatus: refund === 'refunded' || refund === 'manual' ? refund : null,
    // The app only takes home-delivery orders: assumed when the server doesn't say.
    isDelivery: field('es_a_domicilio') !== false,
    createdAt: toDate(field('created_at')),
    lines: asArray(field('items'))
      .map(toTicketLine)
      .filter((line): line is TicketLine => line !== null),
    customer: {
      name: asString(field('customer_name')),
      phone: asString(field('customer_phone')),
      address: asString(field('customer_address')),
    },
  };
}

export async function trackOrder(token: string, signal?: AbortSignal): Promise<Tracking> {
  if (!toTrackingToken(token)) throw new Error('Invalid tracking token');
  return toTracking(await request<unknown>(`/app/orders/track/${token}`, { signal }));
}

export type CancelResult = { status: OrderStatus; refundStatus: RefundStatus; message: string };

/**
 * The customer cancels before the kitchen starts; a card payment is returned. The answer
 * only says the new status, the refund and a message, not the whole order.
 */
export async function cancelOrder(token: string, reason = ''): Promise<CancelResult> {
  if (!toTrackingToken(token)) throw new Error('Invalid tracking token');
  const data = unwrap(
    await request<unknown>(`/app/orders/track/${token}/cancel`, {
      method: 'POST',
      body: reason.trim() ? { reason: reason.trim().slice(0, 200) } : {},
    }),
  );
  const refund = asString(data.refund_status).toLowerCase();
  return {
    status: toStatus(data.status),
    refundStatus: refund === 'refunded' || refund === 'manual' ? refund : null,
    message: asString(data.message).slice(0, 300),
  };
}

/**
 * Acceso (ARCO): the COMPLETE copy of the customer's data, as the server keeps it. The app
 * never builds it from what it has on screen: only the server has everything.
 */
export async function exportMyData(signal?: AbortSignal): Promise<Json> {
  const data = unwrap(await request<unknown>('/app/account/export', { auth: true, signal }));
  if (!asObject(data.titular)) {
    throw new ApiError('No se pudo generar tu copia de datos. Intenta de nuevo más tarde.', 0);
  }
  return data;
}

const AVATAR_TYPES = /^image\/(jpeg|png|webp)$/;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/** Changes the profile photo (the same one as on the website). Returns the new URL. */
export async function uploadAvatar(file: { uri: string; mimeType?: string | null }): Promise<string | null> {
  const type = file.mimeType && AVATAR_TYPES.test(file.mimeType) ? file.mimeType : 'image/jpeg';
  const extension = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  const form = new FormData();
  // React Native uploads the file from its uri in this shape.
  form.append('avatar', { uri: file.uri, name: `perfil.${extension}`, type } as unknown as Blob);
  const data = unwrap(await request<unknown>('/app/account/avatar', { method: 'POST', auth: true, body: form }));
  return asHttpsUrl(data.avatar);
}

export async function deleteAvatar() {
  await request('/app/account/avatar', { method: 'DELETE', auth: true });
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
