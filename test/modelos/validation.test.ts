import { describe, expect, it } from '@jest/globals';

import { isEmail, isPhone, isStrongPassword, normalizePhone, PASSWORD_RULES } from '@/utils/validation';

describe('validación de formularios', () => {
  it('acepta correos válidos y rechaza los incompletos', () => {
    expect(isEmail('cliente@la501.mx')).toBe(true);
    expect(isEmail('  cliente@la501.mx  ')).toBe(true);
    expect(isEmail('cliente@la501')).toBe(false);
    expect(isEmail('cliente.la501.mx')).toBe(false);
    expect(isEmail('')).toBe(false);
  });

  it('normaliza teléfonos de 10 dígitos ignorando espacios y guiones', () => {
    expect(normalizePhone('771 123-45-67')).toBe('7711234567');
    expect(normalizePhone('+52 771 123 4567 99')).toBe('5277112345');
    expect(isPhone('771-123-4567')).toBe(true);
    expect(isPhone('77112345')).toBe(false);
  });

  it('exige contraseña con mayúscula, minúscula, número, símbolo y 8 caracteres', () => {
    expect(isStrongPassword('La501Sports!')).toBe(true);
    expect(isStrongPassword('la501sports!')).toBe(false);
    expect(isStrongPassword('LA501SPORTS!')).toBe(false);
    expect(isStrongPassword('LaSports!!')).toBe(false);
    expect(isStrongPassword('La501Sports')).toBe(false);
    expect(isStrongPassword('La5!s')).toBe(false);
  });

  it('marca exactamente las reglas que no se cumplen', () => {
    const fallidas = PASSWORD_RULES.filter((regla) => !regla.test('abc')).map((regla) => regla.label);
    expect(fallidas).toEqual(['8 caracteres', 'Mayúscula', 'Número', 'Símbolo (!@#$%^&*)']);
  });
});
