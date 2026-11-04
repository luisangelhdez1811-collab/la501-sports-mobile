import { CARD_PAYMENTS_ENABLED, WEB_URLS } from '@/config/api';
import { DEFAULT_HOURS, parseWeekHours, type WeekHours } from '@/utils/opening-hours';

import { request } from './client';
import { asHttpsUrl, asObject, asString, unwrap } from './parse';

export type RestaurantInfo = {
  hours: WeekHours;
  /** e.g. "Plaza de la Revolución Mexicana #16, Col. Centro, C.P. 43000, Huejutla de Reyes, Hgo." */
  address: string;
  /** Google Maps search text for the restaurant (from the website's map link). */
  mapQuery: string;
  /** Digits only, with country code (e.g. "527711234567"), or null if not set. */
  whatsapp: string | null;
};

// Fallback only (offline, older server): the real address comes from /public/info.
export const DEFAULT_ADDRESS = 'Plaza de la Revolución Mexicana #16, Col. Centro, C.P. 43000, Huejutla de Reyes, Hgo.';
export const DEFAULT_MAP_QUERY = 'La 501 Centro, Huejutla de Reyes, Hidalgo';

// Only the place name is taken from the link (?q=…); the app builds its own map URLs.
function mapQueryFrom(url: string) {
  const match = url.match(/[?&]q=([^&]+)/);
  if (!match) return '';
  try {
    return decodeURIComponent(match[1].replace(/\+/g, ' ')).slice(0, 120);
  } catch {
    return '';
  }
}

/** Public restaurant info (opening hours, contact). */
export async function getRestaurantInfo(signal?: AbortSignal): Promise<RestaurantInfo> {
  const body = unwrap(await request<unknown>('/public/info', { signal }));
  const schedule = asObject(body.schedule);
  const contact = asObject(body.contact) ?? {};
  const digits = asString(contact.whatsapp).replace(/\D/g, '');
  return {
    hours: schedule ? parseWeekHours(schedule) : DEFAULT_HOURS,
    address: asString(body.address) || DEFAULT_ADDRESS,
    mapQuery: mapQueryFrom(asString(body.map_url)) || DEFAULT_MAP_QUERY,
    // Mexican numbers are stored with 10 digits; wa.me needs the 52 country code.
    whatsapp: digits.length === 10 ? `52${digits}` : digits.length >= 12 ? digits : null,
  };
}

/** How delivery is charged and where the legal pages are, as the server says (M-05, M-12). */
export type CheckoutPolicy = {
  /** Shown under the total; the customer accepts it before ordering. */
  feeNote: string;
  /** Today always false: the delivery person charges the fee on delivery. */
  feeIncludedInTotal: boolean;
  privacyUrl: string;
  termsUrl: string;
  deleteAccountUrl: string;
  /** Off when card payments are paused (e.g. the real test charge failed). */
  cardPayments: boolean;
};

// Same wording as the server's default, for when it can't be reached.
export const DEFAULT_FEE_NOTE =
  'El costo del envío no está incluido en este total: lo cobra el repartidor al entregar tu pedido. ' +
  'Si quieres saber cuánto es antes de pedir, pregúntalo al restaurante.';

export const DEFAULT_POLICY: CheckoutPolicy = {
  feeNote: DEFAULT_FEE_NOTE,
  feeIncludedInTotal: false,
  privacyUrl: WEB_URLS.privacy,
  termsUrl: WEB_URLS.terms,
  deleteAccountUrl: WEB_URLS.deleteAccount,
  cardPayments: CARD_PAYMENTS_ENABLED,
};

/** Reads the delivery and legal parts of /public/info; offline, the defaults above. */
export async function getCheckoutPolicy(signal?: AbortSignal): Promise<CheckoutPolicy> {
  const body = unwrap(await request<unknown>('/public/info', { signal }));
  const delivery = asObject(body.delivery) ?? {};
  const legal = asObject(body.legal) ?? {};
  const payments = asObject(body.payments) ?? {};
  return {
    feeNote: asString(delivery.fee_note) || DEFAULT_FEE_NOTE,
    feeIncludedInTotal: delivery.fee_included_in_total === true,
    privacyUrl: asHttpsUrl(legal.privacy_url) ?? WEB_URLS.privacy,
    termsUrl: asHttpsUrl(legal.terms_url) ?? WEB_URLS.terms,
    deleteAccountUrl: asHttpsUrl(legal.delete_account_url) ?? WEB_URLS.deleteAccount,
    // Either side can pause card payments; both must allow them.
    cardPayments: CARD_PAYMENTS_ENABLED && payments.card_enabled !== false,
  };
}
