import type { Ingredient, Product } from '@/types/product';

/**
 * Cart model and its rules (domain layer): pure functions, no React, storage or network,
 * so the same rules serve the screen (useCart) and the tests. The server recalculates
 * prices at checkout; totals here are a display estimate.
 */

export const MAX_QUANTITY = 99;
export const MAX_NOTES = 300;

export type CartItem = {
  /** Same product with different customizations becomes separate lines. */
  lineId: string;
  product: Product;
  quantity: number;
  excluded: Ingredient[];
  notes: string;
};

export type AddOptions = { excluded?: Ingredient[]; notes?: string };

export function lineIdFor(product: Product, excluded: Ingredient[], notes: string) {
  const removed = excluded
    .map((i) => i.id ?? i.name)
    .sort()
    .join(',');
  return `${product.key}|${removed}|${notes.trim().toLowerCase()}`;
}

/** Adds one: a new line, or one more of the same dish with the same choices. */
export function addItem(items: CartItem[], product: Product, { excluded = [], notes = '' }: AddOptions = {}): CartItem[] {
  const cleanNotes = notes.trim().slice(0, MAX_NOTES);
  const lineId = lineIdFor(product, excluded, cleanNotes);
  const existing = items.find((item) => item.lineId === lineId);
  if (!existing) return [...items, { lineId, product, quantity: 1, excluded, notes: cleanNotes }];
  return items.map((item) => (item === existing ? { ...item, quantity: Math.min(item.quantity + 1, MAX_QUANTITY) } : item));
}

/** +1 / −1 on a line; a line that reaches zero leaves the cart. */
export function changeQuantity(items: CartItem[], lineId: string, delta: number): CartItem[] {
  return items
    .map((item) => (item.lineId === lineId ? { ...item, quantity: Math.min(item.quantity + delta, MAX_QUANTITY) } : item))
    .filter((item) => item.quantity > 0);
}

export function removeItem(items: CartItem[], lineId: string): CartItem[] {
  return items.filter((item) => item.lineId !== lineId);
}

export function cartCount(items: CartItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function cartTotal(items: CartItem[]) {
  return items.reduce((total, item) => total + item.quantity * item.product.price, 0);
}
