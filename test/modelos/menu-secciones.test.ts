/**
 * Comidas / Bebidas (capa de dominio), como divide el menú la web en "Tomar pedido".
 */
import { describe, expect, it } from '@jest/globals';

import { completeProduct, sectionCategories, sectionFor } from '@/domain/menu-layout';
import type { Product } from '@/types/product';

import { platillo } from '../fixtures/productos';

const burrito = platillo({ key: 'burrito', id: 1, name: 'Burrito Texano', category: 'Burritos' });
const corona = platillo({ key: 'corona', id: 2, name: 'Corona', category: 'Cervecería', subcategory: 'Cervezas', section: 'bebidas' });
const michelada = platillo({ key: 'michelada', id: 3, name: 'Michelada', category: 'Cervecería', subcategory: 'Preparados', section: 'bebidas' });

describe('secciones del menú', () => {
  it('sin el campo del servidor, adivina la sección por la categoría (nombres viejos y nuevos)', () => {
    expect(sectionFor('Coctelería')).toBe('bebidas');
    expect(sectionFor('Cervezas')).toBe('bebidas');
    expect(sectionFor('Bebidas sin Alcohol')).toBe('bebidas');
    expect(sectionFor('Hamburguesas')).toBe('comidas');
  });

  it('cada pestaña solo muestra sus categorías, sin las vacías', () => {
    const menu = [
      { name: 'Burritos', products: [burrito] },
      { name: 'Cervecería', products: [corona, michelada] },
    ];

    expect(sectionCategories(menu, 'comidas').map((c) => c.name)).toEqual(['Burritos']);
    expect(sectionCategories(menu, 'bebidas').map((c) => c.name)).toEqual(['Cervecería']);
  });

  it('completa los productos que una versión anterior de la app guardó en el teléfono', () => {
    const { section, station, presentation, variants, optionGroups, ...viejo } = corona;
    const completo = completeProduct({ ...viejo, category: 'Cervezas' } as Product);

    expect(completo).toEqual(
      expect.objectContaining({ section: 'bebidas', station: 'cocina', presentation: '', variants: [], optionGroups: [] }),
    );
  });
});
