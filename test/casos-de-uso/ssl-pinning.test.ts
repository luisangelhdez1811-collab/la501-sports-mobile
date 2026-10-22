/**
 * Certificate pinning (anti-MitM): se activa con los hashes SHA-256 antes de la primera
 * petición, y una conexión con un certificado que no coincide se rechaza.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockPinning = {
  disponible: true,
  alError: null as null | (() => void),
};

jest.mock('react-native-ssl-public-key-pinning', () => ({
  isSslPinningAvailable: jest.fn(() => mockPinning.disponible),
  initializeSslPinning: jest.fn(async () => {}),
  addSslPinningErrorListener: jest.fn((callback: () => void) => {
    mockPinning.alError = callback;
    return { remove: jest.fn() };
  }),
}));

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

const fetchMock = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const ok = {
  ok: true,
  status: 200,
  headers: { get: () => 'application/json' },
  json: async () => ({ success: true }),
};
const globales = globalThis as unknown as { fetch: unknown; __DEV__: boolean };
const devOriginal = globales.__DEV__;

beforeEach(() => {
  jest.resetModules();
  mockPinning.disponible = true;
  mockPinning.alError = null;
  fetchMock.mockReset();
  globales.fetch = fetchMock;
});

afterEach(() => {
  globales.__DEV__ = devOriginal;
});

const pinning = () => require('react-native-ssl-public-key-pinning') as { initializeSslPinning: jest.Mock };
const cliente = () => require('@/api/client') as typeof import('@/api/client');
const config = () => require('@/config/api') as typeof import('@/config/api');

describe('certificate pinning', () => {
  it('se activa una sola vez, antes de la primera petición, con los hashes del servidor', async () => {
    fetchMock.mockResolvedValue(ok);
    const { request } = cliente();

    await request('/public/products');
    await request('/public/categories');

    const { initializeSslPinning } = pinning();
    expect(initializeSslPinning).toHaveBeenCalledTimes(1);
    const { API_HOST, SSL_PINS, SSL_PINS_EXPIRATION } = config();
    expect(initializeSslPinning).toHaveBeenCalledWith({
      [API_HOST]: { includeSubdomains: false, publicKeyHashes: SSL_PINS, expirationDate: SSL_PINS_EXPIRATION },
    });
    expect(initializeSslPinning.mock.invocationCallOrder[0]).toBeLessThan(fetchMock.mock.invocationCallOrder[0]);
  });

  it('los pines son hashes SHA-256 en base64 e incluyen la cadena que hoy usa el servidor', () => {
    const { API_HOST, SSL_PINS } = config();

    expect(API_HOST).toBe('lavender-ram-537394.hostingersite.com');
    expect(SSL_PINS.length).toBeGreaterThanOrEqual(2);
    for (const pin of SSL_PINS) expect(Buffer.from(pin, 'base64')).toHaveLength(32);
    // Let's Encrypt YE1 y Root YE (openssl s_client, 2026-10-23).
    expect(SSL_PINS).toEqual(
      expect.arrayContaining(['brzvtCELCIZUo4sD/qPX0ccRtPsd3DY6RfmxpOU9oB4=', 'sCkq5UWXjg+7mKu9lMhhYF5bGLsy7VI/UNW3tccdR7w=']),
    );
  });

  it('un certificado que no coincide con los pines se reporta como conexión insegura', async () => {
    fetchMock.mockImplementation(async () => {
      mockPinning.alError?.();
      throw new TypeError('Network request failed');
    });

    await expect(cliente().request('/public/products')).rejects.toMatchObject({
      status: 0,
      message: expect.stringContaining('conexión con el servidor sea segura'),
    });
  });

  it('una versión de producción sin pinning no se conecta', async () => {
    mockPinning.disponible = false;
    globales.__DEV__ = false;

    await expect(cliente().request('/public/products')).rejects.toMatchObject({ status: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('en desarrollo (Expo Go) sin el módulo nativo sí se conecta', async () => {
    mockPinning.disponible = false;
    fetchMock.mockResolvedValue(ok);

    await cliente().request('/public/products');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
