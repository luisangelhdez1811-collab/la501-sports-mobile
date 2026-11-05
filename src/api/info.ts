import { CARD_PAYMENTS_ENABLED, WEB_URLS } from '@/config/api';
import { PRIVACY_EMAIL, PRIVACY_PHONE } from '@/content/legal';
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

/** Who sells, where and how to complain: shown before paying (LFPC art. 76 Bis III, M-21). */
export type Provider = {
  name: string;
  owner: string;
  address: string;
  phone: string;
  email: string;
  complaintsHours: string;
  /** null until the owner gives it. */
  rfc: string | null;
};

/** Alcohol rules from the server: licence hours and dry law (M-23), and the legend (M-18). */
export type AlcoholPolicy = {
  salesOpen: boolean;
  closedMessage: string;
  legend: string;
};

/**
 * Everything the store's rules depend on, as the server says (/public/info). Until the server
 * sends a field, the app uses the same wording as the website (`DEFAULT_POLICY`).
 */
export type StorePolicy = {
  /** Shown under the total; the customer accepts it before ordering. */
  feeNote: string;
  /** Today always false: the delivery person charges the fee on delivery. */
  feeIncludedInTotal: boolean;
  privacyUrl: string;
  termsUrl: string;
  deleteAccountUrl: string;
  /** Versions the customer accepts (M-22); null while the server doesn't publish them. */
  termsVersion: string | null;
  privacyVersion: string | null;
  /** Off when card payments are paused (e.g. the real test charge failed). */
  cardPayments: boolean;
  provider: Provider;
  alcohol: AlcoholPolicy;
  loyalty: { redeemable: boolean; rulesUrl: string | null };
  /** How to ask for an invoice (CFDI) for an order (M-25). */
  invoice: { instructions: string; email: string };
};

// Same wording as the server's default, for when it can't be reached.
export const DEFAULT_FEE_NOTE =
  'El costo del envío no está incluido en este total: lo cobra el repartidor al entregar tu pedido. ' +
  'Si quieres saber cuánto es antes de pedir, pregúntalo al restaurante.';

export const ALCOHOL_LEGEND = 'El abuso en el consumo de este producto es nocivo para la salud.';
const ALCOHOL_CLOSED_MESSAGE = 'En este momento no podemos vender bebidas con alcohol. Puedes pedir el resto del menú.';

// The same details as the Terms (section 1 and 18); the server's copy wins.
const DEFAULT_PROVIDER: Provider = {
  name: 'La 501 Sports Restaurant',
  owner: 'Andrés Rivera Jiménez',
  address: DEFAULT_ADDRESS,
  phone: PRIVACY_PHONE,
  email: PRIVACY_EMAIL,
  complaintsHours: 'Todos los días de 1:00 p.m. a 10:00 p.m.',
  rfc: null,
};

export const DEFAULT_POLICY: StorePolicy = {
  feeNote: DEFAULT_FEE_NOTE,
  feeIncludedInTotal: false,
  privacyUrl: WEB_URLS.privacy,
  termsUrl: WEB_URLS.terms,
  deleteAccountUrl: WEB_URLS.deleteAccount,
  termsVersion: null,
  privacyVersion: null,
  cardPayments: CARD_PAYMENTS_ENABLED,
  provider: DEFAULT_PROVIDER,
  // Open by default: the server rejects alcohol at checkout when sales are closed.
  alcohol: { salesOpen: true, closedMessage: ALCOHOL_CLOSED_MESSAGE, legend: ALCOHOL_LEGEND },
  loyalty: { redeemable: false, rulesUrl: null },
  invoice: {
    instructions:
      'Escríbenos con tu folio y tus datos fiscales completos (RFC, razón social, régimen, código postal y uso del CFDI) dentro del mismo mes de tu pedido.',
    email: PRIVACY_EMAIL,
  },
};

const asEmail = (value: unknown) => {
  const email = asString(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
};

function toProvider(raw: unknown): Provider {
  const obj = asObject(raw) ?? {};
  const text = (key: string, fallback: string) => asString(obj[key]) || fallback;
  return {
    name: text('name', DEFAULT_PROVIDER.name),
    owner: text('owner', DEFAULT_PROVIDER.owner),
    address: text('address', DEFAULT_PROVIDER.address),
    phone: text('phone', DEFAULT_PROVIDER.phone),
    email: asEmail(obj.email) || DEFAULT_PROVIDER.email,
    // The web sends complaint_hours; complaints_hours is the spelling of the first contract.
    complaintsHours: asString(obj.complaint_hours) || text('complaints_hours', DEFAULT_PROVIDER.complaintsHours),
    rfc: asString(obj.rfc) || null,
  };
}

/** Reads the store's rules from /public/info; missing fields keep the defaults above. */
export async function getStorePolicy(signal?: AbortSignal): Promise<StorePolicy> {
  const body = unwrap(await request<unknown>('/public/info', { signal }));
  const delivery = asObject(body.delivery) ?? {};
  const legal = asObject(body.legal) ?? {};
  const payments = asObject(body.payments) ?? {};
  const alcohol = asObject(body.alcohol) ?? {};
  const loyalty = asObject(body.loyalty) ?? {};
  const invoice = asObject(body.invoice) ?? {};
  const fallback = DEFAULT_POLICY;
  return {
    feeNote: asString(delivery.fee_note) || fallback.feeNote,
    feeIncludedInTotal: delivery.fee_included_in_total === true,
    privacyUrl: asHttpsUrl(legal.privacy_url) ?? fallback.privacyUrl,
    termsUrl: asHttpsUrl(legal.terms_url) ?? fallback.termsUrl,
    deleteAccountUrl: asHttpsUrl(legal.delete_account_url) ?? fallback.deleteAccountUrl,
    termsVersion: asString(legal.terms_version) || null,
    privacyVersion: asString(legal.privacy_version) || null,
    // Either side can pause card payments; both must allow them.
    cardPayments: CARD_PAYMENTS_ENABLED && payments.card_enabled !== false,
    provider: toProvider(body.provider),
    alcohol: {
      salesOpen: alcohol.sales_open !== false,
      closedMessage: asString(alcohol.closed_message) || fallback.alcohol.closedMessage,
      legend: asString(alcohol.legend) || fallback.alcohol.legend,
    },
    loyalty: { redeemable: loyalty.redeemable === true, rulesUrl: asHttpsUrl(loyalty.rules_url) },
    invoice: {
      instructions: asString(invoice.instructions) || fallback.invoice.instructions,
      email: asEmail(invoice.email) || fallback.invoice.email,
    },
  };
}
