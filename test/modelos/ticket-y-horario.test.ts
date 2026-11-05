/**
 * El ticket del pedido igual al de la web (src/domain/order-ticket) y el aviso de horario
 * (src/utils/opening-hours): fuera de horario el pedido se recibe y se prepara al abrir.
 */
import { describe, expect, it, jest } from '@jest/globals';

import type { Tracking } from '@/api/account';
import { DEFAULT_POLICY } from '@/api/info';
import { ticketHtml } from '@/data/ticket-print';
import { optionsSummary, ticketDate, ticketFolio, ticketProgress, ticketSteps } from '@/domain/order-ticket';
import { DEFAULT_HOURS, isOpenNow, nextOpening, todayHours, type WeekHours } from '@/utils/opening-hours';

jest.mock('expo-print', () => ({ printAsync: jest.fn() }));

const estados = (status: Parameters<typeof ticketSteps>[0]) => ticketSteps(status, true).map((s) => s.state);

describe('ticket del pedido', () => {
  it('los tres pasos de la web: Recibido, Cocinado y Entregado al repartidor', () => {
    expect(ticketSteps('paid', true).map((s) => s.label)).toEqual(['Recibido', 'Cocinado', 'Entregado al repartidor']);
    expect(estados('paid')).toEqual(['done', 'active', 'todo']);
    expect(estados('ready')).toEqual(['done', 'done', 'active']);
    expect(estados('delivering')).toEqual(['done', 'done', 'done']);
    expect(ticketSteps('ready', false).map((s) => s.label)).toEqual(['Recibido', 'Cocinado', 'Listo']);
  });

  it('la línea avanza como en la web', () => {
    expect(ticketProgress('paid', true)).toBe(0);
    expect(ticketProgress('preparing', true)).toBe(50);
    expect(ticketProgress('ready', true)).toBe(50);
    expect(ticketProgress('delivered', true)).toBe(100);
  });

  it('folio de 5 dígitos, fecha dd/mm/aaaa hh:mm y opciones agrupadas', () => {
    expect(ticketFolio('8136')).toBe('#08136');
    expect(ticketDate(new Date(2026, 10, 5, 8, 26))).toBe('05/11/2026 08:26 AM');
    expect(ticketDate(new Date(2026, 10, 5, 20, 5))).toBe('05/11/2026 08:05 PM');
    expect(
      optionsSummary([
        { group: 'Salsa', name: 'BBQ', quantity: 1 },
        { group: 'Salsa', name: 'Ranch', quantity: 2 },
        { group: 'Término', name: 'Medio', quantity: 1 },
      ]),
    ).toBe('Salsa: BBQ, 2x Ranch · Término: Medio');
  });

  it('lo que imprime no se interpreta como HTML', () => {
    const pedido: Tracking = {
      status: 'paid',
      statusLabel: 'Confirmado',
      folio: '8136',
      total: 160,
      paymentMethod: 'efectivo',
      canCancel: true,
      refundStatus: null,
      isDelivery: true,
      createdAt: new Date(2026, 10, 5, 8, 26),
      lines: [{ name: '<script>x</script>Burrito', quantity: 1, subtotal: 160, options: '', excluded: [], notes: '' }],
      customer: { name: 'Angel', phone: '7710000000', address: 'Mirador' },
    };

    const html = ticketHtml(pedido, DEFAULT_POLICY.provider);

    expect(html).toContain('#08136');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
});

describe('horario de servicio', () => {
  // Diario de 13:00 a 22:30; los domingos cerrado.
  const semana: WeekHours = DEFAULT_HOURS.map((h, dia) => (dia === 0 ? null : h));
  const jueves = (h: number, m = 0) => new Date(2026, 10, 5, h, m);

  it('abierto dentro del horario: no hay aviso de cerrado', () => {
    expect(isOpenNow(semana, jueves(14))).toBe(true);
    expect(nextOpening(semana, jueves(14))).toBeNull();
    expect(todayHours(semana, jueves(14))).toBe('hoy de 1:00 PM a 10:30 PM');
  });

  it('antes de abrir: hoy a la 1; después de cerrar: mañana', () => {
    expect(nextOpening(semana, jueves(8, 30))).toBe('hoy a la 1:00 PM');
    expect(nextOpening(semana, jueves(23))).toBe('mañana a la 1:00 PM');
  });

  it('el sábado en la noche salta el domingo cerrado', () => {
    expect(nextOpening(semana, new Date(2026, 10, 7, 23))).toBe('el lunes a la 1:00 PM');
  });

  it('un día que cierra después de medianoche sigue abierto de madrugada', () => {
    const tarde: WeekHours = DEFAULT_HOURS.map(() => ({ open: 18 * 60, close: 26 * 60 }));
    expect(isOpenNow(tarde, jueves(1))).toBe(true);
    expect(nextOpening(tarde, jueves(3))).toBe('hoy a las 6:00 PM');
  });
});
