import type { OrderStatus } from '@/api/account';

/**
 * When the app shows a notification (domain layer, pure functions): to the waiter, when the
 * kitchen or the bar finishes dishes of one of their tables; to the customer, when the order
 * is handed to the driver ("va en camino"). Each change is announced once.
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

/**
 * What to tell the customer when the order reaches `status`: a single notice, "va en camino",
 * when it's handed to the driver ("Listo" still waits in the restaurant). `lastAnnounced` is
 * the status that was announced (null if none yet); nothing is announced twice.
 */
export function customerNotice(lastAnnounced: OrderStatus | null, status: OrderStatus, token: string): Notice | null {
  if (lastAnnounced || status !== 'delivering') return null;
  return {
    title: 'Tu pedido va en camino',
    body: 'Ya lo lleva el repartidor. Toca para ver el seguimiento.',
    url: `/pedido/${token}`,
  };
}

/** Only routes the app opens from a notification it created itself. */
export function isNoticeUrl(url: unknown): url is string {
  return typeof url === 'string' && /^\/(pedido\/[A-Za-z0-9_-]{6,128}|mesa\/\d+(\?numero=[^&]*)?)$/.test(url);
}
