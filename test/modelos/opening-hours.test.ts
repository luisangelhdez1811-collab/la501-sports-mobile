import { describe, expect, it } from '@jest/globals';

import {
  bookingWindow,
  DEFAULT_HOURS,
  formatTime12,
  isBookable,
  parseDayHours,
  parseWeekHours,
} from '@/utils/opening-hours';

describe('horarios y reservaciones', () => {
  it('interpreta horarios en formato 24 h, AM/PM y cerrado', () => {
    expect(parseDayHours('13:00 – 22:30')).toEqual({ open: 780, close: 1350 });
    expect(parseDayHours('1:00 PM - 10:30 PM')).toEqual({ open: 780, close: 1350 });
    expect(parseDayHours('Cerrado')).toBeNull();
  });

  it('maneja horarios que cierran después de medianoche', () => {
    expect(parseDayHours('20:00 - 02:00')).toEqual({ open: 1200, close: 1560 });
  });

  it('arma la semana con los días que manda el servidor', () => {
    const semana = parseWeekHours({ lunes: 'Cerrado', 'miércoles': '14:00 - 23:00' });
    expect(semana[1]).toBeNull();
    expect(semana[3]).toEqual({ open: 840, close: 1380 });
    expect(semana[0]).toEqual(DEFAULT_HOURS[0]);
  });

  it('muestra la hora en formato de 12 horas', () => {
    expect(formatTime12(780)).toBe('1:00 PM');
    expect(formatTime12(0)).toBe('12:00 AM');
  });

  it('solo permite reservar dentro del horario y desde la hora actual', () => {
    const hoy = new Date(2026, 9, 16, 18, 7); // viernes 18:07
    const ventana = bookingWindow(hoy, DEFAULT_HOURS, hoy);
    expect(ventana).toEqual({ from: 18 * 60 + 10, to: 22 * 60 + 30 });
    expect(isBookable('18:00', ventana)).toBe(false);
    expect(isBookable('20:30', ventana)).toBe(true);
    expect(isBookable('23:00', ventana)).toBe(false);
  });
});
