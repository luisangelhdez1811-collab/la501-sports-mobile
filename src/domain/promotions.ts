import type { Promotion } from '@/types/product';

/**
 * Offers must show when they end and their conditions before buying (LFPC art. 46 a 48).
 * Pure functions: the server also rejects an expired offer at checkout.
 */

/** Still valid at `now`: no end date, or the end date hasn't passed. */
export function isPromotionActive(promo: Pick<Promotion, 'endsAt'>, now: Date = new Date()): boolean {
  return promo.endsAt === null || promo.endsAt.getTime() >= now.getTime();
}

const dayMonth = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });

/** "Válida hasta el 15 nov" — or null when the offer has no end date. */
export function validUntil(promo: Pick<Promotion, 'endsAt'>): string | null {
  return promo.endsAt ? `Válida hasta el ${dayMonth.format(promo.endsAt)}` : null;
}
