/**
 * El pedido que el mesero toma para un comensal (src/domain/waiter-order): el mismo platillo
 * con las mismas opciones se junta en una línea; con otras opciones, va aparte.
 */
import { describe, expect, it } from '@jest/globals';

import { EMPTY_SELECTION } from '@/domain/menu-options';
import {
  addChoice,
  chosenCount,
  customization,
  linesCount,
  linesTotal,
  MAX_QUANTITY,
  removeOneOf,
  updateLine,
  type DishChoice,
} from '@/domain/waiter-order';

import { papas, platillo } from '../fixtures/productos';

const hamburguesa = platillo();
const eleccion = (datos: Partial<DishChoice> = {}): DishChoice => ({
  excluded: [],
  notes: '',
  quantity: 1,
  selection: EMPTY_SELECTION,
  ...datos,
});

describe('pedido de un comensal', () => {
  it('junta el mismo platillo con las mismas opciones y separa si cambian', () => {
    let lineas = addChoice([], 1, hamburguesa, eleccion());
    lineas = addChoice(lineas, 2, hamburguesa, eleccion({ quantity: 2 }));
    lineas = addChoice(lineas, 3, hamburguesa, eleccion({ excluded: [{ id: 4, name: 'Cebolla' }] }));
    lineas = addChoice(lineas, 4, papas, eleccion());

    expect(lineas.map((l) => [l.id, l.quantity])).toEqual([
      [1, 3],
      [3, 1],
      [4, 1],
    ]);
    expect(chosenCount(lineas, hamburguesa.key)).toBe(4);
    expect(linesCount(lineas)).toBe(5);
    expect(linesTotal(lineas)).toBe(4 * 150 + 60);
  });

  it('no pasa del máximo por línea', () => {
    const lineas = addChoice(addChoice([], 1, papas, eleccion({ quantity: 40 })), 2, papas, eleccion({ quantity: 40 }));
    expect(lineas[0].quantity).toBe(MAX_QUANTITY);
  });

  it('«−» quita uno de la línea más reciente y la borra en cero', () => {
    let lineas = addChoice([], 1, hamburguesa, eleccion());
    lineas = addChoice(lineas, 2, hamburguesa, eleccion({ notes: 'Bien cocida' }));

    lineas = removeOneOf(lineas, hamburguesa.key);
    expect(lineas.map((l) => l.id)).toEqual([1]);
    expect(removeOneOf(lineas, 'no-existe')).toBe(lineas);
  });

  it('editar cambia las opciones de esa línea y la cocina lee qué lleva', () => {
    const lineas = updateLine(addChoice([], 1, hamburguesa, eleccion()), 1, eleccion({
      excluded: [{ id: 4, name: 'Cebolla' }],
      notes: ' Bien cocida ',
    }));

    expect(customization(lineas[0])).toBe('Sin cebolla · Bien cocida');
  });
});
