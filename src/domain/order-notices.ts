import type { OrderStatus } from '@/api/account';

/**
 * When the app shows a notification (domain layer, pure functions): to the waiter, when the
 * kitchen or the bar finishes dishes of one of their tables; to the customer, when the order
 * leaves the kitchen. Each change is announced once.
 */

export type Notice = { title: string; body: string; url: string };

type TableCount = { id: number; number: string; toServe: number };

/**
 * Tables with more dishes to take than at the last look. The first look only sets the
 * starting point (`previous` null): opening the app doesn't repeat old news.
 */
export function readyNotices(previous: Map<number, number> | null, tables: TableCount[]): Notice[] {
  if (!previous) return [];
  return tables.flatMap((table) => {
    const added = table.toServe - (previous.get(table.id) ?? 0);
    if (added <= 0) return [];
    return [
      {
        title: `Mesa ${table.number}: listo para entregar`,
        body: added === 1 ? 'Un platillo o bebida está listo.' : `${added} platillos o bebidas están listos.`,
        url: `/mesa/${table.id}?numero=${encodeURIComponent(table.number)}`,
      },
    ];
  });
}

export const toServeByTable = (tables: TableCount[]) => new Map(tables.map((t) => [t.id, t.toServe]));

// The customer is told about these steps, in this order.
const ANNOUNCED: OrderStatus[] = ['ready', 'delivering'];

const CUSTOMER_TEXT: Partial<Record<OrderStatus, { title: string; body: string }>> = {
  ready: { title: 'Tu pedido salió de cocina', body: 'Está listo y pronto va en camino.' },
  delivering: { title: 'Tu pedido va en camino', body: 'El repartidor ya lo lleva a tu domicilio.' },
};

/**
 * What to tell the customer when the order reaches `status`, given the last step already
 * announced. Steps are never announced twice nor backwards; skipping "Listo" straight to
 * "En camino" announces only "En camino".
 */
export function customerNotice(lastAnnounced: OrderStatus | null, status: OrderStatus, token: string): Notice | null {
  const step = ANNOUNCED.indexOf(status);
  if (step === -1 || step <= (lastAnnounced ? ANNOUNCED.indexOf(lastAnnounced) : -1)) return null;
  const text = CUSTOMER_TEXT[status]!;
  return { ...text, url: `/pedido/${token}` };
}

/** Only routes the app opens from a notification it created itself. */
export function isNoticeUrl(url: unknown): url is string {
  return typeof url === 'string' && /^\/(pedido\/[A-Za-z0-9_-]{6,128}|mesa\/\d+(\?numero=[^&]*)?)$/.test(url);
}
