/**
 * Cuándo avisa la app (src/domain/order-notices): al mesero cuando cocina o barra terminan
 * platillos de una mesa, y al cliente cuando su pedido sale de cocina. Cada cambio, una vez.
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
  it('avisa cuando sale de cocina y cuando va en camino, una vez cada uno', () => {
    expect(customerNotice(null, 'preparing', 'abc123')).toBeNull();
    expect(customerNotice(null, 'ready', 'abc123')?.title).toBe('Tu pedido salió de cocina');
    expect(customerNotice('ready', 'ready', 'abc123')).toBeNull();
    expect(customerNotice('ready', 'delivering', 'abc123')?.title).toBe('Tu pedido va en camino');
    expect(customerNotice('delivering', 'ready', 'abc123')).toBeNull();
  });

  it('si salta de «Listo» a «En camino», solo avisa «En camino»', () => {
    expect(customerNotice(null, 'delivering', 'abc123')).toEqual(
      expect.objectContaining({ title: 'Tu pedido va en camino', url: '/pedido/abc123' }),
    );
  });

  it('al tocar un aviso solo abre rutas que la app creó', () => {
    expect(isNoticeUrl('/pedido/abc123')).toBe(true);
    expect(isNoticeUrl('/mesa/5?numero=5')).toBe(true);
    expect(isNoticeUrl('https://sitio-falso.com')).toBe(false);
    expect(isNoticeUrl('/admin')).toBe(false);
    expect(isNoticeUrl(42)).toBe(false);
  });
});
