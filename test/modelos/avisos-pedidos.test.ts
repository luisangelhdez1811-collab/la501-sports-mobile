/**
 * Cuándo avisa la app (src/domain/order-notices): al mesero cuando cocina o barra terminan
 * platillos de una mesa, y al cliente un solo aviso («va en camino») cuando su pedido se entrega al repartidor.
 */
import { describe, expect, it } from '@jest/globals';

import { customerNotice, isNoticeUrl, readyNotices, toServeByTable } from '@/domain/order-notices';

describe('avisos al mesero', () => {
  const mesas = [
    { id: 1, number: '1', toServe: 0 },
    { id: 5, number: '5', toServe: 2 },
  ];

  it('la primera revisión no avisa: solo toma el punto de partida', () => {
    expect(readyNotices(null, mesas)).toEqual([]);
  });

  it('avisa solo las mesas con más platillos listos que antes', () => {
    const antes = toServeByTable(mesas);
    const ahora = [
      { id: 1, number: '1', toServe: 1 },
      { id: 5, number: '5', toServe: 1 },
      { id: 9, number: '9', toServe: 3 },
    ];

    const avisos = readyNotices(antes, ahora);

    expect(avisos.map((a) => a.title)).toEqual(['Mesa 1: listo para entregar', 'Mesa 9: listo para entregar']);
    expect(avisos[1].body).toBe('3 platillos o bebidas están listos.');
    expect(avisos[0].url).toBe('/mesa/1?numero=1');
  });
});

describe('avisos al cliente', () => {
  it('no avisa mientras sigue en cocina', () => {
    expect(customerNotice(null, 'pending', 'abc123')).toBeNull();
    expect(customerNotice(null, 'preparing', 'abc123')).toBeNull();
  });

  it('«Listo» todavía no: el pedido sigue en el restaurante', () => {
    expect(customerNotice(null, 'ready', 'abc123')).toBeNull();
  });

  it('un solo aviso «va en camino» cuando se entrega al repartidor', () => {
    expect(customerNotice(null, 'delivering', 'abc123')).toEqual(
      expect.objectContaining({ title: 'Tu pedido va en camino', url: '/pedido/abc123' }),
    );
    expect(customerNotice('delivering', 'delivering', 'abc123')).toBeNull();
    expect(customerNotice('delivering', 'delivered', 'abc123')).toBeNull();
  });

  it('al tocar un aviso solo abre rutas que la app creó', () => {
    expect(isNoticeUrl('/pedido/abc123')).toBe(true);
    expect(isNoticeUrl('/mesa/5?numero=5')).toBe(true);
    expect(isNoticeUrl('https://sitio-falso.com')).toBe(false);
    expect(isNoticeUrl('/admin')).toBe(false);
    expect(isNoticeUrl(42)).toBe(false);
  });
});
