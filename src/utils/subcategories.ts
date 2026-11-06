import type { Category, Product } from '@/types/product';

const OTHERS = 'Otros';

/**
 * Splits a category into subcategory groups (e.g. Destilados → Ron, Mezcal, Tequila).
 * Returns null when there's nothing to split: fewer than two named subcategories.
 */
export function groupBySubcategory(products: Product[]): Category[] | null {
  const groups = new Map<string, Product[]>();
  for (const product of products) {
    const name = product.subcategory || OTHERS;
    groups.set(name, [...(groups.get(name) ?? []), product]);
  }
  const named = [...groups.keys()].filter((name) => name !== OTHERS);
  if (named.length < 2) return null;

  // Alphabetical so a drink is easy to find; "Otros" always last.
  return [...groups.entries()]
    .sort(([a], [b]) => (a === OTHERS ? 1 : b === OTHERS ? -1 : a.localeCompare(b, 'es')))
    .map(([name, items]) => ({ name, products: items }));
}
