/**
 * Prueba de integración del inicio de sesión: auth → cliente HTTP → almacenamiento seguro.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

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

const fetchMock = jest.fn<(...args: unknown[]) => Promise<unknown>>();

function ok(body: unknown) {
  return {
    ok: true,
    status: 200,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  };
}

beforeEach(() => {
  jest.resetModules();
  mockAlmacen.clear();
  fetchMock.mockReset();
  (globalThis as { fetch: unknown }).fetch = fetchMock;
});

function cargar() {
  return {
    ...(require('@/api/auth') as typeof import('@/api/auth')),
    ...(require('@/api/token-storage') as typeof import('@/api/token-storage')),
  };
}

describe('inicio de sesión', () => {
  it('guarda el token y devuelve al usuario con su rol', async () => {
    const { login, getToken } = cargar();
    fetchMock.mockResolvedValueOnce(
      ok({ token: 'abc123', user: { id: 7, nombre: 'Ana', email: 'ana@la501.mx', rol: 'Mesera', puntos: '40' } }),
    );

    const usuario = await login('  ANA@la501.mx ', 'La501Sports!');

    const cuerpo = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(cuerpo.email).toBe('ana@la501.mx');
    expect(usuario).toEqual({ id: 7, name: 'Ana', email: 'ana@la501.mx', role: 'mesero', points: 40, avatar: null });
    expect(await getToken()).toBe('abc123');
    expect(mockAlmacen.get('la501_token')).toBe('abc123');
  });

  it('con "mantener sesión" desactivado no deja el token guardado en el teléfono', async () => {
    const { login, getToken } = cargar();
    fetchMock.mockResolvedValueOnce(ok({ data: { access_token: 'temporal', user: { email: 'b@la501.mx' } } }));

    await login('b@la501.mx', 'La501Sports!', { remember: false });

    expect(await getToken()).toBe('temporal');
    expect(mockAlmacen.has('la501_token')).toBe(false);
  });

  it('avisa si el servidor no manda el token', async () => {
    const { login } = cargar();
    fetchMock.mockResolvedValueOnce(ok({ user: { email: 'c@la501.mx' } }));

    await expect(login('c@la501.mx', 'La501Sports!')).rejects.toThrow(
      'El servidor no envió la sesión (token). Avisa al administrador.',
    );
  });
});

describe('roles de usuario', () => {
  it('reconoce administradores, personal y clientes', () => {
    const { toUser } = cargar();
    expect(toUser({ email: 'a@x.mx', roles: [{ name: 'Administrador' }] })?.role).toBe('admin');
    expect(toUser({ email: 'b@x.mx', is_staff: 1 })?.role).toBe('mesero');
    expect(toUser({ email: 'c@x.mx', role: 'desconocido' })?.role).toBe('cliente');
    expect(toUser({ nombre: 'sin correo' })).toBeNull();
  });
});
