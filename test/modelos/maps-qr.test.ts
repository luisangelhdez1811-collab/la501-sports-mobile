/**
 * El QR de Maps del ticket (src/domain/maps-qr), el mismo que la web pone bajo el total: el
 * servidor manda sus módulos como renglones de "0" y "1" y la app los dibuja e imprime.
 */
import { describe, expect, it, jest } from '@jest/globals';

import type { Tracking } from '@/api/account';
import { DEFAULT_POLICY } from '@/api/info';
import { ticketHtml } from '@/data/ticket-print';
import { QR_QUIET_ZONE, mapsQrCaption, qrRuns, qrSvg, toQrModules } from '@/domain/maps-qr';

jest.mock('expo-print', () => ({ printAsync: jest.fn() }));

const cuadro = (lado: number, renglon: (y: number) => string) => Array.from({ length: lado }, (_, y) => renglon(y));
const qr21 = cuadro(21, (y) => (y === 0 ? '1111111' + '0'.repeat(14) : '0'.repeat(21)));

const pedido = (extra: Partial<Tracking> = {}): Tracking => ({
  status: 'paid',
  statusLabel: 'Confirmado',
  folio: '12',
  total: 185,
  paymentMethod: 'efectivo',
  canCancel: true,
  refundStatus: null,
  isDelivery: true,
  createdAt: null,
  lines: [],
  customer: { name: 'Ana', phone: '7711234567', address: 'Av. Juárez 12, Col. Centro' },
  maps: { url: 'https://www.google.com/maps/search/?api=1&query=Av.+Ju%C3%A1rez+12', fromAddress: true, modules: qr21 },
  ...extra,
});

describe('QR de Maps del ticket', () => {
  it('acepta solo un QR real: cuadrado, de 21 a 177 módulos y de "0" y "1"', () => {
    expect(toQrModules(qr21)).toEqual(qr21);
    expect(toQrModules(cuadro(25, () => '0'.repeat(25)))).toHaveLength(25);
    expect(toQrModules(cuadro(22, () => '0'.repeat(22)))).toBeNull();
    expect(toQrModules(cuadro(21, () => '0'.repeat(20)))).toBeNull();
    expect(toQrModules(cuadro(21, (y) => (y === 3 ? '2'.repeat(21) : '0'.repeat(21))))).toBeNull();
    expect(toQrModules(qr21.slice(1))).toBeNull();
    expect(toQrModules('1111')).toBeNull();
    expect(toQrModules(null)).toBeNull();
  });

  it('agrupa cada renglón en tramos oscuros y claros', () => {
    expect(qrRuns('1110010')).toEqual([
      { dark: true, length: 3 },
      { dark: false, length: 2 },
      { dark: true, length: 1 },
      { dark: false, length: 1 },
    ]);
    expect(qrRuns('0000')).toEqual([{ dark: false, length: 4 }]);
  });

  it('el SVG para imprimir lleva la zona de silencio y un trazo por tramo oscuro', () => {
    const svg = qrSvg(qr21, 180);
    const lado = 21 + QR_QUIET_ZONE * 2;

    expect(svg).toContain(`viewBox="0 0 ${lado} ${lado}"`);
    expect(svg).toContain(`M${QR_QUIET_ZONE} ${QR_QUIET_ZONE}h7v1h-7z`);
    expect(svg.match(/M/g)).toHaveLength(1);
  });

  it('la leyenda dice si es la ubicación GPS o una búsqueda de la dirección, como en la web', () => {
    expect(mapsQrCaption(true)).toBe('Escanea para buscar tu dirección en Maps');
    expect(mapsQrCaption(false)).toBe('Escanea para abrir la ubicación en Maps');
  });

  it('el ticket impreso lleva el QR solo en pedidos a domicilio que lo traen', () => {
    expect(ticketHtml(pedido(), DEFAULT_POLICY.provider)).toContain('<svg');
    expect(ticketHtml(pedido(), DEFAULT_POLICY.provider)).toContain('Escanea para buscar tu dirección en Maps');
    expect(ticketHtml(pedido({ maps: null }), DEFAULT_POLICY.provider)).not.toContain('<svg');
    expect(ticketHtml(pedido({ isDelivery: false }), DEFAULT_POLICY.provider)).not.toContain('<svg');
  });
});
