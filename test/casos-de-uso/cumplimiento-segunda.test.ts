/**
 * Segunda revisión legal (M-18 a M-25): lo que la app decide sola (vigencia de promociones,
 * qué lleva alcohol) y cómo lee del servidor la leyenda, la ley seca, el proveedor, los puntos
 * y la factura. Sin esos campos, la app usa el mismo texto que la web.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { CartItem } from '@/domain/cart';
import { isAlcoholicProduct, withoutAlcohol } from '@/domain/checkout-rules';
import { isPromotionActive, validUntil } from '@/domain/promotions';

import { platillo } from '../fixtures/productos';

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

const linea = (product: CartItem['product']): CartItem => ({ lineId: product.key, product, quantity: 1, excluded: [], notes: '' });

describe('promociones con vigencia (M-20)', () => {
  const hoy = new Date('2026-11-04T12:00:00-06:00');

  it('una promoción vencida deja de mostrarse; sin fecha sigue vigente', () => {
    expect(isPromotionActive({ endsAt: new Date('2026-11-03T23:59:00-06:00') }, hoy)).toBe(false);
    expect(isPromotionActive({ endsAt: new Date('2026-11-15T23:59:00-06:00') }, hoy)).toBe(true);
    expect(isPromotionActive({ endsAt: null }, hoy)).toBe(true);
  });

  it('dice hasta cuándo es válida', () => {
    expect(validUntil({ endsAt: new Date('2026-11-15T12:00:00-06:00') })).toMatch(/^Válida hasta el 15 nov/);
    expect(validUntil({ endsAt: null })).toBeNull();
  });
});

describe('bebidas con alcohol (M-18, M-23)', () => {
  const cerveza = platillo({ key: 'corona', name: 'Cerveza Corona', category: 'Cervecería' });
  const promoConAlcohol = platillo({ key: 'promo-2x1', kind: 'promotion', name: '2x1 en cubetas', category: 'Promociones', alcoholic: true });

  it('reconoce productos y promociones con alcohol', () => {
    expect(isAlcoholicProduct(cerveza)).toBe(true);
    expect(isAlcoholicProduct(promoConAlcohol)).toBe(true);
    expect(isAlcoholicProduct(platillo())).toBe(false);
  });

  it('con la venta cerrada se quitan solo las bebidas con alcohol', () => {
    const carrito = [linea(cerveza), linea(platillo()), linea(promoConAlcohol)];
    expect(withoutAlcohol(carrito).map((item) => item.product.key)).toEqual(['hamburguesa-501']);
  });
});

function respuesta(body: unknown) {
  return {
    ok: true,
    status: 200,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  };
}

const fetchMock = jest.fn<(url: string) => Promise<unknown>>();

describe('reglas de la tienda desde /public/info', () => {
  beforeEach(() => {
    jest.resetModules();
    fetchMock.mockReset();
    (globalThis as { fetch: unknown }).fetch = fetchMock;
  });

  const info = () => require('@/api/info') as typeof import('@/api/info');

  it('sin los campos nuevos usa los textos de la web', async () => {
    fetchMock.mockResolvedValueOnce(respuesta({ success: true, data: { address: 'x' } }));
    const { getStorePolicy, ALCOHOL_LEGEND, DEFAULT_POLICY } = info();

    const policy = await getStorePolicy();

    expect(policy.alcohol).toEqual({ salesOpen: true, closedMessage: DEFAULT_POLICY.alcohol.closedMessage, legend: ALCOHOL_LEGEND });
    expect(policy.provider.owner).toBe('Andrés Rivera Jiménez');
    expect(policy.provider.rfc).toBeNull();
    expect(policy.loyalty).toEqual({ redeemable: false, rulesUrl: null });
    expect(policy.termsVersion).toBeNull();
  });

  it('lee la ley seca, el proveedor, las versiones, los puntos y la factura', async () => {
    fetchMock.mockResolvedValueOnce(
      respuesta({
        data: {
          alcohol: { sales_open: false, closed_message: 'Ley seca hoy.', legend: 'Leyenda del servidor.' },
          provider: { name: 'La 501', owner: 'Titular', phone: '771 000 0000', email: 'quejas@la501.mx', complaint_hours: '9 a 18', rfc: 'XAXX010101000' },
          legal: { terms_version: '2026-12', privacy_version: '2026-12', terms_url: 'http://inseguro.mx/terminos' },
          loyalty: { redeemable: true, rules_url: 'https://la501.mx/puntos' },
          invoice: { email: 'no-es-correo' },
        },
      }),
    );
    const { getStorePolicy, DEFAULT_POLICY } = info();

    const policy = await getStorePolicy();

    expect(policy.alcohol).toEqual({ salesOpen: false, closedMessage: 'Ley seca hoy.', legend: 'Leyenda del servidor.' });
    expect(policy.provider).toEqual(
      expect.objectContaining({ email: 'quejas@la501.mx', complaintsHours: '9 a 18', rfc: 'XAXX010101000' }),
    );
    expect(policy.termsVersion).toBe('2026-12');
    expect(policy.loyalty).toEqual({ redeemable: true, rulesUrl: 'https://la501.mx/puntos' });
    // Only https links and real email addresses are accepted.
    expect(policy.termsUrl).toBe(DEFAULT_POLICY.termsUrl);
    expect(policy.invoice.email).toBe(DEFAULT_POLICY.invoice.email);
  });

  it('las promociones vencidas no llegan a la pantalla', async () => {
    fetchMock.mockResolvedValueOnce(
      respuesta({
        data: [
          { id: 1, title: 'Vencida', active: true, ends_at: '2020-01-01T00:00:00-06:00' },
          { id: 2, title: 'Vigente', active: true, ends_at: '2099-01-01T00:00:00-06:00', conditions: 'Solo jueves.' },
        ],
      }),
    );
    const { getPromotions } = require('@/api/catalog') as typeof import('@/api/catalog');

    const promos = await getPromotions();

    expect(promos.map((promo) => promo.name)).toEqual(['Vigente']);
    expect(promos[0].conditions).toBe('Solo jueves.');
  });
});
