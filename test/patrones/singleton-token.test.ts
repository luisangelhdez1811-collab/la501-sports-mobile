/**
 * Patrón Singleton: el token de sesión vive en una sola instancia compartida
 * (token-storage). Se lee del almacenamiento cifrado una sola vez y todos los módulos
 * ven el mismo valor.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(async () => 'token-guardado'),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

type AlmacenSimulado = { getItemAsync: jest.Mock; setItemAsync: jest.Mock; deleteItemAsync: jest.Mock };

beforeEach(() => {
  jest.resetModules();
});

const almacen = () => require('expo-secure-store') as AlmacenSimulado;
const tokens = () => require('@/api/token-storage') as typeof import('@/api/token-storage');

describe('token de sesión (Singleton)', () => {
  it('se lee del Keystore/Keychain una vez y después se reutiliza', async () => {
    const { getToken } = tokens();

    expect(await getToken()).toBe('token-guardado');
    expect(await getToken()).toBe('token-guardado');
    expect(await getToken()).toBe('token-guardado');

    expect(almacen().getItemAsync).toHaveBeenCalledTimes(1);
  });

  it('el cliente HTTP y el inicio de sesión comparten la misma instancia', async () => {
    const desdeCliente = tokens();
    const desdeInicioDeSesion = tokens();

    await desdeCliente.saveToken('token-nuevo');

    expect(desdeInicioDeSesion).toBe(desdeCliente);
    expect(await desdeInicioDeSesion.getToken()).toBe('token-nuevo');
  });

  it('"Mantener sesión" apagado: el token queda solo en memoria y se borra del Keystore', async () => {
    const { saveToken, getToken } = tokens();

    await saveToken('solo-memoria', { persist: false });

    expect(await getToken()).toBe('solo-memoria');
    expect(almacen().setItemAsync).not.toHaveBeenCalled();
    expect(almacen().deleteItemAsync).toHaveBeenCalled();
  });

  it('al cerrar sesión la instancia queda vacía', async () => {
    const { clearToken, getToken, hasToken } = tokens();
    await getToken();

    await clearToken();

    expect(await hasToken()).toBe(false);
  });
});
