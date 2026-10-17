import { ApiError } from '@/api/client';
import { chargeTable, sendToKitchen, type ChargeStatus, type Payment, type TableOrder } from '@/api/waiter';
import { enqueue, newRef, type OutboxItem } from '@/data/waiter-outbox';

/**
 * The two things a waiter does that must never get lost: sending an order to the kitchen
 * and charging. With a connection they go straight to the server; without one (or if the
 * connection drops mid-request) they're saved in the outbox and sent later.
 */

type Table = { tableId: number; tableNumber: string };

/** "sent": the server has it. "saved": on the phone, waiting for a connection. */
export type Delivery = 'sent' | 'saved';

const noConnection = (err: unknown) => err instanceof ApiError && err.status === 0;

export async function placeKitchenOrder(
  input: Table & { label: string; items: OutboxItem[]; owner: string; offline: boolean },
): Promise<Delivery> {
  const ref = newRef('pedido');
  const createdAt = new Date().toISOString();
  const total = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const save = () => {
    enqueue({
      kind: 'order',
      ref,
      tableId: input.tableId,
      tableNumber: input.tableNumber,
      label: input.label,
      items: input.items,
      total,
      createdAt,
      owner: input.owner,
    });
    return 'saved' as const;
  };

  if (input.offline) return save();
  try {
    await sendToKitchen(input.tableId, { items: input.items, label: input.label, clientRef: ref, offline: false, createdAt });
    return 'sent';
  } catch (err) {
    // It may have reached the server before the connection dropped: the same reference
    // makes the later retry harmless.
    if (noConnection(err)) return save();
    throw err;
  }
}

export type ChargeOutcome = { delivery: 'sent'; status: ChargeStatus } | { delivery: 'saved' };

export async function chargeOrders(
  input: Table & {
    /** "Mesa completa" or the diner being charged. */
    label: string;
    orders: Pick<TableOrder, 'id' | 'ref' | 'total'>[];
    payments: Payment[];
    owner: string;
    offline: boolean;
    forced?: { reason: string; password: string };
  },
): Promise<ChargeOutcome> {
  const ref = newRef('cobro');
  const chargedAt = new Date().toISOString();
  const orderIds = input.orders.map((o) => o.id).filter((id): id is number => id !== null);
  // Orders not sent yet are identified by their reference.
  const orderRefs = input.orders.filter((o) => o.id === null && o.ref).map((o) => o.ref!);
  const total = input.orders.reduce((sum, o) => sum + o.total, 0);

  const save = (): ChargeOutcome => {
    // The password for a forced charge is never written to the phone: offline, the
    // server flags the charge for the admin instead.
    enqueue({
      kind: 'charge',
      ref,
      tableId: input.tableId,
      tableNumber: input.tableNumber,
      label: input.label,
      total,
      createdAt: chargedAt,
      owner: input.owner,
      payments: input.payments,
      orderIds,
      orderRefs,
    });
    return { delivery: 'saved' };
  };

  // An order not sent yet can only be charged after it, so the charge waits in line too.
  if (input.offline || orderRefs.length > 0) return save();
  try {
    const status = await chargeTable(input.tableId, {
      payments: input.payments,
      orderIds,
      orderRefs,
      clientRef: ref,
      offline: false,
      chargedAt,
      forced: input.forced,
    });
    return { delivery: 'sent', status };
  } catch (err) {
    if (noConnection(err)) return save();
    throw err;
  }
}
