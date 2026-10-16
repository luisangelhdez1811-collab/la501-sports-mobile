import type { CartItem } from '@/hooks/use-cart';

import { request } from './client';
import { asObject, asString, pick, unwrap } from './parse';

export type PaymentMethod = 'efectivo' | 'tarjeta';

export type CheckoutInput = {
  items: CartItem[];
  name: string;
  phone: string;
  address: string;
  email: string;
  paymentMethod: PaymentMethod;
};

export type CheckoutResult = {
  paymentMethod: PaymentMethod;
  /** Hosted payment page for card payments (opened in the system browser). */
  checkoutUrl: string | null;
  trackingToken: string;
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
        // NOTE: confirm with the backend whether it expects ingredient ids or names.
        excluded_ingredients: item.excluded.map((ingredient) => ingredient.id ?? ingredient.name),
        notes: item.notes || null,
      })),
      customer_name: input.name.trim(),
      customer_phone: input.phone,
      customer_address: input.address.trim(),
      customer_email: input.email.trim().toLowerCase() || null,
      payment_method: input.paymentMethod,
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
  };
}
