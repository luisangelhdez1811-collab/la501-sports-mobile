/**
 * Patrón Observer: las pantallas se suscriben a "sesión expirada" y el cliente HTTP les
 * avisa cuando el servidor rechaza el token (401).
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(async () => 'token-vencido'),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

const fetchMock = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const respuesta401 = {
  ok: false,
  status: 401,
  headers: { get: (nombre: string) => (nombre.toLowerCase() === 'content-type' ? 'application/json' : null) },
  json: async () => ({ message: 'Unauthenticated.' }),
};

beforeEach(() => {
  jest.resetModules();
  fetchMock.mockReset();
  (globalThis as { fetch: unknown }).fetch = fetchMock;
});

const cliente = () => require('@/api/client') as typeof import('@/api/client');
const tokens = () => require('@/api/token-storage') as typeof import('@/api/token-storage');

describe('sesión expirada (Observer)', () => {
  it('avisa a todos los suscriptores y borra el token', async () => {
    const { onSessionExpired, request } = cliente();
    const pantallaA = jest.fn();
    const pantallaB = jest.fn();
    onSessionExpired(pantallaA);
    onSessionExpired(pantallaB);
    fetchMock.mockResolvedValueOnce(respuesta401);

    await expect(request('/app/account', { auth: true })).rejects.toMatchObject({ status: 401 });

    expect(pantallaA).toHaveBeenCalledTimes(1);
    expect(pantallaB).toHaveBeenCalledTimes(1);
    expect(await tokens().getToken()).toBeNull();
  });

  it('quien cancela su suscripción ya no recibe avisos', async () => {
    const { onSessionExpired, request } = cliente();
    const pantalla = jest.fn();
    const cancelar = onSessionExpired(pantalla);
    cancelar();
    fetchMock.mockResolvedValueOnce(respuesta401);

    await expect(request('/app/account', { auth: true })).rejects.toMatchObject({ status: 401 });

    expect(pantalla).not.toHaveBeenCalled();
  });

  it('un 401 en una ruta sin sesión (inicio de sesión fallido) no avisa a nadie', async () => {
    const { onSessionExpired, request } = cliente();
    const pantalla = jest.fn();
    onSessionExpired(pantalla);
    fetchMock.mockResolvedValueOnce(respuesta401);

    await expect(request('/app/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({ status: 401 });

    expect(pantalla).not.toHaveBeenCalled();
  });
});
