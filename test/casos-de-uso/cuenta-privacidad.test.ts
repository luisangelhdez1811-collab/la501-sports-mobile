/**
 * Pruebas de integración de los derechos ARCO en la app: Acceso y Rectificación en
 * /profile (con respaldo en /account para el servidor anterior), Oposición con las
 * preferencias de privacidad y recomendaciones que respetan la sesión.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(async () => 'token-de-prueba'),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

function respuesta(status: number, body: unknown = { success: true }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  };
}

const fetchMock = jest.fn<(...args: unknown[]) => Promise<unknown>>();

beforeEach(() => {
  jest.resetModules();
  fetchMock.mockReset();
  (globalThis as { fetch: unknown }).fetch = fetchMock;
});

const cuenta = () => require('@/api/account') as typeof import('@/api/account');
const catalogo = () => require('@/api/catalog') as typeof import('@/api/catalog');

function llamada(n: number) {
  const [url, opciones] = fetchMock.mock.calls[n] as [string, { method?: string; body?: string; headers: Record<string, string> }];
  return { url, metodo: opciones.method ?? 'GET', cuerpo: opciones.body ? JSON.parse(opciones.body) : null, headers: opciones.headers };
}

const perfil = {
  success: true,
  data: {
    user: { name: 'Ana', email: 'ana@la501.test', telefono: '5512345678', points: 10 },
    orders: [],
    subscribed_to_promos: true,
    privacy: { promos_correo: true, promos_sms: false, recomendaciones_personalizadas: false },
  },
};

describe('Acceso (GET /profile)', () => {
  it('lee los datos y las preferencias de privacidad', async () => {
    fetchMock.mockResolvedValueOnce(respuesta(200, perfil));

    const datos = await cuenta().getAccount();

    expect(llamada(0).url).toMatch(/\/app\/profile$/);
    expect(datos.phone).toBe('5512345678');
    expect(datos.promoSubscribed).toBe(true);
    expect(datos.privacy).toEqual({ promoEmail: true, promoSms: false, personalizedRecommendations: false });
  });

  it('con el servidor anterior usa /account y lee subscribed_to_promos', async () => {
    const { privacy, ...sinPreferencias } = perfil.data;
    fetchMock
      .mockResolvedValueOnce(respuesta(404, { message: 'Not found' }))
      .mockResolvedValueOnce(respuesta(200, { success: true, data: sinPreferencias }));

    const datos = await cuenta().getAccount();

    expect(privacy).toBeDefined();
    expect(llamada(1).url).toMatch(/\/app\/account$/);
    expect(datos.promoSubscribed).toBe(true);
    expect(datos.privacy).toBeNull();
  });
});

describe('Rectificación (PUT /profile)', () => {
  it('envía los datos corregidos', async () => {
    fetchMock.mockResolvedValueOnce(respuesta(200));

    await cuenta().updateProfile({ name: ' Ana López ', email: 'ANA@la501.test', phone: '5512345678' });

    const { url, metodo, cuerpo } = llamada(0);
    expect(url).toMatch(/\/app\/profile$/);
    expect(metodo).toBe('PUT');
    expect(cuerpo).toEqual({ name: 'Ana López', email: 'ana@la501.test', telefono: '5512345678' });
  });
});

describe('Oposición (PUT /profile/privacy)', () => {
  it('manda solo la preferencia que cambió y devuelve lo que guardó el servidor', async () => {
    fetchMock.mockResolvedValueOnce(
      respuesta(200, { success: true, data: { promos_correo: false, promos_sms: true, recomendaciones_personalizadas: true } }),
    );

    const guardado = await cuenta().updatePrivacy({ promoSms: true });

    expect(llamada(0).cuerpo).toEqual({ promos_sms: true });
    expect(guardado).toEqual({ promoEmail: false, promoSms: true, personalizedRecommendations: true });
  });

  it('falla si el servidor no confirma las preferencias', async () => {
    fetchMock.mockResolvedValueOnce(respuesta(200, { success: true }));

    await expect(cuenta().updatePrivacy({ promoEmail: false })).rejects.toThrow('no confirmó');
  });
});

describe('Recomendaciones', () => {
  it('mandan la sesión para que el servidor decida si usa el historial', async () => {
    fetchMock.mockResolvedValueOnce(
      respuesta(200, { success: true, data: { strategy: 'user_history', products: [{ id: 3, name: 'Alitas', price: 120 }] } }),
    );

    const resultado = await catalogo().getRecommendations([1, 2]);

    expect(llamada(0).headers.Authorization).toBe('Bearer token-de-prueba');
    expect(resultado.personalized).toBe(true);
    expect(resultado.products.map((p) => p.name)).toEqual(['Alitas']);
  });

  it('si el cliente se opuso, el servidor responde sugerencias generales', async () => {
    fetchMock.mockResolvedValueOnce(respuesta(200, { success: true, data: { strategy: 'popular', products: [] } }));

    expect((await catalogo().getRecommendations([])).personalized).toBe(false);
  });
});
