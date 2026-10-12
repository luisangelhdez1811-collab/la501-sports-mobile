import { DEFAULT_HOURS, parseWeekHours, type WeekHours } from '@/utils/opening-hours';

import { request } from './client';
import { asObject, asString, unwrap } from './parse';

export type RestaurantInfo = {
  hours: WeekHours;
  /** e.g. "Av. Deportiva #501, Col. Centro, CP 43000, Huejutla de Reyes, Hgo." */
  address: string;
  /** Google Maps search text for the restaurant (from the website's map link). */
  mapQuery: string;
  /** Digits only, with country code (e.g. "527711234567"), or null if not set. */
  whatsapp: string | null;
};

export const DEFAULT_ADDRESS = 'Av. Deportiva #501, Col. Centro, CP 43000, Huejutla de Reyes, Hgo.';
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
