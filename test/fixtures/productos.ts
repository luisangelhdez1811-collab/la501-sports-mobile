import type { Product } from '@/types/product';

/** Platillos de ejemplo para las pruebas. */
export function platillo(datos: Partial<Product> = {}): Product {
  return {
    key: 'hamburguesa-501',
    id: 7,
    kind: 'product',
    name: 'Hamburguesa 501',
    description: 'Carne, queso y tocino',
    image: null,
    price: 150,
    currency: 'MXN',
    category: 'Hamburguesas',
    subcategory: '',
    available: true,
    ...datos,
  };
}

export const papas = platillo({ key: 'papas', id: 9, name: 'Papas a la francesa', price: 60, category: 'Entradas' });
