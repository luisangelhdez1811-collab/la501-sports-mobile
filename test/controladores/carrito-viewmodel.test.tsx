/**
 * Controlador / ViewModel (MVVM): useCart expone el estado del carrito a las pantallas,
 * aplica las reglas del modelo y lo guarda en el teléfono.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { CartProvider, useCart } from '@/hooks/use-cart';

import { papas, platillo } from '../fixtures/productos';

const mockDisco = new Map<string, { data: unknown; savedAt: number }>();

jest.mock('@/utils/offline-cache', () => ({
  readCache: jest.fn(async (clave: string) => mockDisco.get(clave) ?? null),
  writeCache: jest.fn((clave: string, data: unknown) => {
    mockDisco.set(clave, { data: JSON.parse(JSON.stringify(data)), savedAt: Date.now() });
  }),
}));

beforeEach(() => mockDisco.clear());

const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;
const hamburguesa = platillo();
const guardado = (diasAtras: number) => ({
  data: [{ lineId: 'x', product: hamburguesa, quantity: 2, excluded: [], notes: '' }],
  savedAt: Date.now() - diasAtras * 24 * 60 * 60 * 1000,
});

describe('ViewModel del carrito (useCart)', () => {
  it('agrega, suma y quita platillos y recalcula los totales', async () => {
    const { result } = await renderHook(() => useCart(), { wrapper });

    await act(async () => {
      result.current.add(hamburguesa);
      result.current.add(hamburguesa);
      result.current.add(papas, { notes: 'extra salsa' });
    });

    expect(result.current.count).toBe(3);
    expect(result.current.total).toBe(360);

    const linea = result.current.items[0].lineId;
    await act(async () => result.current.decrement(linea));
    expect(result.current.count).toBe(2);

    await act(async () => result.current.clear());
    expect(result.current.items).toEqual([]);
  });

  it('guarda el carrito en el teléfono para no perderlo al cerrar la app', async () => {
    const { result } = await renderHook(() => useCart(), { wrapper });

    await act(async () => result.current.add(hamburguesa));

    await waitFor(() => expect((mockDisco.get('cart')?.data as unknown[] | undefined)?.length).toBe(1));
  });

  it('recupera el carrito guardado al abrir la app', async () => {
    mockDisco.set('cart', guardado(0));

    const { result } = await renderHook(() => useCart(), { wrapper });

    await waitFor(() => expect(result.current.count).toBe(2));
  });

  it('descarta un carrito guardado hace más de 3 días (precios viejos)', async () => {
    mockDisco.set('cart', guardado(4));

    const { result } = await renderHook(() => useCart(), { wrapper });
    await act(async () => {});

    expect(result.current.count).toBe(0);
  });
});
