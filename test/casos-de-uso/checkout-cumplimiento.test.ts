/**
 * Cumplimiento del pedido a domicilio: reglas puras del checkout (alcohol, notas, folio y
 * confirmaciones) y lo que la app manda y lee del servidor, con fetch simulado.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { CartItem } from '@/domain/cart';
import {
  cartSignature,
  CLIENT_REF_PATTERN,
  hasNotes,
  isAlcoholic,
  missingConsent,
  newClientRef,
  requiresAdult,
} from '@/domain/checkout-rules';

import { platillo } from '../fixtures/productos';

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(async () => 'token-de-prueba'),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

const linea = (datos: Partial<CartItem> & { product: CartItem['product'] }): CartItem => ({
  lineId: datos.product.key,
  quantity: 1,
  excluded: [],
  notes: '',
  ...datos,
});

const cerveza = linea({ product: platillo({ key: 'corona', name: 'Cerveza Corona', category: 'Cervecería', subcategory: 'Cervezas' }) });
const cero = linea({ product: platillo({ key: 'cero', name: 'Cerveza Corona Cero', category: 'Cervecería' }) });
const michelada = linea({ product: platillo({ key: 'mich', name: 'Michelada', category: 'Cervecería', subcategory: 'Preparados' }) });
const hamburguesa = linea({ product: platillo() });

describe('reglas del checkout', () => {
  it('detecta alcohol por categoría, salvo «Cero» y los preparados', () => {
    expect(isAlcoholic(cerveza)).toBe(true);
    expect(isAlcoholic(cero)).toBe(false);
    expect(isAlcoholic(michelada)).toBe(false);
    expect(isAlcoholic(hamburguesa)).toBe(false);
  });

  it('si el servidor dice si lleva alcohol, manda el servidor', () => {
    const marcadoSinAlcohol = linea({ product: { ...cerveza.product, alcoholic: false } });
    const marcadoConAlcohol = linea({ product: { ...hamburguesa.product, alcoholic: true } });

    expect(isAlcoholic(marcadoSinAlcohol)).toBe(false);
    expect(isAlcoholic(marcadoConAlcohol)).toBe(true);
    expect(requiresAdult([hamburguesa, cerveza])).toBe(true);
    expect(requiresAdult([hamburguesa, cero])).toBe(false);
  });

  it('las notas con solo espacios no cuentan', () => {
    expect(hasNotes([linea({ product: platillo(), notes: '   ' })])).toBe(false);
    expect(hasNotes([linea({ product: platillo(), notes: 'Soy alérgico a la nuez' })])).toBe(true);
  });

  it('el mismo carrito da la misma firma aunque cambie el orden; otra cantidad, otra firma', () => {
    expect(cartSignature([hamburguesa, cerveza])).toBe(cartSignature([cerveza, hamburguesa]));
    expect(cartSignature([hamburguesa])).not.toBe(cartSignature([{ ...hamburguesa, quantity: 2 }]));
  });

  it('el folio cumple el formato del servidor y no se repite', () => {
    const folios = new Set(Array.from({ length: 50 }, () => newClientRef()));

    expect(folios.size).toBe(50);
    for (const folio of folios) expect(folio).toMatch(CLIENT_REF_PATTERN);
  });

  it('pide las confirmaciones en orden: envío, alcohol, notas', () => {
    const conNotas = linea({ product: platillo(), notes: 'Sin cacahuate, soy alérgico' });
    const nada = { deliveryTermsAccepted: false, adultConfirmed: false, healthDataConsent: false };

    expect(missingConsent([cerveza, conNotas], nada)).toMatch(/envío/);
    expect(missingConsent([cerveza, conNotas], { ...nada, deliveryTermsAccepted: true })).toMatch(/18 años/);
    expect(missingConsent([cerveza, conNotas], { ...nada, deliveryTermsAccepted: true, adultConfirmed: true })).toMatch(/salud/);
    expect(missingConsent([cerveza, conNotas], { deliveryTermsAccepted: true, adultConfirmed: true, healthDataConsent: true })).toBeNull();
    expect(missingConsent([hamburguesa], { ...nada, deliveryTermsAccepted: true })).toBeNull();
  });
});

function respuesta(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  };
}

const fetchMock = jest.fn<(url: string, init?: { body?: unknown }) => Promise<unknown>>();

describe('lo que se manda y se lee del servidor', () => {
  beforeEach(() => {
    jest.resetModules();
    fetchMock.mockReset();
    (globalThis as { fetch: unknown }).fetch = fetchMock;
  });

  it('el checkout manda el folio, las tres confirmaciones y los excluidos por nombre', async () => {
    fetchMock.mockImplementation(async () =>
      respuesta(200, { success: true, duplicate: true, order: { tracking_token: 'abc123' } }),
    );
    const { checkout } = require('@/api/orders') as typeof import('@/api/orders');

    const resultado = await checkout({
      items: [{ ...hamburguesa, excluded: [{ id: 3, name: 'Cebolla' }], notes: 'Bien cocida' }],
      name: 'Ana',
      phone: '4441234567',
      address: 'Calle 1 #23, Col. Centro',
      email: '',
      paymentMethod: 'efectivo',
      clientRef: 'app-prueba-12345678',
      deliveryTermsAccepted: true,
      adultConfirmed: false,
      healthDataConsent: true,
    });

    const cuerpo = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(cuerpo).toEqual(
      expect.objectContaining({
        client_ref: 'app-prueba-12345678',
        delivery_terms_accepted: true,
        adult_confirmed: false,
        health_data_consent: true,
      }),
    );
    expect(cuerpo.items[0].excluded_ingredients).toEqual(['Cebolla']);
    expect(resultado.duplicate).toBe(true);
  });

  it('el seguimiento lee forma de pago, si se puede cancelar y la devolución', async () => {
    fetchMock.mockImplementation(async () =>
      respuesta(200, {
        data: {
          status: 'cancelled',
          status_label: 'Cancelado',
          payment_method: 'tarjeta',
          can_cancel: false,
          refund_status: 'refunded',
          es_a_domicilio: true,
          created_at: '2026-11-05T08:26:00-06:00',
          items: [
            {
              product_name: 'Burrito Texano',
              quantity: 1,
              subtotal: 160,
              options: [{ group: 'Salsa', name: 'BBQ', quantity: 1 }],
              excluded_ingredients: ['Cebolla'],
              notes: 'Sin picante',
            },
          ],
          order: { id: 9, total: 250 },
        },
      }),
    );
    const { trackOrder } = require('@/api/account') as typeof import('@/api/account');

    expect(await trackOrder('abc123')).toEqual(
      expect.objectContaining({
        status: 'cancelled',
        statusLabel: 'Cancelado',
        paymentMethod: 'tarjeta',
        canCancel: false,
        refundStatus: 'refunded',
        total: 250,
        isDelivery: true,
        lines: [
          { name: 'Burrito Texano', quantity: 1, subtotal: 160, options: 'Salsa: BBQ', excluded: ['Cebolla'], notes: 'Sin picante' },
        ],
      }),
    );
  });

  it('cancelar lee la respuesta corta del servidor: estado, devolución y mensaje', async () => {
    fetchMock.mockImplementation(async () =>
      respuesta(200, { success: true, status: 'cancelled', refund_status: 'manual', message: 'Te devolvemos el dinero.' }),
    );
    const { cancelOrder } = require('@/api/account') as typeof import('@/api/account');

    expect(await cancelOrder('abc123')).toEqual({
      status: 'cancelled',
      refundStatus: 'manual',
      message: 'Te devolvemos el dinero.',
    });
  });

  it('la copia de datos sale del servidor; sin «titular» es un error, no un archivo vacío', async () => {
    fetchMock.mockImplementation(async () => respuesta(200, { success: true, data: { documento: 'Copia' } }));
    const { exportMyData } = require('@/api/account') as typeof import('@/api/account');

    await expect(exportMyData()).rejects.toThrow('No se pudo generar tu copia de datos');
  });
});
