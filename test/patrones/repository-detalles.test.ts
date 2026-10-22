/**
 * Patrón Repository: product-details es el único punto de acceso a los ingredientes de
 * cada platillo y decide de dónde salen (copia incluida en la app, copia guardada en el
 * teléfono o servidor), sin que las pantallas lo sepan.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockDisco = new Map<string, { data: unknown; savedAt: number }>();

jest.mock('@/utils/offline-cache', () => ({
  readCache: jest.fn(async (clave: string) => mockDisco.get(clave) ?? null),
  writeCache: jest.fn((clave: string, data: unknown) => {
    mockDisco.set(clave, { data: JSON.parse(JSON.stringify(data)), savedAt: Date.now() });
  }),
}));

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

const fetchMock = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const json = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (nombre: string) => (nombre.toLowerCase() === 'content-type' ? 'application/json' : null) },
  json: async () => body,
});

beforeEach(() => {
  jest.resetModules();
  jest.useFakeTimers();
  mockDisco.clear();
  fetchMock.mockReset();
  (globalThis as { fetch: unknown }).fetch = fetchMock;
});

afterEach(() => {
  jest.useRealTimers();
});

const repositorio = () => require('@/data/product-details') as typeof import('@/data/product-details');
const snapshot = () => require('@/data/menu-snapshot') as typeof import('@/data/menu-snapshot');
// Un platillo que no viene en la copia incluida en la app.
const NUEVO = 987654;

async function sincronizar(ids: number[]) {
  const sincronizacion = repositorio().syncDetails(ids);
  await jest.advanceTimersByTimeAsync(5000);
  await sincronizacion;
}

describe('repositorio de detalles de platillos', () => {
  it('sin internet responde con la copia incluida en la app', () => {
    const [id, incluido] = [...snapshot().snapshotDetails()][0];

    expect(repositorio().getCachedDetail(id)?.ingredients).toEqual(incluido.ingredients);
    expect(repositorio().getCachedDetail(NUEVO)).toBeNull();
  });

  it('usa la copia guardada en el teléfono cuando es más nueva', async () => {
    mockDisco.set('product-details', {
      data: { [NUEVO]: { ingredients: [{ id: 1, name: 'Queso' }], subcategory: '', at: Date.now() } },
      savedAt: Date.now(),
    });

    await repositorio().loadDetails();

    expect(repositorio().getCachedDetail(NUEVO)?.ingredients).toEqual([{ id: 1, name: 'Queso' }]);
  });

  it('lo que falta lo trae del servidor y lo guarda en el teléfono', async () => {
    fetchMock.mockResolvedValueOnce(
      json(200, { success: true, data: { ingredientes: [{ id: 2, nombre: 'Tocino' }], subcategory: '' } }),
    );

    await sincronizar([NUEVO]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(repositorio().getCachedDetail(NUEVO)?.ingredients.map((i) => i.name)).toEqual(['Tocino']);
    expect(mockDisco.has('product-details')).toBe(true);
  });

  it('un platillo que ya no existe (404) se recuerda sin ingredientes para no reintentarlo', async () => {
    fetchMock.mockResolvedValueOnce(json(404, { message: 'No encontrado' }));

    await sincronizar([NUEVO]);

    expect(repositorio().getCachedDetail(NUEVO)).toEqual(expect.objectContaining({ ingredients: [], subcategory: '' }));
  });
});
