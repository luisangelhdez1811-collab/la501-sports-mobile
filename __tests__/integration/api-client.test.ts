/**
 * Pruebas de integración de la capa de API: cliente HTTP + almacenamiento del token +
 * configuración, con fetch simulado (no se llama al servidor real).
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockAlmacen = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(async (key: string) => mockAlmacen.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockAlmacen.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockAlmacen.delete(key);
  }),
}));

type Respuesta = { status: number; body?: unknown; headers?: Record<string, string> };

function respuesta({ status, body, headers = {} }: Respuesta) {
  const todos: Record<string, string> = { 'content-type': 'application/json', ...headers };
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => todos[name.toLowerCase()] ?? null },
    json: async () => body,
  };
}

const fetchMock = jest.fn<(...args: unknown[]) => Promise<unknown>>();

beforeEach(() => {
  jest.resetModules();
  mockAlmacen.clear();
  fetchMock.mockReset();
  (globalThis as { fetch: unknown }).fetch = fetchMock;
});

afterEach(() => {
  jest.useRealTimers();
});

function cargarModulos() {
  const client = require('@/api/client') as typeof import('@/api/client');
  const storage = require('@/api/token-storage') as typeof import('@/api/token-storage');
  const config = require('@/config/api') as typeof import('@/config/api');
  return { ...client, ...storage, ...config };
}

describe('cliente de la API', () => {
  it('hace GET a la URL base por HTTPS y devuelve el JSON', async () => {
    const { request, API_BASE_URL } = cargarModulos();
    fetchMock.mockResolvedValueOnce(respuesta({ status: 200, body: { data: [{ id: 1 }] } }));

    const datos = await request('/public/menu');

    expect(datos).toEqual({ data: [{ id: 1 }] });
    const [url, opciones] = fetchMock.mock.calls[0] as [string, { method: string; credentials: string }];
    expect(url).toBe(`${API_BASE_URL}/public/menu`);
    expect(url.startsWith('https://')).toBe(true);
    expect(opciones.method).toBe('GET');
    expect(opciones.credentials).toBe('omit');
  });

  it('envía el token guardado solo cuando la petición lo pide', async () => {
    const { request, saveToken } = cargarModulos();
    await saveToken('token-123');
    fetchMock.mockResolvedValue(respuesta({ status: 200, body: {} }));

    await request('/app/me', { auth: true });
    await request('/public/info');

    const conAuth = (fetchMock.mock.calls[0][1] as { headers: Record<string, string> }).headers;
    const sinAuth = (fetchMock.mock.calls[1][1] as { headers: Record<string, string> }).headers;
    expect(conAuth.Authorization).toBe('Bearer token-123');
    expect(sinAuth.Authorization).toBeUndefined();
  });

  it('rechaza rutas absolutas para no filtrar el token a otro servidor', async () => {
    const { request } = cargarModulos();
    await expect(request('https://otro-sitio.com/robar')).rejects.toThrow('Invalid API path');
    await expect(request('//otro-sitio.com')).rejects.toThrow('Invalid API path');
    await expect(request('/../admin')).rejects.toThrow('Invalid API path');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('muestra el mensaje de validación del servidor (422)', async () => {
    const { request, ApiError } = cargarModulos();
    fetchMock.mockResolvedValueOnce(respuesta({ status: 422, body: { message: 'El correo ya está registrado.' } }));

    const error = (await request('/app/auth/register', { method: 'POST', body: {} }).catch((e: unknown) => e)) as InstanceType<
      typeof ApiError
    >;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.message).toBe('El correo ya está registrado.');
  });

  it('nunca muestra detalles internos de un error 500', async () => {
    const { request } = cargarModulos();
    fetchMock.mockResolvedValueOnce(respuesta({ status: 500, body: { message: 'SQLSTATE[42S02] tabla no existe' } }));

    await expect(request('/public/menu')).rejects.toThrow('El servidor tuvo un error (código 500). Intenta de nuevo más tarde.');
  });

  it('explica en español el límite de solicitudes (429) con el tiempo de espera', async () => {
    const { request } = cargarModulos();
    fetchMock.mockResolvedValueOnce(
      respuesta({ status: 429, body: { error: 'too_many_attempts' }, headers: { 'retry-after': '120' } }),
    );

    await expect(request('/app/auth/forgot', { method: 'POST', body: {} })).rejects.toThrow(
      'Ya pediste varios códigos. Podrás pedir otro en 2 minutos.',
    );
  });

  it('con 401 borra el token y avisa que la sesión expiró', async () => {
    const { request, saveToken, getToken, onSessionExpired } = cargarModulos();
    await saveToken('token-viejo');
    const aviso = jest.fn();
    onSessionExpired(aviso);
    fetchMock.mockResolvedValueOnce(respuesta({ status: 401, body: {} }));

    await expect(request('/app/me', { auth: true })).rejects.toThrow('Tu sesión expiró. Inicia sesión de nuevo.');
    expect(await getToken()).toBeNull();
    expect(aviso).toHaveBeenCalledTimes(1);
  });

  it('sin internet muestra un mensaje claro', async () => {
    const { request, errorMessage } = cargarModulos();
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));

    const error = await request('/public/menu').catch((e) => e);

    expect(errorMessage(error)).toBe('No hay conexión con el servidor. Revisa tu internet.');
  });
});
