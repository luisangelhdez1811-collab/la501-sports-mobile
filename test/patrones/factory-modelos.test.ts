/**
 * Factory de modelos: toProducts y toOrder crean los modelos de la app a partir del JSON
 * del servidor, con valores seguros cuando falta o viene mal un campo.
 */
import { describe, expect, it } from '@jest/globals';

import { toOrder } from '@/api/account';
import { toProducts } from '@/api/catalog';

describe('fábrica de productos (toProducts)', () => {
  it('crea productos con los nombres de campo en inglés o en español', () => {
    const [ingles, espanol] = toProducts({
      data: [
        { id: 7, name: 'Hamburguesa 501', price: '150.50', category: { name: 'Hamburguesas' } },
        { id: 8, nombre: 'Agua de limón', precio: 38, categoria: 'Bebidas' },
      ],
    });

    expect(ingles).toEqual(expect.objectContaining({ key: 'product-7', id: 7, price: 150.5, category: 'Hamburguesas', currency: 'MXN' }));
    expect(espanol).toEqual(expect.objectContaining({ key: 'product-8', name: 'Agua de limón', price: 38 }));
  });

  it('descarta lo que no es un producto y da valores seguros a lo que falta', () => {
    const productos = toProducts([null, 'texto', { id: 1 }, { name: 'Sin categoría' }]);

    expect(productos).toHaveLength(1);
    expect(productos[0]).toEqual(
      expect.objectContaining({ id: null, price: 0, category: 'Otros', image: null, available: true }),
    );
  });

  it('solo acepta imágenes https y respeta "no disponible"', () => {
    const [producto] = toProducts([{ id: 2, name: 'Alitas', image: 'http://inseguro.test/a.jpg', available: false }]);

    expect(producto.image).toBeNull();
    expect(producto.available).toBe(false);
  });

  it('las promociones se crean con su propio tipo y llave', () => {
    const [promo] = toProducts([{ id: 3, title: '2x1 en tacos' }], 'promotion');

    expect(promo).toEqual(expect.objectContaining({ kind: 'promotion', key: 'promotion-3', category: 'Promociones' }));
  });
});

describe('fábrica de pedidos (toOrder)', () => {
  it('crea el resumen de un pedido y normaliza su estado', () => {
    const pedido = toOrder({ id: 15, total: '320', status: 'Canceled', tracking_token: 'abc_123-XYZ', created_at: '2026-10-20T19:00:00Z' }, 0);

    expect(pedido).toEqual(
      expect.objectContaining({ key: '15', total: 320, status: 'cancelled', trackingToken: 'abc_123-XYZ' }),
    );
    expect(pedido?.createdAt?.toISOString()).toBe('2026-10-20T19:00:00.000Z');
  });

  it('no acepta tokens de seguimiento con caracteres peligrosos para una URL', () => {
    expect(toOrder({ id: 1, tracking_token: '../../admin' }, 0)?.trackingToken).toBeNull();
    expect(toOrder({ id: 1, status: 'algo-raro' }, 0)?.status).toBe('unknown');
  });
});
