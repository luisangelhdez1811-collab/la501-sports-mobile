import { formatPrice } from '@/domain/money';
import type { MenuOption, OptionGroup, Product } from '@/types/product';

/**
 * Size and options of a dish (sauces, fries, "Arma tus Papas" steps): the same rules as the
 * website's menu-opciones.js, so the app and the web behave alike. Prices here are only for
 * display; the server recalculates every line from the database.
 */

/** What was picked: one variant (if the dish has sizes) and how many of each option. */
export type Selection = {
  variantId: number | null;
  counts: Record<number, number>;
};

export const EMPTY_SELECTION: Selection = { variantId: null, counts: {} };

const roundMoney = (n: number) => Math.round(n * 100) / 100;

/** Has something to choose before adding: sizes, option lists or ingredients to remove. */
export function needsChoice(product: Product, ingredientCount = 0) {
  return product.variants.length > 0 || product.optionGroups.length > 0 || ingredientCount > 0;
}

/** Starts with the first (cheapest) size and nothing else picked. */
export function createSelection(product: Product): Selection {
  return { variantId: product.variants[0]?.id ?? null, counts: {} };
}

export function countOf(selection: Selection, option: MenuOption) {
  return selection.counts[option.id] ?? 0;
}

export function groupTotal(group: OptionGroup, selection: Selection) {
  return group.options.reduce((sum, option) => sum + countOf(selection, option), 0);
}

export function canAddMore(group: OptionGroup, option: MenuOption, selection: Selection) {
  const limit = group.max > 0 ? group.max : Infinity;
  return countOf(selection, option) < group.maxPerOption && groupTotal(group, selection) < limit;
}

export function addOne(group: OptionGroup, option: MenuOption, selection: Selection): Selection {
  if (!canAddMore(group, option, selection)) return selection;
  return { ...selection, counts: { ...selection.counts, [option.id]: countOf(selection, option) + 1 } };
}

export function removeOne(option: MenuOption, selection: Selection): Selection {
  const counts = { ...selection.counts };
  if ((counts[option.id] ?? 0) <= 1) delete counts[option.id];
  else counts[option.id] -= 1;
  return { ...selection, counts };
}

/** Tapping an option: a radio button in single-choice lists, a checkbox otherwise. */
export function toggle(group: OptionGroup, option: MenuOption, selection: Selection): Selection {
  if (group.max === 1) {
    const counts = Object.fromEntries(
      Object.entries(selection.counts).filter(([id]) => !group.options.some((o) => o.id === Number(id))),
    );
    if (!countOf(selection, option)) counts[option.id] = 1;
    return { ...selection, counts };
  }
  return countOf(selection, option) ? removeOne(option, selection) : addOne(group, option, selection);
}

export function selectVariant(selection: Selection, variantId: number): Selection {
  return { ...selection, variantId };
}

function findOption(product: Product, optionId: number) {
  for (const group of product.optionGroups) {
    const option = group.options.find((o) => o.id === optionId);
    if (option) return option;
  }
  return null;
}

/** Price of one: the chosen size (or the dish) plus every option × how many. */
export function unitPrice(product: Product, selection: Selection) {
  const variant = product.variants.find((v) => v.id === selection.variantId);
  let total = variant ? variant.price : product.price;
  for (const [id, count] of Object.entries(selection.counts)) {
    total += (findOption(product, Number(id))?.price ?? 0) * count;
  }
  return roundMoney(total);
}

/** What's still required (blocks adding), e.g. "Elige una opción en «Elige tu papa»". */
export function missingChoices(product: Product, selection: Selection) {
  return product.optionGroups
    .filter((g) => groupTotal(g, selection) < g.min)
    .map((g) => (g.min === 1 ? `Elige una opción en «${g.label}»` : `Elige ${g.min} en «${g.label}»`));
}

/** A list where every option costs nothing (sauce, seasoning): it comes with the dish. */
export function isIncluded(group: OptionGroup) {
  return group.options.every((o) => o.price === 0);
}

/**
 * Included lists left empty. Only a reminder, never blocking: the customer may not want
 * sauce. Paid extras are never reminded.
 */
export function reminders(product: Product, selection: Selection) {
  return product.optionGroups
    .filter((g) => g.min === 0 && isIncluded(g) && groupTotal(g, selection) === 0)
    .map((g) => g.name.toLowerCase());
}

/** Short rule beside the list title: "Obligatorio", "Incluido", "Opcional · hasta 5"… */
export function groupRule(group: OptionGroup) {
  if (group.min > 0) return group.min === group.max ? 'Obligatorio' : `Obligatorio · ${group.min} a ${group.max}`;
  if (isIncluded(group)) return group.max > 1 ? `Incluye hasta ${group.max}` : 'Incluido';
  return group.max > 1 ? `Opcional · hasta ${group.max}` : 'Opcional';
}

/** "Margarita (Litro)" when a size was chosen. */
export function displayName(product: Product, selection: Selection) {
  const variant = product.variants.find((v) => v.id === selection.variantId);
  return variant ? `${product.name} (${variant.name})` : product.name;
}

/** "Tipo de papa: Francesas · Especialidades: 2x Porción de Boneless". */
export function optionsSummary(product: Product, selection: Selection) {
  return product.optionGroups
    .map((group) => {
      const picked = group.options
        .filter((o) => countOf(selection, o) > 0)
        .map((o) => (countOf(selection, o) > 1 ? `${countOf(selection, o)}x ` : '') + o.name);
      return picked.length ? `${group.name}: ${picked.join(', ')}` : null;
    })
    .filter(Boolean)
    .join(' · ');
}

/** Option lines as the API takes them: `[{ id, quantity }]`. */
export function optionsPayload(selection: Selection) {
  return Object.entries(selection.counts).map(([id, quantity]) => ({ id: Number(id), quantity }));
}

/** Identifies the combination, so the same dish with the same choices joins one line. */
export function selectionKey(selection: Selection) {
  const options = Object.entries(selection.counts)
    .map(([id, count]) => `${id}x${count}`)
    .sort()
    .join('-');
  return `${selection.variantId ?? ''}|${options}`;
}

/** Price on the menu card: "Vaso $80 · Litro $160", or just "$155". */
export function menuPrice(product: Product) {
  if (product.variants.length === 0) return formatPrice(product.price);
  return product.variants.map((v) => `${v.name} ${formatPrice(v.price)}`).join(' · ');
}

/** Price badge: "Desde $80" when there are sizes. */
export function priceBadge(product: Product) {
  return product.variants.length > 0 ? `Desde ${formatPrice(product.price)}` : formatPrice(product.price);
}
