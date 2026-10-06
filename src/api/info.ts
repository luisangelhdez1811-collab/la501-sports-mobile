import { DEFAULT_HOURS, parseWeekHours, type WeekHours } from '@/utils/opening-hours';

import { request } from './client';
import { asObject, asString, unwrap } from './parse';

export type RestaurantInfo = {
  hours: WeekHours;
  /** Digits only, with country code (e.g. "527711234567"), or null if not set. */
  whatsapp: string | null;
};

/** Public restaurant info (opening hours, contact). */
export async function getRestaurantInfo(signal?: AbortSignal): Promise<RestaurantInfo> {
  const body = unwrap(await request<unknown>('/public/info', { signal }));
  const schedule = asObject(body.schedule);
  const contact = asObject(body.contact) ?? {};
  const digits = asString(contact.whatsapp).replace(/\D/g, '');
  return {
    hours: schedule ? parseWeekHours(schedule) : DEFAULT_HOURS,
    // Mexican numbers are stored with 10 digits; wa.me needs the 52 country code.
    whatsapp: digits.length === 10 ? `52${digits}` : digits.length >= 12 ? digits : null,
  };
}
