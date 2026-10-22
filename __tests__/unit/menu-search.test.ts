import { describe, expect, it } from '@jest/globals';

import type { Product } from '@/types/product';
import { searchProducts } from '@/utils/menu-search';

const platillo = (name: string, category: string, description = '', subcategory = ''): Product => ({
  key: name,
  id: name.length,
  kind: 'product',
  name,
  description,
  image: null,
  price: 100,
  currency: 'MXN',
  category,
  subcategory,
  available: true,
});

const menu = [
  platillo('Burrito Clásico Arrachera', 'Burritos', 'Arrachera, frijoles y aguacate'),
  platillo('Agua embotellada 600ml', 'Bebidas'),
  platillo('Agua de limón', 'Bebidas'),
  platillo('Limonada mineral', 'Bebidas'),
  platillo('José Cuervo', 'Destilados', '', 'Tequila'),
  platillo('Hamburguesa Boneless', 'Hamburguesas'),
];

const nombres = (busqueda: string) => searchProducts(menu, busqueda).map((p) => p.name);

describe('buscador del mesero', () => {
  it('no encuentra platillos solo porque la descripción contiene la palabra', () => {
    expect(nombres('Agua')).toEqual(['Agua embotellada 600ml', 'Agua de limón']);
  });

  it('ignora acentos y mayúsculas, y busca desde el inicio de cada palabra', () => {
    expect(nombres('LIMON')).toEqual(['Limonada mineral', 'Agua de limón']);
    expect(nombres('jose')).toEqual(['José Cuervo']);
  });

  it('acepta varias palabras en cualquier orden', () => {
    expect(nombres('limon agua')).toEqual(['Agua de limón']);
    expect(nombres('hambur bone')).toEqual(['Hamburguesa Boneless']);
  });

  it('encuentra por categoría o subcategoría, después de los que coinciden por nombre', () => {
    expect(nombres('tequila')).toEqual(['José Cuervo']);
    expect(nombres('bebidas')).toHaveLength(3);
  });

  it('no busca dentro de las palabras ni con la búsqueda vacía', () => {
    expect(nombres('rrachera')).toEqual([]);
    expect(nombres('   ')).toEqual([]);
  });
});
