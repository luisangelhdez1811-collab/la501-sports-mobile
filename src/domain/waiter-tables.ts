import type { RestaurantTable, TableDetail, TableOrder } from '@/api/waiter';
import type { OutboxOrder } from '@/data/waiter-outbox';

/**
 * What the waiter sees = the server's last known state + the orders saved on the phone and
 * not sent yet. Pure functions so the screens and the tests share the same rules.
 */

export type TableView = RestaurantTable & {
  /** Orders for this table still waiting to reach the server. */
  unsent: number;
};

const roundMoney = (n: number) => Math.round(n * 100) / 100;

const forTable = (entries: OutboxOrder[], tableId: number) => entries.filter((e) => e.tableId === tableId);

export function unsentOrder(entry: OutboxOrder): TableOrder {
  return {
    id: null,
    ref: entry.ref,
    label: entry.label,
    total: entry.total,
    kitchenPending: true,
    unsent: true,
    items: entry.items.map((item) => ({ name: item.name, quantity: item.quantity, price: item.price, notes: item.notes })),
  };
}

/** The table's open orders: the server's, plus the ones saved on the phone. */
export function openOrders(detail: TableDetail | null, tableId: number, entries: OutboxOrder[]): TableOrder[] {
  const fromServer = detail?.orders ?? [];
  const known = new Set(fromServer.map((o) => o.ref).filter(Boolean));
  const unsent = forTable(entries, tableId)
    // Already sent and back in the server's list: don't show it twice.
    .filter((e) => !known.has(e.ref))
    .map(unsentOrder);
  return [...fromServer, ...unsent];
}

/** One table on the map, adjusted for the orders saved on the phone. */
export function tableView(table: RestaurantTable, entries: OutboxOrder[]): TableView {
  const orders = forTable(entries, table.id);
  const total = roundMoney(table.total + orders.reduce((sum, o) => sum + o.total, 0));
  // Older servers don't send a count: fall back to whether there's money open.
  const open = table.ordersCount > 0 || orders.length > 0 || total > 0;
  return {
    ...table,
    ordersCount: table.ordersCount + orders.length,
    total: open ? total : 0,
    status: open ? 'ocupada' : 'disponible',
    kitchenPending: open && (table.kitchenPending || orders.length > 0),
    unsent: orders.length,
  };
}

export type TablesSummary = { busy: number; free: number; openTotal: number };

export function summarize(tables: TableView[]): TablesSummary {
  const busy = tables.filter((t) => t.status === 'ocupada');
  return {
    busy: busy.length,
    free: tables.length - busy.length,
    openTotal: roundMoney(busy.reduce((sum, t) => sum + t.total, 0)),
  };
}

/** "Persona 3" for the next diner, after the ones the table already has. */
export function nextDinerLabel(orders: Pick<TableOrder, 'label'>[]) {
  const taken = orders
    .map((o) => /^persona (\d+)$/i.exec(o.label.trim())?.[1])
    .filter((n): n is string => !!n)
    .map(Number);
  const next = Math.max(orders.length, ...taken) + 1;
  return `Persona ${next}`;
}
