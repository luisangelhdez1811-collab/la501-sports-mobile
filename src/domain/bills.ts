import type { TableOrder } from '@/api/waiter';

/**
 * Bills of a table (domain layer). Factory pattern: `createBills` builds the bills to
 * charge from the way the table pays, so the screen never decides how money is grouped.
 */

/** What gets paid in one go: the whole table, or one diner's order. */
export type Bill = { label: string; orders: TableOrder[]; total: number };

/**
 * - `junto`: one bill with every order ("Mesa completa").
 * - `separado`: one bill per diner, in the order they ordered.
 * - `una`: only the diner whose order key is given (see `orderKey`).
 */
export type PaymentMode = { mode: 'junto' } | { mode: 'separado' } | { mode: 'una'; key: string };

/** Identifies one diner's order across reloads (phone reference, else server id). */
export const orderKey = (order: Pick<TableOrder, 'id' | 'ref'>) => order.ref ?? String(order.id);

const roundMoney = (n: number) => Math.round(n * 100) / 100;

export const ordersTotal = (orders: Pick<TableOrder, 'total'>[]) => roundMoney(orders.reduce((sum, o) => sum + o.total, 0));

const billFor = (label: string, orders: TableOrder[]): Bill => ({ label, orders, total: ordersTotal(orders) });

export function createBills(orders: TableOrder[], payment: PaymentMode): Bill[] {
  switch (payment.mode) {
    case 'junto':
      return orders.length > 0 ? [billFor('Mesa completa', orders)] : [];
    case 'separado':
      return orders.map((order) => billFor(order.label, [order]));
    case 'una':
      return orders.filter((order) => orderKey(order) === payment.key).map((order) => billFor(order.label, [order]));
  }
}

/** Whether charging these bills leaves nothing open at the table. */
export const coversTable = (bills: Bill[], orders: TableOrder[]) =>
  bills.reduce((n, bill) => n + bill.orders.length, 0) >= orders.length;
