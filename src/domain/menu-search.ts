import type { Product } from '@/types/product';

/**
 * Dish search for the waiter: by name (and category / subcategory), word by word, from the
 * start of each word. The description is left out on purpose: "agua" must find "Agua de
 * limón", not every dish with "aguacate".
 */

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const words = (text: string) => normalize(text).split(/[^a-z0-9]+/).filter(Boolean);

export function searchProducts(products: Product[], query: string): Product[] {
  const terms = words(query);
  if (terms.length === 0) return [];

  const seen = new Set<string>();
  const scored = products.flatMap((product) => {
    if (seen.has(product.key)) return [];
    seen.add(product.key);
    const name = words(product.name);
    const all = [...name, ...words(`${product.category} ${product.subcategory}`)];
    if (!terms.every((term) => all.some((word) => word.startsWith(term)))) return [];
    // Best first: name starts with the search, then every term in the name, then category only.
    const score = normalize(product.name).startsWith(terms.join(' '))
      ? 0
      : terms.every((term) => name.some((word) => word.startsWith(term)))
        ? 1
        : 2;
    return [{ product, score }];
  });

  return scored.sort((a, b) => a.score - b.score).map((entry) => entry.product);
}
