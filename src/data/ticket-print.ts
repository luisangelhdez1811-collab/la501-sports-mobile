import * as Print from 'expo-print';

import type { Tracking } from '@/api/account';
import type { Provider } from '@/api/info';
import { formatMoney } from '@/domain/money';
import { TICKET_FEE_NOTE, ticketDate, ticketFolio } from '@/domain/order-ticket';

/** Everything printed comes from the server or the customer: never trusted as HTML. */
const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const row = (label: string, value: string) =>
  value ? `<tr><td class="label">${escape(label)}</td><td class="value">${escape(value)}</td></tr>` : '';

/** The ticket as a printable page: the same parts as the website's printed ticket. */
export function ticketHtml(tracking: Tracking, provider: Provider) {
  const lines = tracking.lines
    .map((line) => {
      const extras = [
        line.options,
        line.excluded.length ? `Sin: ${line.excluded.join(', ')}` : '',
        line.notes ? `Nota: ${line.notes}` : '',
      ]
        .filter(Boolean)
        .map((text) => `<div class="extra">${escape(text)}</div>`)
        .join('');
      return `<tr><td><b>${line.quantity}x</b> ${escape(line.name)}${extras}</td><td class="value">${escape(
        formatMoney(line.subtotal),
      )}</td></tr>`;
    })
    .join('');
  const sold = [provider.name, provider.owner, provider.address, `Tel. ${provider.phone}`, provider.rfc ? `RFC ${provider.rfc}` : '']
    .filter(Boolean)
    .join(' · ');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { margin: 24px; }
  body { font-family: Helvetica, Arial, sans-serif; color: #111; font-size: 13px; max-width: 420px; margin: 0 auto; }
  h1 { font-size: 22px; text-align: center; letter-spacing: 2px; margin: 4px 0; }
  .sub { text-align: center; color: #555; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 4px 0; vertical-align: top; }
  .label { color: #555; }
  .value { text-align: right; white-space: nowrap; padding-left: 8px; }
  .items { border-top: 1px dashed #999; margin-top: 10px; padding-top: 6px; }
  .extra { color: #555; font-size: 12px; }
  .total { border-top: 2px dashed #111; margin-top: 8px; font-size: 18px; font-weight: bold; }
  .note, .provider { color: #555; font-size: 11px; text-align: center; margin-top: 12px; }
</style></head><body>
  <h1>TICKET DE PEDIDO</h1>
  <div class="sub">¡Gracias por elegir La 501 Sports Restaurant!</div>
  <table>
    ${row('Folio de pedido:', tracking.folio ? ticketFolio(tracking.folio) : '')}
    ${row('Cliente:', tracking.customer.name)}
    ${row('Teléfono:', tracking.customer.phone)}
    ${row('Dirección:', tracking.customer.address)}
    ${row('Fecha:', tracking.createdAt ? ticketDate(tracking.createdAt) : '')}
    ${row('Método de pago:', tracking.paymentMethod === 'tarjeta' ? 'Tarjeta' : tracking.paymentMethod === 'efectivo' ? 'Efectivo' : '')}
  </table>
  <table class="items">${lines}</table>
  <table class="total"><tr><td>TOTAL DEL PEDIDO</td><td class="value">${escape(formatMoney(tracking.total))}</td></tr></table>
  <div class="note">${escape(TICKET_FEE_NOTE)}</div>
  <div class="provider">Vende: ${escape(sold)}</div>
</body></html>`;
}

/**
 * Opens the system print window (print or save as PDF). On Android it resolves as soon as
 * the window shows, even if the customer closes it.
 */
export async function printTicket(tracking: Tracking, provider: Provider) {
  await Print.printAsync({ html: ticketHtml(tracking, provider) });
}
