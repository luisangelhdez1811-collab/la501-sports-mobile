/**
 * Modelo del carrito (capa de dominio): reglas puras, sin React ni almacenamiento.
 */
import { describe, expect, it } from '@jest/globals';

import { addItem, cartCount, cartTotal, changeQuantity, MAX_QUANTITY, removeItem } from '@/domain/cart';

import { papas, platillo } from '../fixtures/productos';

const hamburguesa = platillo();
const sinCebolla = { excluded: [{ id: 3, name: 'Cebolla' }] };

describe('modelo del carrito', () => {
  it('agregar el mismo platillo con las mismas opciones suma cantidad en la misma línea', () => {
    const carrito = addItem(addItem([], hamburguesa), hamburguesa);

    expect(carrito).toHaveLength(1);
    expect(carrito[0].quantity).toBe(2);
  });

  it('el mismo platillo con otras opciones es una línea distinta', () => {
    const carrito = addItem(addItem([], hamburguesa), hamburguesa, sinCebolla);

    expect(carrito).toHaveLength(2);
    expect(carrito[1].excluded).toEqual(sinCebolla.excluded);
  });

  it('las notas se limpian y no distinguen mayúsculas al agrupar', () => {
    const carrito = addItem(addItem([], hamburguesa, { notes: '  Sin sal ' }), hamburguesa, { notes: 'sin sal' });

    expect(carrito).toHaveLength(1);
    expect(carrito[0].notes).toBe('Sin sal');
  });

  it('calcula piezas y total estimado', () => {
    const carrito = addItem(addItem(addItem([], hamburguesa), hamburguesa), papas);

    expect(cartCount(carrito)).toBe(3);
    expect(cartTotal(carrito)).toBe(360);
  });

  it('una línea que llega a cero sale del carrito y nunca pasa del máximo', () => {
    const carrito = addItem([], hamburguesa);
    const linea = carrito[0].lineId;

    expect(changeQuantity(carrito, linea, -1)).toEqual([]);
    expect(changeQuantity(carrito, linea, 500)[0].quantity).toBe(MAX_QUANTITY);
    expect(removeItem(carrito, linea)).toEqual([]);
  });

  it('no modifica el carrito original (inmutable)', () => {
    const original = addItem([], hamburguesa);
    const copia = JSON.stringify(original);

    addItem(original, hamburguesa);
    changeQuantity(original, original[0].lineId, 3);

    expect(JSON.stringify(original)).toBe(copia);
  });
});
