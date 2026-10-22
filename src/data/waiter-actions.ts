import { ApiError } from '@/api/client';
import { chargeTable, sendToKitchen, type ChargeStatus, type Payment, type TableOrder } from '@/api/waiter';
import { enqueue, newRef, type OutboxItem } from '@/data/waiter-outbox';

/**
 * What the waiter sends to the server. An order to the kitchen never gets lost: without a
 * connection (or if it drops mid-request) it's saved in the outbox and sent later. A
 * charge needs a connection, so the server confirms it before the table is freed.
 */

type Table = { tableId: number; tableNumber: string };

/** "sent": the server has it. "saved": on the phone, waiting for a connection. */
export type Delivery = 'sent' | 'saved';

const noConnection = (err: unknown) => err instanceof ApiError && err.status === 0;

export const CHARGE_NEEDS_CONNECTION = 'Sin conexión: para cobrar necesitas internet. Los pedidos siguen guardados.';
export const CHARGE_NEEDS_SENT_ORDERS =
  'Hay pedidos de esta cuenta guardados en el teléfono. Se cobran cuando lleguen al sistema (se envían solos con internet).';

export async function placeKitchenOrder(
  input: Table & { label: string; items: OutboxItem[]; owner: string; offline: boolean },
): Promise<Delivery> {
  const ref = newRef('pedido');
  const createdAt = new Date().toISOString();
  const total = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const save = () => {
    enqueue({
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

/**
 * Charges orders the server already has; online only. `ref` stays the same for every
 * attempt at one bill: if the connection drops after the server registered it, trying
 * again doesn't charge twice.
 */
export async function chargeOrders(input: {
  tableId: number;
  ref: string;
  orders: Pick<TableOrder, 'id'>[];
  payments: Payment[];
  forced?: { reason: string; password: string };
}): Promise<ChargeStatus> {
  const orderIds = input.orders.map((o) => o.id).filter((id): id is number => id !== null);
  if (orderIds.length < input.orders.length) throw new ApiError(CHARGE_NEEDS_SENT_ORDERS, 0);

  try {
    return await chargeTable(input.tableId, {
      payments: input.payments,
      orderIds,
      orderRefs: [],
      clientRef: input.ref,
      offline: false,
      chargedAt: new Date().toISOString(),
      forced: input.forced,
    });
  } catch (err) {
    if (noConnection(err)) throw new ApiError(CHARGE_NEEDS_CONNECTION, 0);
    throw err;
  }
}
