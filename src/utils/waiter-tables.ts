import type { RestaurantTable, TableDetail, TableOrder } from '@/api/waiter';
import type { OutboxCharge, OutboxEntry, OutboxOrder } from '@/data/waiter-outbox';

/**
 * What the waiter sees = the server's last known state + what's saved on the phone and not
 * sent yet. Pure functions so the screens and the tests share the same rules.
 */

export type TableView = RestaurantTable & {
  /** Orders or charges for this table still waiting to reach the server. */
  unsent: number;
};

const roundMoney = (n: number) => Math.round(n * 100) / 100;

function forTable<T extends OutboxEntry>(entries: OutboxEntry[], tableId: number, kind: T['kind']) {
  return entries.filter((e): e is T => e.tableId === tableId && e.kind === kind);
}

function isCovered(order: Pick<TableOrder, 'id' | 'ref'>, charges: OutboxCharge[]) {
  return charges.some(
    (c) => (order.id !== null && c.orderIds.includes(order.id)) || (!!order.ref && c.orderRefs.includes(order.ref)),
  );
}

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

/** The table's open orders: the server's, plus unsent ones, minus those already charged here. */
export function openOrders(detail: TableDetail | null, tableId: number, entries: OutboxEntry[]): TableOrder[] {
  const charges = forTable<OutboxCharge>(entries, tableId, 'charge');
  const fromServer = detail?.orders ?? [];
  const known = new Set(fromServer.map((o) => o.ref).filter(Boolean));
  const unsent = forTable<OutboxOrder>(entries, tableId, 'order')
    // Already sent and back in the server's list: don't show it twice.
    .filter((e) => !known.has(e.ref))
    .map(unsentOrder);
  return [...fromServer, ...unsent].filter((order) => !isCovered(order, charges));
}

/** One table on the map, adjusted for what's pending on the phone. */
export function tableView(table: RestaurantTable, entries: OutboxEntry[]): TableView {
  const orders = forTable<OutboxOrder>(entries, table.id, 'order');
  const charges = forTable<OutboxCharge>(entries, table.id, 'charge');
  const ordersCount = Math.max(
    0,
    table.ordersCount + orders.length - charges.reduce((n, c) => n + c.orderIds.length + c.orderRefs.length, 0),
  );
  const total = Math.max(
    0,
    roundMoney(table.total + orders.reduce((sum, o) => sum + o.total, 0) - charges.reduce((sum, c) => sum + c.total, 0)),
  );
  // Older servers don't send a count: fall back to whether there's money open.
  const open = table.ordersCount > 0 || orders.length > 0 ? ordersCount > 0 : total > 0;
  return {
    ...table,
    ordersCount,
    total: open ? total : 0,
    status: open ? 'ocupada' : 'disponible',
    kitchenPending: open && (table.kitchenPending || orders.length > 0),
    unsent: orders.length + charges.length,
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
