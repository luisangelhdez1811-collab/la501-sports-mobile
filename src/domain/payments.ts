/** How a table can pay: cash or card (no transfers). */
export const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value'];
