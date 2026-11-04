import type { CartItem } from '@/domain/cart';

/**
 * What a home-delivery order must carry before it's sent (domain layer, pure functions): the
 * customer accepted how delivery is charged, confirmed being 18+ when there's alcohol, and
 * allowed the use of health data when they wrote notes (allergies). The app checks this for a
 * good experience; the server decides.
 */

// Drinks with alcohol, by the menu's categories (old and new names), for when the server
// doesn't say it per product.
const ALCOHOLIC_CATEGORIES = new Set(['6 shots', 'cocteleria', 'destilados', 'digestivos', 'cerveceria', 'cervezas']);
const NON_ALCOHOLIC_NAME = /\b(cero|0\.0|preparados?)\b/i;
const NON_ALCOHOLIC_SUBCATEGORY = 'preparados';

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

/** The server's word wins; without it, the category decides (except "Cero" and "Preparados"). */
export function isAlcoholic(item: CartItem): boolean {
  const { product } = item;
  if (typeof product.alcoholic === 'boolean') return product.alcoholic;
  if (product.kind !== 'product') return false;
  return (
    ALCOHOLIC_CATEGORIES.has(normalize(product.category)) &&
    !NON_ALCOHOLIC_NAME.test(normalize(product.name)) &&
    normalize(product.subcategory) !== NON_ALCOHOLIC_SUBCATEGORY
  );
}

export function requiresAdult(items: CartItem[]): boolean {
  return items.some(isAlcoholic);
}

export function hasNotes(items: CartItem[]): boolean {
  return items.some((item) => item.notes.trim().length > 0);
}

/** What identifies the cart: while it doesn't change, a retry reuses the same reference. */
export function cartSignature(items: CartItem[]): string {
  return items
    .map((item) => `${item.lineId}x${item.quantity}`)
    .sort()
    .join(';');
}

/** Random reference the server uses to never register an order twice (8 to 64 characters). */
export function newClientRef(random: () => number = Math.random): string {
  const chunk = () =>
    Math.floor(random() * 0x100000000)
      .toString(16)
      .padStart(8, '0');
  return `app-${Date.now().toString(36)}-${chunk()}${chunk()}`;
}

export const CLIENT_REF_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export type ConsentState = {
  deliveryTermsAccepted: boolean;
  adultConfirmed: boolean;
  healthDataConsent: boolean;
};

/** Message of the first requirement missing, or null when the order can be sent. */
export function missingConsent(items: CartItem[], consent: ConsentState, adultRequired = requiresAdult(items)): string | null {
  if (!consent.deliveryTermsAccepted) return 'Confirma que leíste cómo se cobra el envío a domicilio.';
  if (adultRequired && !consent.adultConfirmed) {
    return 'Tu pedido lleva bebidas con alcohol: confirma que eres mayor de 18 años.';
  }
  if (hasNotes(items) && !consent.healthDataConsent) {
    return 'Escribiste notas: autoriza el uso de datos de salud (alergias) solo para preparar tu pedido.';
  }
  return null;
}
