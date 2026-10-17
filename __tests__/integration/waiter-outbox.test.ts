/**
 * Pruebas de integración del trabajo del mesero sin conexión: acciones + cola de envío +
 * cliente HTTP, con fetch y el almacenamiento del teléfono simulados.
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

describe('cobros sin conexión', () => {
  it('se guardan sin la contraseña y se envían marcados como offline al volver el internet', async () => {
    const { chargeOrders, syncOutbox, pendingCount } = cargar();

    const resultado = await chargeOrders({
      tableId: 4,
      tableNumber: '4',
      label: 'Mesa completa',
      orders: [{ id: 21, ref: null, total: 300 }],
      payments: [{ method: 'efectivo', amount: 300 }],
      owner: MESERO,
      offline: true,
      forced: { reason: 'Cocina sin sistema', password: 'secreta' },
    });

    expect(resultado).toEqual({ delivery: 'saved' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(JSON.stringify(mockDisco.get('waiter-outbox'))).not.toContain('secreta');

    fetchMock.mockResolvedValueOnce(respuesta(201, { success: true, data: { status: 'applied' } }));
    await syncOutbox(MESERO);

    const enviado = cuerpo(0);
    expect(enviado.offline).toBe(true);
    expect(enviado.order_ids).toEqual([21]);
    expect(enviado.client_ref).toMatch(/^cobro-/);
    expect(enviado.password).toBeNull();
    expect(pendingCount(MESERO)).toBe(0);
  });

  it('un cobro que el servidor marca para revisión avisa al mesero', async () => {
    const { chargeOrders, syncOutbox, pendingCount, outboxSnapshot } = cargar();
    await chargeOrders({
      tableId: 4,
      tableNumber: '4',
      label: 'Mesa completa',
      orders: [{ id: 21, ref: null, total: 300 }],
      payments: [{ method: 'efectivo', amount: 300 }],
      owner: MESERO,
      offline: true,
    });

    fetchMock.mockResolvedValueOnce(respuesta(201, { success: true, data: { status: 'conflict' } }));
    await syncOutbox(MESERO);

    expect(pendingCount(MESERO)).toBe(0);
    const avisos = outboxSnapshot().notices;
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain('mesa 4');
    expect(avisos[0]).toContain('revisión del administrador');
  });
});

describe('cola de envío', () => {
  it('envía en orden: primero el pedido y después el cobro que lo paga', async () => {
    const { placeKitchenOrder, chargeOrders, syncOutbox, pendingCount } = cargar();
    await placeKitchenOrder({ tableId: 5, tableNumber: '5', label: 'Persona 1', items: [hamburguesa], owner: MESERO, offline: true });
    const pedido = (mockDisco.get('waiter-outbox') as { ref: string }[])[0];
    await chargeOrders({
      tableId: 5,
      tableNumber: '5',
      label: 'Persona 1',
      orders: [{ id: null, ref: pedido.ref, total: 300 }],
      payments: [{ method: 'tarjeta', amount: 300 }],
      owner: MESERO,
      offline: true,
    });

    fetchMock
      .mockResolvedValueOnce(respuesta(201))
      .mockResolvedValueOnce(respuesta(201, { success: true, data: { status: 'applied' } }));
    await syncOutbox(MESERO);

    const [urlPedido] = fetchMock.mock.calls[0] as [string];
    const [urlCobro] = fetchMock.mock.calls[1] as [string];
    expect(urlPedido).toMatch(/\/tables\/5\/orders$/);
    expect(urlCobro).toMatch(/\/tables\/5\/charge$/);
    expect(cuerpo(1).order_refs).toEqual([pedido.ref]);
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

  it('un pedido rechazado por el servidor se puede descartar, un cobro no', async () => {
    const { placeKitchenOrder, chargeOrders, syncOutbox, discardRejectedOrder, pendingCount } = cargar();
    await placeKitchenOrder({ tableId: 6, tableNumber: '6', label: 'Persona 1', items: [hamburguesa], owner: MESERO, offline: true });
    await chargeOrders({
      tableId: 6,
      tableNumber: '6',
      label: 'Mesa completa',
      orders: [{ id: 30, ref: null, total: 150 }],
      payments: [{ method: 'efectivo', amount: 150 }],
      owner: MESERO,
      offline: true,
    });

    fetchMock
      .mockResolvedValueOnce(respuesta(422, { message: 'Datos inválidos.' }))
      .mockResolvedValueOnce(respuesta(422, { message: 'Datos inválidos.' }));
    await syncOutbox(MESERO);

    const [pedido, cobro] = mockDisco.get('waiter-outbox') as { ref: string; error: string }[];
    expect(pedido.error).toBe('Datos inválidos.');
    discardRejectedOrder(pedido.ref);
    discardRejectedOrder(cobro.ref);

    expect(pendingCount(MESERO)).toBe(1);
  });
});
