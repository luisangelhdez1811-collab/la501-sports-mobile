import type { CartItem } from '@/domain/cart';
import { optionsPayload, type Selection } from '@/domain/menu-options';
import type { Product } from '@/types/product';

import { request } from './client';
import { asObject, asString, pick, unwrap } from './parse';

/** Whether the dish has sizes and option lists. */
export type ChoicesOffered = { variants: boolean; options: boolean };

export const offeredBy = (product: Product): ChoicesOffered => ({
  variants: product.variants.length > 0,
  options: product.optionGroups.length > 0,
});

/**
 * Size and options of a line, only for dishes that have them. Sending `options` makes the
 * server check every limit; leaving it out (dishes without lists, older servers) is
 * accepted as is.
 */
export function choicesPayload(selection: Selection | undefined, offered: ChoicesOffered) {
  return {
    ...(offered.variants && selection?.variantId ? { variant_id: selection.variantId } : {}),
    ...(offered.options && selection ? { options: optionsPayload(selection) } : {}),
  };
}

export type PaymentMethod = 'efectivo' | 'tarjeta';

export type CheckoutInput = {
  items: CartItem[];
  name: string;
  phone: string;
  address: string;
  email: string;
  paymentMethod: PaymentMethod;
  /** Same reference on every retry of one cart, so the server never registers it twice. */
  clientRef: string;
  /** Accepted how delivery is charged (it isn't in the total). */
  deliveryTermsAccepted: boolean;
  /** 18+ confirmed; required by the server when the order has alcohol. */
  adultConfirmed: boolean;
  /** Allowed the use of health data written in the notes (allergies). */
  healthDataConsent: boolean;
};

export type CheckoutResult = {
  paymentMethod: PaymentMethod;
  /** Hosted payment page for card payments (opened in the system browser). */
  checkoutUrl: string | null;
  trackingToken: string;
  /** The reference already existed: this is that order, not a new one. */
  duplicate: boolean;
};

/**
 * Only ids, quantities and customizations are sent: the server prices the order from
 * the database, so a tampered client can't change what the customer pays.
 */
export async function checkout(input: CheckoutInput): Promise<CheckoutResult> {
  const data = await request<unknown>('/app/checkout', {
    method: 'POST',
    // Sends the token when signed in (points and achievements); guests work the same.
    auth: true,
    body: {
      items: input.items.map((item) => ({
        product_id: item.product.kind === 'product' ? item.product.id : null,
        promotion_id: item.product.kind === 'promotion' ? item.product.id : null,
        quantity: item.quantity,
        // The server keeps the name; it's what the kitchen reads ("Sin: Cebolla").
        excluded_ingredients: item.excluded.map((ingredient) => ingredient.name),
        notes: item.notes || null,
        ...choicesPayload(item.selection, offeredBy(item.product)),
      })),
      customer_name: input.name.trim(),
      customer_phone: input.phone,
      customer_address: input.address.trim(),
      customer_email: input.email.trim().toLowerCase() || null,
      payment_method: input.paymentMethod,
      client_ref: input.clientRef,
      delivery_terms_accepted: input.deliveryTermsAccepted,
      adult_confirmed: input.adultConfirmed,
      health_data_consent: input.healthDataConsent,
    },
  });

  const root = asObject(data) ?? {};
  const body = unwrap(data);
  const order = asObject(pick(root, 'order') ?? pick(body, 'order')) ?? {};
  const trackingToken = asString(order.tracking_token);
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(trackingToken)) {
    throw new Error('Respuesta de pedido inválida');
  }

  const checkoutUrl = asString(pick(root, 'checkout_url') ?? pick(body, 'checkout_url'));
  const method = asString(pick(root, 'payment_method') ?? pick(body, 'payment_method'));

  return {
    paymentMethod: method === 'tarjeta' ? 'tarjeta' : input.paymentMethod,
    // Never open a non-HTTPS payment page.
    checkoutUrl: checkoutUrl.startsWith('https://') ? checkoutUrl : null,
    trackingToken,
    duplicate: pick(root, 'duplicate') === true || pick(body, 'duplicate') === true,
  };
}
