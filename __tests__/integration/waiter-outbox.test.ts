/**
 * Pruebas de integración del trabajo del mesero: pedidos sin conexión (cola de envío) y
 * cobros solo con internet, con fetch y el almacenamiento del teléfono simulados.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockDisco = new Map<string, unknown>();

jest.mock('@/utils/offline-cache', () => ({
  readCache: jest.fn(async (key: string) => (mockDisco.has(key) ? { data: mockDisco.get(key), savedAt: Date.now() } : null)),
  writeCache: jest.fn((key: string, data: unknown) => {
    mockDisco.set(key, JSON.parse(JSON.stringify(data)));
  }),
}));

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
const sinRed = () => Promise.reject(new TypeError('Network request failed'));
const MESERO = 'mesero@la501.test';

beforeEach(() => {
  jest.resetModules();
  mockDisco.clear();
  fetchMock.mockReset();
  (globalThis as { fetch: unknown }).fetch = fetchMock;
});

function cargar() {
  const acciones = require('@/data/waiter-actions') as typeof import('@/data/waiter-actions');
  const cola = require('@/data/waiter-outbox') as typeof import('@/data/waiter-outbox');
  return { ...acciones, ...cola };
}

const hamburguesa = { productId: 7, name: 'Hamburguesa 501', price: 150, quantity: 2, excluded: [], notes: 'sin cebolla' };

function cuerpo(llamada: number) {
  const [, opciones] = fetchMock.mock.calls[llamada] as [string, { body: string }];
  return JSON.parse(opciones.body);
}

describe('pedidos a cocina', () => {
  it('con internet se envían de inmediato con el comensal y su referencia', async () => {
    const { placeKitchenOrder, pendingCount } = cargar();
    fetchMock.mockResolvedValueOnce(respuesta(201));

    const entrega = await placeKitchenOrder({ tableId: 3, tableNumber: '3', label: 'Persona 1', items: [hamburguesa], owner: MESERO, offline: false });

    expect(entrega).toBe('sent');
    const enviado = cuerpo(0);
    expect(enviado.label).toBe('Persona 1');
    expect(enviado.offline).toBe(false);
    expect(enviado.client_ref).toMatch(/^pedido-/);
    expect(pendingCount(MESERO)).toBe(0);
  });

  it('si se cae la conexión a medio envío, se guarda en el teléfono en lugar de perderse', async () => {
    const { placeKitchenOrder, pendingCount } = cargar();
    fetchMock.mockImplementationOnce(sinRed);

    const entrega = await placeKitchenOrder({ tableId: 3, tableNumber: '3', label: 'Persona 1', items: [hamburguesa], owner: MESERO, offline: false });

    expect(entrega).toBe('saved');
    expect(pendingCount(MESERO)).toBe(1);
    expect(mockDisco.get('waiter-outbox')).toHaveLength(1);
  });
});

describe('cobros (solo con internet)', () => {
  const cobro = {
    tableId: 4,
    ref: 'cobro-prueba-1',
    orders: [{ id: 21 }],
    payments: [{ method: 'efectivo' as const, amount: 300 }],
  };

  it('con internet se envían de inmediato y no se guarda nada en el teléfono', async () => {
    const { chargeOrders, pendingCount } = cargar();
    fetchMock.mockResolvedValueOnce(respuesta(201, { success: true, data: { status: 'applied' } }));

    const estado = await chargeOrders(cobro);

    expect(estado).toBe('applied');
    const enviado = cuerpo(0);
    expect(enviado.offline).toBe(false);
    expect(enviado.order_ids).toEqual([21]);
    expect(enviado.client_ref).toBe('cobro-prueba-1');
    expect(pendingCount(MESERO)).toBe(0);
    expect(mockDisco.has('waiter-outbox')).toBe(false);
  });

  it('sin red falla con un mensaje claro y no se guarda en el teléfono', async () => {
    const { chargeOrders, CHARGE_NEEDS_CONNECTION } = cargar();
    fetchMock.mockImplementationOnce(sinRed);

    await expect(chargeOrders(cobro)).rejects.toThrow(CHARGE_NEEDS_CONNECTION);
    expect(mockDisco.has('waiter-outbox')).toBe(false);
  });

  it('reintentar la misma cuenta usa la misma referencia, para no cobrar dos veces', async () => {
    const { chargeOrders } = cargar();
    fetchMock.mockImplementationOnce(sinRed).mockResolvedValueOnce(respuesta(201, { success: true, data: { status: 'applied' } }));

    await expect(chargeOrders(cobro)).rejects.toThrow();
    await chargeOrders(cobro);

    expect(cuerpo(1).client_ref).toBe('cobro-prueba-1');
  });

  it('no cobra pedidos que todavía están guardados en el teléfono', async () => {
    const { chargeOrders, CHARGE_NEEDS_SENT_ORDERS } = cargar();

    await expect(chargeOrders({ ...cobro, orders: [{ id: 21 }, { id: null }] })).rejects.toThrow(CHARGE_NEEDS_SENT_ORDERS);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('cola de envío', () => {
  it('envía los pedidos guardados en el orden en que se tomaron', async () => {
    const { placeKitchenOrder, syncOutbox, pendingCount } = cargar();
    await placeKitchenOrder({ tableId: 5, tableNumber: '5', label: 'Persona 1', items: [hamburguesa], owner: MESERO, offline: true });
    await placeKitchenOrder({ tableId: 5, tableNumber: '5', label: 'Persona 2', items: [hamburguesa], owner: MESERO, offline: true });

    fetchMock.mockResolvedValueOnce(respuesta(201)).mockResolvedValueOnce(respuesta(201));
    await syncOutbox(MESERO);

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toMatch(/\/tables\/5\/orders$/);
    expect(cuerpo(0).label).toBe('Persona 1');
    expect(cuerpo(0).offline).toBe(true);
    expect(cuerpo(1).label).toBe('Persona 2');
    expect(pendingCount(MESERO)).toBe(0);
  });

  it('sin red se detiene y conserva todo para el siguiente intento', async () => {
    const { placeKitchenOrder, syncOutbox, pendingCount } = cargar();
    await placeKitchenOrder({ tableId: 5, tableNumber: '5', label: 'Persona 1', items: [hamburguesa], owner: MESERO, offline: true });
    await placeKitchenOrder({ tableId: 5, tableNumber: '5', label: 'Persona 2', items: [hamburguesa], owner: MESERO, offline: true });

    fetchMock.mockImplementation(sinRed);
    await syncOutbox(MESERO);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(pendingCount(MESERO)).toBe(2);
  });

  it('una respuesta que no confirma el registro (p. ej. una página HTML) no saca el pedido de la cola', async () => {
    const { placeKitchenOrder, syncOutbox, pendingCount } = cargar();
    await placeKitchenOrder({ tableId: 5, tableNumber: '5', label: 'Persona 1', items: [hamburguesa], owner: MESERO, offline: true });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'text/html' },
      json: async () => null,
    });
    await syncOutbox(MESERO);

    expect(pendingCount(MESERO)).toBe(1);
    const [pedido] = mockDisco.get('waiter-outbox') as { error: string }[];
    expect(pedido.error).toContain('no confirmó');
  });

  it('lo guardado por un mesero solo lo envía su propia sesión', async () => {
    const { placeKitchenOrder, syncOutbox, pendingCount } = cargar();
    await placeKitchenOrder({ tableId: 5, tableNumber: '5', label: 'Persona 1', items: [hamburguesa], owner: MESERO, offline: true });

    await syncOutbox('otro@la501.test');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(pendingCount(MESERO)).toBe(1);
  });

  it('un pedido rechazado por el servidor se puede descartar; uno en espera de red, no', async () => {
    const { placeKitchenOrder, syncOutbox, discardRejectedOrder, pendingCount } = cargar();
    await placeKitchenOrder({ tableId: 6, tableNumber: '6', label: 'Persona 1', items: [hamburguesa], owner: MESERO, offline: true });
    await placeKitchenOrder({ tableId: 6, tableNumber: '6', label: 'Persona 2', items: [hamburguesa], owner: MESERO, offline: true });

    fetchMock.mockResolvedValueOnce(respuesta(422, { message: 'Datos inválidos.' })).mockImplementation(sinRed);
    await syncOutbox(MESERO);

    const [rechazado, enEspera] = mockDisco.get('waiter-outbox') as { ref: string; error: string | null }[];
    expect(rechazado.error).toBe('Datos inválidos.');
    expect(enEspera.error).toBeNull();
    discardRejectedOrder(rechazado.ref);
    discardRejectedOrder(enEspera.ref);

    expect(pendingCount(MESERO)).toBe(1);
  });
});
