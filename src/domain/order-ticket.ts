import type { OrderStatus } from '@/api/account';

/**
 * The order ticket, the same as the website's (pedido_confirmacion): three steps, the folio
 * with five digits, the date as dd/mm/aaaa hh:mm AM and each line's options. Pure functions.
 */

export type TicketOption = { group: string; name: string; quantity: number };

export type StepState = 'done' | 'active' | 'todo';
export type TicketStep = { label: string; state: StepState };

/** Under the total, as on the website: the price never includes the delivery. */
export const TICKET_FEE_NOTE =
  'Este total es solo del platillo. El envío lo cobra el repartidor por separado al entregarte tu pedido.';

const COOKED: OrderStatus[] = ['ready', 'delivering', 'delivered'];
const WITH_DRIVER: OrderStatus[] = ['delivering', 'delivered'];
const IN_KITCHEN: OrderStatus[] = ['pending', 'paid', 'preparing'];

/**
 * Recibido (always done) · Cocinado (the kitchen marked it ready) · Entregado al repartidor
 * (home delivery) or Listo (eat in, the last step).
 */
export function ticketSteps(status: OrderStatus, isDelivery: boolean): TicketStep[] {
  const cooked: StepState = COOKED.includes(status) ? 'done' : IN_KITCHEN.includes(status) ? 'active' : 'todo';
  const last: TicketStep = isDelivery
    ? {
        label: 'Entregado al repartidor',
        state: WITH_DRIVER.includes(status) ? 'done' : status === 'ready' ? 'active' : 'todo',
      }
    : { label: 'Listo', state: status === 'ready' ? 'active' : 'todo' };
  return [{ label: 'Recibido', state: 'done' }, { label: 'Cocinado', state: cooked }, last];
}

/** How much of the line between the steps is filled, in percent. */
export function ticketProgress(status: OrderStatus, isDelivery: boolean): 0 | 50 | 100 {
  if (isDelivery && WITH_DRIVER.includes(status)) return 100;
  if (!isDelivery && status === 'ready') return 100;
  if (status === 'preparing' || status === 'ready') return 50;
  return 0;
}

/** "8136" → "#08136", like the website. */
export function ticketFolio(folio: string) {
  return /^\d+$/.test(folio) ? `#${folio.padStart(5, '0')}` : `#${folio}`;
}

/** 5 nov 2026, 8:26 → "05/11/2026 08:26 AM", like the website. */
export function ticketDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const hours = date.getHours();
  const time = `${pad(hours % 12 || 12)}:${pad(date.getMinutes())} ${hours < 12 ? 'AM' : 'PM'}`;
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${time}`;
}

/** "Salsa: BBQ, 2x Ranch · Término: Medio", grouped as the website shows it. */
export function optionsSummary(options: TicketOption[]) {
  const groups = new Map<string, string[]>();
  for (const option of options) {
    const name = option.quantity > 1 ? `${option.quantity}x ${option.name}` : option.name;
    groups.set(option.group, [...(groups.get(option.group) ?? []), name]);
  }
  return [...groups].map(([group, names]) => (group ? `${group}: ${names.join(', ')}` : names.join(', '))).join(' · ');
}
