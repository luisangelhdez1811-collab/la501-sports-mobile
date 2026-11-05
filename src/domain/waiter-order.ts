import { optionsSummary, selectionKey, unitPrice, type Selection } from '@/domain/menu-options';
import type { Ingredient, Product } from '@/types/product';

/**
 * The order a waiter is taking for one diner (domain layer, pure functions): the same dish can
 * appear several times with different choices; the same dish with the same choices joins one
 * line.
 */

export const MAX_QUANTITY = 50;

/** What the waiter chose for a dish in its card. */
export type DishChoice = {
  excluded: Ingredient[];
  notes: string;
  quantity: number;
  selection: Selection;
};

export type OrderLine = DishChoice & { id: number; product: Product };

const ingredientIds = (list: Ingredient[]) =>
  list
    .map((i) => String(i.id ?? i.name))
    .sort()
    .join('|');

export const sameChoice = (line: OrderLine, product: Product, choice: DishChoice) =>
  line.product.key === product.key &&
  line.notes.trim() === choice.notes.trim() &&
  ingredientIds(line.excluded) === ingredientIds(choice.excluded) &&
  selectionKey(line.selection) === selectionKey(choice.selection);

/** Adds a dish: joins a line with the same choices (up to MAX_QUANTITY) or starts a new one. */
export function addChoice(lines: OrderLine[], id: number, product: Product, choice: DishChoice): OrderLine[] {
  const same = lines.find((line) => sameChoice(line, product, choice));
  if (!same) return [...lines, { id, product, ...choice }];
  return lines.map((line) =>
    line === same ? { ...line, quantity: Math.min(MAX_QUANTITY, line.quantity + choice.quantity) } : line,
  );
}

export function updateLine(lines: OrderLine[], id: number, choice: DishChoice): OrderLine[] {
  return lines.map((line) => (line.id === id ? { ...line, ...choice } : line));
}

/** "−" on a dish: one less of its most recent line (gone at zero). */
export function removeOneOf(lines: OrderLine[], productKey: string): OrderLine[] {
  const last = lines.filter((line) => line.product.key === productKey).at(-1);
  if (!last) return lines;
  return lines.flatMap((line) =>
    line.id !== last.id ? [line] : line.quantity > 1 ? [{ ...line, quantity: line.quantity - 1 }] : [],
  );
}

export const linePrice = (line: OrderLine) => unitPrice(line.product, line.selection);

export const linesCount = (lines: OrderLine[]) => lines.reduce((sum, line) => sum + line.quantity, 0);

export const linesTotal = (lines: OrderLine[]) => lines.reduce((sum, line) => sum + line.quantity * linePrice(line), 0);

/** How many of a dish are in the order, whatever their choices. */
export const chosenCount = (lines: OrderLine[], productKey: string) =>
  linesCount(lines.filter((line) => line.product.key === productKey));

/** "Mediana · Sin cebolla · bien cocida": what the kitchen must know about a line. */
export const customization = (line: OrderLine) =>
  [
    optionsSummary(line.product, line.selection),
    line.excluded.length > 0 ? `Sin ${line.excluded.map((i) => i.name.toLowerCase()).join(', ')}` : '',
    line.notes.trim(),
  ]
    .filter(Boolean)
    .join(' · ');
