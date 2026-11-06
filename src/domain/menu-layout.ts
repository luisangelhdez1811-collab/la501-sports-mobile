import type { Category, MenuSection, Product } from '@/types/product';

/**
 * Comidas / Bebidas, as the website splits the menu (the waiter's "Tomar pedido").
 */

export const SECTIONS: { id: MenuSection; name: string }[] = [
  { id: 'comidas', name: 'Comidas' },
  { id: 'bebidas', name: 'Bebidas' },
];

// Servers from before the new menu don't send `section`: these categories (old and new
// names) are drinks; everything else is food.
const DRINK_CATEGORIES = new Set([
  'cerveceria',
  'cervezas',
  'destilados',
  '6 shots',
  'cocteleria',
  'digestivos',
  'bebidas sin alcohol',
  'sin alcohol',
  'bebidas',
]);

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

export function sectionFor(category: string): MenuSection {
  return DRINK_CATEGORIES.has(normalize(category)) ? 'bebidas' : 'comidas';
}

/**
 * Products saved on the phone by older versions of the app (cart, menu copy) lack the new
 * menu's fields: fill them in so every screen can rely on them.
 */
export function completeProduct(product: Product): Product {
  return {
    ...product,
    section: product.section ?? sectionFor(product.category),
    station: product.station ?? 'cocina',
    presentation: product.presentation ?? '',
    variants: product.variants ?? [],
    optionGroups: product.optionGroups ?? [],
  };
}

export function completeCategories(categories: Category[]): Category[] {
  return categories.map((category) => ({ ...category, products: category.products.map(completeProduct) }));
}

/** The tab's categories, in menu order; categories with nothing to show are left out. */
export function sectionCategories(categories: Category[], section: MenuSection): Category[] {
  return categories
    .map((category) => ({ ...category, products: category.products.filter((p) => p.section === section) }))
    .filter((category) => category.products.length > 0);
}
