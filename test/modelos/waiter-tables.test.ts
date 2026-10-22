import { describe, expect, it } from '@jest/globals';

import type { RestaurantTable, TableDetail } from '@/api/waiter';
import type { OutboxOrder } from '@/data/waiter-outbox';
import { nextDinerLabel, openOrders, summarize, tableView } from '@/domain/waiter-tables';

const mesa = (datos: Partial<RestaurantTable> = {}): RestaurantTable => ({
  id: 3,
  number: '3',
  status: 'disponible',
  total: 0,
  kitchenPending: false,
  ordersCount: 0,
  ...datos,
});

const base = { tableId: 3, tableNumber: '3', createdAt: '2026-10-17T20:00:00Z', owner: 'mesero@la501.test', attempts: 0, error: null };

const pedidoGuardado = (ref: string, total: number, label = 'Persona 1'): OutboxOrder => ({
  ...base,
  ref,
  label,
  total,
  items: [{ productId: 1, name: 'Hamburguesa', price: total, quantity: 1, excluded: [], notes: '' }],
});

describe('mesas del mesero con lo guardado sin conexión', () => {
  it('una mesa libre se ve ocupada con un pedido guardado en el teléfono', () => {
    const vista = tableView(mesa(), [pedidoGuardado('pedido-1', 150)]);

    expect(vista.status).toBe('ocupada');
    expect(vista.total).toBe(150);
    expect(vista.unsent).toBe(1);
  });

  it('suma los pedidos guardados a lo que la mesa ya tenía en el servidor', () => {
    const servidor = mesa({ status: 'ocupada', total: 300, ordersCount: 2 });
    const vista = tableView(servidor, [pedidoGuardado('pedido-1', 120), pedidoGuardado('pedido-2', 80, 'Persona 4')]);

    expect(vista.status).toBe('ocupada');
    expect(vista.total).toBe(500);
    expect(vista.ordersCount).toBe(4);
    expect(vista.unsent).toBe(2);
  });

  it('ignora lo guardado de otras mesas', () => {
    const otra = { ...pedidoGuardado('pedido-9', 99), tableId: 8 };
    expect(tableView(mesa(), [otra]).status).toBe('disponible');
  });
});

describe('cuentas abiertas de una mesa', () => {
  const detalle: TableDetail = {
    ...mesa({ status: 'ocupada', total: 270, ordersCount: 2 }),
    orders: [
      { id: 10, ref: 'pedido-a', label: 'Persona 1', total: 150, kitchenPending: false, items: [] },
      { id: 11, ref: null, label: 'Persona 2', total: 120, kitchenPending: true, items: [] },
    ],
  };

  it('junta las del servidor con las guardadas, en orden', () => {
    const cuentas = openOrders(detalle, 3, [pedidoGuardado('pedido-b', 80, 'Persona 3')]);

    expect(cuentas.map((c) => c.label)).toEqual(['Persona 1', 'Persona 2', 'Persona 3']);
    expect(cuentas[2].unsent).toBe(true);
  });

  it('no repite un pedido que ya llegó al servidor', () => {
    expect(openOrders(detalle, 3, [pedidoGuardado('pedido-a', 150)])).toHaveLength(2);
  });
});

describe('resumen y comensales', () => {
  it('cuenta mesas ocupadas, libres y lo que falta por cobrar', () => {
    const resumen = summarize([
      { ...mesa({ id: 1, status: 'ocupada', total: 150.5 }), unsent: 0 },
      { ...mesa({ id: 2, status: 'ocupada', total: 99.5 }), unsent: 0 },
      { ...mesa({ id: 3 }), unsent: 0 },
    ]);

    expect(resumen).toEqual({ busy: 2, free: 1, openTotal: 250 });
  });

  it('propone el siguiente comensal después de los que ya tiene la mesa', () => {
    expect(nextDinerLabel([])).toBe('Persona 1');
    expect(nextDinerLabel([{ label: 'Persona 1' }, { label: 'Ana' }])).toBe('Persona 3');
    expect(nextDinerLabel([{ label: 'Persona 4' }])).toBe('Persona 5');
  });
});
