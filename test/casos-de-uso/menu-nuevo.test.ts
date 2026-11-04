/**
 * Menú nuevo contra el servidor simulado (fetch falso): carga del menú con el servidor
 * nuevo y con el anterior, y lo que mandan el checkout del cliente y el pedido del mesero.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(async () => 'token-de-prueba'),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

function respuesta(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  };
}

const fetchMock = jest.fn<(url: string, init?: { body?: string }) => Promise<unknown>>();

beforeEach(() => {
  jest.resetModules();
  fetchMock.mockReset();
  (globalThis as { fetch: unknown }).fetch = fetchMock;
});

const urls = () => fetchMock.mock.calls.map(([url]) => String(url));
const cuerpo = (llamada: number) => JSON.parse(String(fetchMock.mock.calls[llamada][1]?.body));

describe('carga del menú', () => {
  it('con el servidor nuevo trae todo en una llamada y en el orden de la carta', async () => {
    fetchMock.mockImplementation(async () =>
      respuesta(200, {
        data: [
          { id: 1, name: 'Burrito Texano', price: 160, category: 'Burritos', section: 'comidas' },
          { id: 2, name: 'Hamburguesa Clásica', price: 150, category: 'Hamburguesas', section: 'comidas' },
          { id: 3, name: 'Burrito Caníbal', price: 165, category: 'Burritos', section: 'comidas' },
        ],
      }),
    );
    const { getMenu } = require('@/api/catalog') as typeof import('@/api/catalog');

    const { categories } = await getMenu();

    expect(urls()).toHaveLength(1);
    expect(urls()[0]).toContain('/public/products?limit=300');
    expect(categories.map((c) => c.name)).toEqual(['Burritos', 'Hamburguesas']);
    expect(categories[0].products.map((p) => p.id)).toEqual([1, 3]);
  });

  it('con el servidor anterior (límite de 100) sigue cargando categoría por categoría', async () => {
    fetchMock.mockImplementation(async (url) => {
      if (url.includes('limit=300')) return respuesta(422, { message: 'The limit field must not be greater than 100.' });
      if (url.includes('/public/categories')) return respuesta(200, { data: ['Cervezas'] });
      return respuesta(200, { data: [{ id: 9, name: 'Corona', price: 35, category: 'Cervezas' }] });
    });
    const { getMenu } = require('@/api/catalog') as typeof import('@/api/catalog');

    const { categories } = await getMenu();

    expect(categories).toHaveLength(1);
    expect(categories[0].products[0]).toEqual(expect.objectContaining({ name: 'Corona', section: 'bebidas' }));
  });
});

describe('lo que se manda al servidor', () => {
  it('el checkout manda presentación y opciones solo en los platillos que las tienen', async () => {
    fetchMock.mockImplementation(async () => respuesta(200, { success: true, order: { tracking_token: 'abc123' } }));
    const { checkout } = require('@/api/orders') as typeof import('@/api/orders');
    const { platillo } = require('../fixtures/productos') as typeof import('../fixtures/productos');
    const margarita = platillo({ key: 'm', id: 100, variants: [{ id: 544, name: 'Litro', price: 160 }] });
    const papas = platillo({
      key: 'p',
      id: 48,
      optionGroups: [{ id: 21, name: 'Tipo', label: 'Elige tu papa', min: 1, max: 1, maxPerOption: 1, options: [{ id: 130, name: 'Francesas', detail: '', price: 0 }] }],
    });

    await checkout({
      items: [
        { lineId: 'a', product: margarita, quantity: 1, excluded: [], notes: '', selection: { variantId: 544, counts: {} } },
        { lineId: 'b', product: papas, quantity: 2, excluded: [], notes: '', selection: { variantId: null, counts: { 130: 1 } } },
        { lineId: 'c', product: platillo(), quantity: 1, excluded: [], notes: '' },
      ],
      name: 'Ana',
      phone: '4441234567',
      address: 'Calle 1 #23',
      email: '',
      paymentMethod: 'efectivo',
      clientRef: 'app-prueba-0001',
      deliveryTermsAccepted: true,
      adultConfirmed: false,
      healthDataConsent: false,
    });

    const [vaso, conPapas, sencillo] = cuerpo(0).items;
    expect(vaso).toEqual(expect.objectContaining({ product_id: 100, variant_id: 544 }));
    expect(vaso.options).toBeUndefined();
    expect(conPapas).toEqual(expect.objectContaining({ product_id: 48, options: [{ id: 130, quantity: 1 }] }));
    expect(sencillo.variant_id).toBeUndefined();
    expect(sencillo.options).toBeUndefined();
  });

  it('el mesero manda las opciones y marca un platillo como entregado', async () => {
    fetchMock.mockImplementation(async () => respuesta(200, { success: true }));
    const { markServed, sendToKitchen } = require('@/api/waiter') as typeof import('@/api/waiter');

    await sendToKitchen(4, {
      items: [
        {
          productId: 48,
          quantity: 1,
          excluded: [],
          notes: '',
          selection: { variantId: null, counts: { 130: 1 } },
          offered: { variants: false, options: true },
        },
      ],
      label: 'Persona 1',
      clientRef: 'pedido-1',
      offline: false,
      createdAt: '2026-10-27T20:00:00Z',
    });
    await markServed(4, 77);

    expect(cuerpo(0).items[0]).toEqual(expect.objectContaining({ product_id: 48, options: [{ id: 130, quantity: 1 }] }));
    expect(urls()[1]).toContain('/app/waiter/tables/4/items/77/served');
  });
});
