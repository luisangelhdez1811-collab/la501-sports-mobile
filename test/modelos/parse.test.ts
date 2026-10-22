import { describe, expect, it } from '@jest/globals';

import { asArray, asHttpsUrl, asId, asNumber, asObject, asString, pick, unwrap } from '@/api/parse';

describe('lectura segura de respuestas del servidor', () => {
  it('convierte textos y números sin romper con valores inesperados', () => {
    expect(asString('  Hamburguesa  ')).toBe('Hamburguesa');
    expect(asString(150)).toBe('150');
    expect(asString(null, 'sin nombre')).toBe('sin nombre');
    expect(asNumber('89.50')).toBe(89.5);
    expect(asNumber('abc')).toBe(0);
    expect(asId('12')).toBe(12);
    expect(asId('doce')).toBeNull();
  });

  it('solo acepta objetos planos', () => {
    expect(asObject({ a: 1 })).toEqual({ a: 1 });
    expect(asObject([1, 2])).toBeNull();
    expect(asObject('texto')).toBeNull();
  });

  it('solo acepta URLs https para imágenes', () => {
    expect(asHttpsUrl('https://cdn.la501.mx/a.png')).toBe('https://cdn.la501.mx/a.png');
    expect(asHttpsUrl('http://cdn.la501.mx/a.png')).toBeNull();
    expect(asHttpsUrl('javascript:alert(1)')).toBeNull();
  });

  it('extrae listas en los formatos que manda Laravel', () => {
    expect(asArray([1, 2])).toEqual([1, 2]);
    expect(asArray({ data: [1, 2] })).toEqual([1, 2]);
    expect(asArray({ data: { data: [1, 2], current_page: 1 } })).toEqual([1, 2]);
    expect(asArray({ mensaje: 'sin datos' })).toEqual([]);
  });

  it('desenvuelve { data: {...} } y elige el primer campo disponible', () => {
    expect(unwrap({ data: { id: 1 } })).toEqual({ id: 1 });
    expect(unwrap({ id: 2 })).toEqual({ id: 2 });
    expect(pick({ nombre: 'Alitas', name: null }, 'name', 'nombre')).toBe('Alitas');
  });
});
