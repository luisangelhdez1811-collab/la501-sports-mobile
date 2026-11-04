/**
 * Sesión con JWT Bearer: tokens guardados cifrados, interceptor que renueva el JWT con el
 * refresh token al recibir un 401 y repite la petición, y cierre de sesión.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockLlavero = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(async (clave: string) => mockLlavero.get(clave) ?? null),
  setItemAsync: jest.fn(async (clave: string, valor: string) => {
    mockLlavero.set(clave, valor);
  }),
  deleteItemAsync: jest.fn(async (clave: string) => {
    mockLlavero.delete(clave);
  }),
}));

type Opciones = { method?: string; body?: string; headers: Record<string, string> };

function respuesta(status: number, body: unknown = { success: true }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (nombre: string) => (nombre.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  };
}

const fetchMock = jest.fn<(url: string, opciones: Opciones) => Promise<unknown>>();
const usuario = { id: 1, name: 'Ana', email: 'ana@la501.test', role: 'cliente' };

beforeEach(() => {
  jest.resetModules();
  mockLlavero.clear();
  fetchMock.mockReset();
  (globalThis as { fetch: unknown }).fetch = fetchMock;
});

const cliente = () => require('@/api/client') as typeof import('@/api/client');
const auth = () => require('@/api/auth') as typeof import('@/api/auth');

const llamadasA = (ruta: string) => fetchMock.mock.calls.filter(([url]) => url.endsWith(ruta));
const bearer = (n: number) => fetchMock.mock.calls[n][1].headers.Authorization;

/** Servidor simulado: el JWT "vencido" responde 401 y el refresh entrega uno nuevo. */
function servidor({ refresh = 200 }: { refresh?: number | 'sin-red' } = {}) {
  fetchMock.mockImplementation(async (url, opciones) => {
    if (url.endsWith('/app/auth/refresh')) {
      if (refresh === 'sin-red') throw new TypeError('Network request failed');
      return refresh === 200
        ? respuesta(200, { success: true, access_token: 'jwt-nuevo', refresh_token: 'refresh-nuevo', expires_in: 900 })
        : respuesta(refresh, { success: false, error: 'invalid_refresh_token' });
    }
    return opciones.headers.Authorization === 'Bearer jwt-nuevo' ? respuesta(200, { success: true, data: [] }) : respuesta(401);
  });
}

async function sesionGuardada() {
  mockLlavero.set('la501_token', 'jwt-vencido');
  mockLlavero.set('la501_refresh_token', 'refresh-1');
}

describe('inicio de sesión con JWT', () => {
  it('guarda el JWT y el refresh token en el almacenamiento cifrado', async () => {
    fetchMock.mockResolvedValueOnce(
      respuesta(200, { success: true, access_token: 'jwt-1', refresh_token: 'refresh-1', token_type: 'Bearer', user: usuario }),
    );

    await auth().login('ana@la501.test', 'secreta');

    expect(mockLlavero.get('la501_token')).toBe('jwt-1');
    expect(mockLlavero.get('la501_refresh_token')).toBe('refresh-1');
  });

  it('con un servidor anterior (solo "token" de Sanctum) también inicia sesión', async () => {
    fetchMock.mockResolvedValueOnce(respuesta(200, { success: true, token: '5|sanctum', user: usuario }));

    await auth().login('ana@la501.test', 'secreta');

    expect(mockLlavero.get('la501_token')).toBe('5|sanctum');
    expect(mockLlavero.has('la501_refresh_token')).toBe(false);
  });
});

describe('interceptor de 401', () => {
  it('renueva el JWT con el refresh token y repite la petición', async () => {
    await sesionGuardada();
    servidor();

    await cliente().request('/app/orders', { auth: true });

    expect(bearer(0)).toBe('Bearer jwt-vencido');
    expect(llamadasA('/app/auth/refresh')).toHaveLength(1);
    expect(JSON.parse(llamadasA('/app/auth/refresh')[0][1].body!)).toEqual({ refresh_token: 'refresh-1' });
    expect(bearer(2)).toBe('Bearer jwt-nuevo');
    expect(mockLlavero.get('la501_refresh_token')).toBe('refresh-nuevo');
  });

  it('varias peticiones con 401 al mismo tiempo comparten una sola renovación', async () => {
    await sesionGuardada();
    servidor();
    const { request } = cliente();

    await Promise.all([request('/app/orders', { auth: true }), request('/app/account', { auth: true }), request('/app/orders', { auth: true })]);

    expect(llamadasA('/app/auth/refresh')).toHaveLength(1);
  });

  it('si el refresh token ya no sirve, la sesión termina y se avisa a la app', async () => {
    await sesionGuardada();
    servidor({ refresh: 401 });
    const { onSessionExpired, request } = cliente();
    const alExpirar = jest.fn();
    onSessionExpired(alExpirar);

    await expect(request('/app/orders', { auth: true })).rejects.toMatchObject({ status: 401 });

    expect(alExpirar).toHaveBeenCalledTimes(1);
    expect(mockLlavero.has('la501_token')).toBe(false);
    expect(mockLlavero.has('la501_refresh_token')).toBe(false);
  });

  it('sin internet al renovar no cierra la sesión', async () => {
    await sesionGuardada();
    servidor({ refresh: 'sin-red' });
    const { onSessionExpired, request } = cliente();
    const alExpirar = jest.fn();
    onSessionExpired(alExpirar);

    await expect(request('/app/orders', { auth: true })).rejects.toMatchObject({ status: 0 });

    expect(alExpirar).not.toHaveBeenCalled();
    expect(mockLlavero.get('la501_refresh_token')).toBe('refresh-1');
  });

  it('si el JWT nuevo también es rechazado, no reintenta en bucle', async () => {
    await sesionGuardada();
    fetchMock.mockImplementation(async (url) =>
      url.endsWith('/app/auth/refresh')
        ? respuesta(200, { success: true, access_token: 'jwt-nuevo', refresh_token: 'refresh-nuevo' })
        : respuesta(401),
    );

    await expect(cliente().request('/app/orders', { auth: true })).rejects.toMatchObject({ status: 401 });

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('cierre de sesión', () => {
  it('manda el refresh token para revocarlo y borra los tokens del teléfono', async () => {
    await sesionGuardada();
    fetchMock.mockResolvedValueOnce(respuesta(200));

    await auth().logout();

    expect(JSON.parse(fetchMock.mock.calls[0][1].body!)).toEqual({ refresh_token: 'refresh-1' });
    expect(mockLlavero.size).toBe(0);
  });
});
