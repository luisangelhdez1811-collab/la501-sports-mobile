/**
 * Patrón Factory: createBills arma las cuentas a cobrar según cómo paga la mesa.
 */
import { describe, expect, it } from '@jest/globals';

import type { TableOrder } from '@/api/waiter';
import { coversTable, createBills, orderKey } from '@/domain/bills';

const pedido = (id: number, label: string, total: number): TableOrder => ({
  id,
  ref: null,
  label,
  total,
  kitchenPending: false,
  items: [],
});

const mesa = [pedido(1, 'Persona 1', 150.5), pedido(2, 'Persona 2', 99.25), pedido(3, 'Ana', 80)];

describe('fábrica de cuentas', () => {
  it('"junto": una sola cuenta con todos los pedidos', () => {
    const [cuenta, ...resto] = createBills(mesa, { mode: 'junto' });

    expect(resto).toEqual([]);
    expect(cuenta.label).toBe('Mesa completa');
    expect(cuenta.orders).toHaveLength(3);
    expect(cuenta.total).toBe(329.75);
    expect(coversTable([cuenta], mesa)).toBe(true);
  });

  it('"separado": una cuenta por comensal, en el orden en que pidieron', () => {
    const cuentas = createBills(mesa, { mode: 'separado' });

    expect(cuentas.map((c) => [c.label, c.total])).toEqual([
      ['Persona 1', 150.5],
      ['Persona 2', 99.25],
      ['Ana', 80],
    ]);
  });

  it('"una": solo la cuenta de esa persona; el resto de la mesa sigue abierta', () => {
    const cuentas = createBills(mesa, { mode: 'una', key: orderKey(mesa[2]) });

    expect(cuentas).toHaveLength(1);
    expect(cuentas[0].label).toBe('Ana');
    expect(coversTable(cuentas, mesa)).toBe(false);
  });

  it('identifica un pedido por su referencia del teléfono o, si no tiene, por su id', () => {
    expect(orderKey({ id: 5, ref: 'pedido-abc' })).toBe('pedido-abc');
    expect(orderKey({ id: 5, ref: null })).toBe('5');
  });

  it('una mesa sin pedidos no genera cuentas', () => {
    expect(createBills([], { mode: 'junto' })).toEqual([]);
  });
});
