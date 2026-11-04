import { EMPTY_SELECTION, selectionKey, unitPrice, type Selection } from '@/domain/menu-options';
import type { Ingredient, Product } from '@/types/product';

/**
 * Cart model and its rules (domain layer): pure functions, no React, storage or network,
 * so the same rules serve the screen (useCart) and the tests. The server recalculates
 * prices at checkout; totals here are a display estimate.
 */

export const MAX_QUANTITY = 99;
// The server rejects longer notes (and the order with them).
export const MAX_NOTES = 100;

export type CartItem = {
  /** Same product with different customizations becomes separate lines. */
  lineId: string;
  product: Product;
  quantity: number;
  excluded: Ingredient[];
  notes: string;
  /** Size and options picked; carts saved by older versions of the app don't have it. */
  selection?: Selection;
};

export type AddOptions = { excluded?: Ingredient[]; notes?: string; selection?: Selection };

export function lineIdFor(product: Product, excluded: Ingredient[], notes: string, selection: Selection = EMPTY_SELECTION) {
  const removed = excluded
    .map((i) => i.id ?? i.name)
    .sort()
    .join(',');
  return `${product.key}|${selectionKey(selection)}|${removed}|${notes.trim().toLowerCase()}`;
}

/** Adds one: a new line, or one more of the same dish with the same choices. */
export function addItem(
  items: CartItem[],
  product: Product,
  { excluded = [], notes = '', selection = EMPTY_SELECTION }: AddOptions = {},
): CartItem[] {
  const cleanNotes = notes.trim().slice(0, MAX_NOTES);
  const lineId = lineIdFor(product, excluded, cleanNotes, selection);
  const existing = items.find((item) => item.lineId === lineId);
  if (!existing) return [...items, { lineId, product, quantity: 1, excluded, notes: cleanNotes, selection }];
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

/** −1 on the most recent line of this dish (the "−" on the menu card). */
export function removeOneOf(items: CartItem[], productKey: string): CartItem[] {
  const last = items.filter((item) => item.product.key === productKey).at(-1);
  return last ? changeQuantity(items, last.lineId, -1) : items;
}

/** How many of this dish are in the cart, whatever their choices. */
export function quantityOf(items: CartItem[], productKey: string) {
  return items.filter((item) => item.product.key === productKey).reduce((total, item) => total + item.quantity, 0);
}

/** Price of one unit of the line, with its size and options. */
export function linePrice(item: CartItem) {
  return unitPrice(item.product, item.selection ?? EMPTY_SELECTION);
}

export function cartCount(items: CartItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function cartTotal(items: CartItem[]) {
  return items.reduce((total, item) => total + item.quantity * linePrice(item), 0);
}
