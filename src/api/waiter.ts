import type { Ingredient } from '@/types/product';

import { ApiError, request } from './client';
import { asArray, asId, asNumber, asObject, asString, pick, unwrap, type Json } from './parse';

/**
 * Orders and charges only count as registered when the server says so explicitly: a proxy
 * or filter answering 200 with an HTML page must not make the app drop them from the queue.
 */
function assertRegistered(data: unknown) {
  if (asObject(data)?.success !== true) {
    throw new ApiError('El servidor no confirmó que lo registró. Intenta de nuevo.', 200);
  }
}

/**
 * Waiter (mesero) service: tables map, sending each diner's order to the kitchen and
 * charging tables (together or one diner at a time). Every route requires the waiter's
 * token; the server checks the role and recalculates every amount from the database (the
 * app never decides prices).
 *
 * Orders and charges carry a `clientRef` generated on the phone, so re-sending one (an
 * order saved offline, a charge retried after the connection dropped) is safe: the server
 * registers it only once.
 */

const WAITER = '/app/waiter';

export type TableStatus = 'disponible' | 'ocupada';

export type RestaurantTable = {
  id: number;
  number: string;
  status: TableStatus;
  total: number;
  /** Dishes still being prepared: charging needs the "Forzar cobro" flow. */
  kitchenPending: boolean;
  ordersCount: number;
};

export type TablesMap = {
  tables: RestaurantTable[];
  /** Tables can't be removed below this (the restaurant's fixed tables). */
  minTables: number;
  maxTables: number;
};

const DEFAULT_MIN_TABLES = 13;
const DEFAULT_MAX_TABLES = 40;

function toTable(raw: unknown): RestaurantTable | null {
  const obj = asObject(raw);
  const id = obj ? asId(obj.id) : null;
  if (!obj || id === null) return null;
  const status = asString(pick(obj, 'status', 'estado')).toLowerCase();
  return {
    id,
    number: asString(pick(obj, 'number', 'numero', 'name', 'nombre'), String(id)),
    status: status.startsWith('ocup') || status === 'occupied' ? 'ocupada' : 'disponible',
    total: asNumber(pick(obj, 'total')),
    kitchenPending: Boolean(pick(obj, 'kitchen_pending', 'en_cocina', 'pending_kitchen')),
    ordersCount: asNumber(pick(obj, 'orders_count')),
  };
}

export async function getTables(signal?: AbortSignal): Promise<TablesMap> {
  const data = await request<unknown>(`${WAITER}/tables`, { auth: true, signal });
  const meta = asObject(asObject(data)?.meta) ?? {};
  return {
    tables: asArray(data)
      .map(toTable)
      .filter((t): t is RestaurantTable => t !== null),
    minTables: asNumber(meta.min_tables) || DEFAULT_MIN_TABLES,
    maxTables: asNumber(meta.max_tables) || DEFAULT_MAX_TABLES,
  };
}

export async function addTable(): Promise<RestaurantTable | null> {
  const data = await request<unknown>(`${WAITER}/tables`, { method: 'POST', auth: true, body: {} });
  return toTable(unwrap(data));
}

/** Only the last table, when it's free and above the restaurant's fixed tables. */
export async function removeTable(tableId: number) {
  await request(`${WAITER}/tables/${tableId}`, { method: 'DELETE', auth: true });
}

export type TableOrderItem = { name: string; quantity: number; price: number; notes: string };

/** One send to the kitchen: in practice, one diner ("Persona 1", "Ana"). */
export type TableOrder = {
  /** Server id; null while it's only saved on the phone (not sent yet). */
  id: number | null;
  /** Phone-generated reference; how an order saved on the phone is recognized once sent. */
  ref: string | null;
  label: string;
  total: number;
  kitchenPending: boolean;
  items: TableOrderItem[];
  /** Saved on the phone, waiting for a connection to reach the server. */
  unsent?: boolean;
};

export type TableDetail = RestaurantTable & { orders: TableOrder[] };

function toOrderItem(raw: unknown): TableOrderItem {
  const obj = asObject(raw) ?? {};
  return {
    name: asString(pick(obj, 'name', 'nombre', 'product', 'producto')),
    quantity: asNumber(pick(obj, 'quantity', 'cantidad')),
    price: asNumber(pick(obj, 'price', 'precio')),
    notes: asString(pick(obj, 'notes', 'notas')),
  };
}

function toTableOrder(raw: unknown, index: number): TableOrder | null {
  const obj = asObject(raw);
  if (!obj) return null;
  return {
    id: asId(obj.id),
    ref: asString(obj.client_ref) || null,
    label: asString(pick(obj, 'label', 'diner_label'), `Pedido ${index + 1}`),
    total: asNumber(obj.total),
    kitchenPending: Boolean(pick(obj, 'kitchen_pending')),
    items: asArray(pick(obj, 'items') ?? []).map(toOrderItem),
  };
}

/** The table's open orders, one per diner, as the server has them. */
export async function getTable(id: number, signal?: AbortSignal): Promise<TableDetail | null> {
  const body: Json = unwrap(await request<unknown>(`${WAITER}/tables/${id}`, { auth: true, signal }));
  const table = toTable(asObject(body.table) ?? body);
  if (!table) return null;
  const orders = asArray(pick(body, 'orders') ?? [])
    .map(toTableOrder)
    .filter((o): o is TableOrder => o !== null);
  // Older servers only sent a flat list of items: show it as a single order.
  const legacyItems = asArray(pick(body, 'items', 'productos') ?? []).map(toOrderItem);
  return {
    ...table,
    orders:
      orders.length > 0 || legacyItems.length === 0
        ? orders
        : [{ id: null, ref: null, label: 'Pedido', total: table.total, kitchenPending: table.kitchenPending, items: legacyItems }],
  };
}

export type KitchenItem = {
  productId: number;
  quantity: number;
  excluded: Ingredient[];
  notes: string;
};

export type KitchenOrderInput = {
  items: KitchenItem[];
  /** Who it's for: "Persona 1", "Ana"… shown to the kitchen and used to charge separately. */
  label: string;
  clientRef: string;
  /** It's being sent late, after being saved without a connection. */
  offline: boolean;
  createdAt: string;
};

/** "Enviar a cocina": only ids, quantities and customizations; the server sets prices. */
export async function sendToKitchen(tableId: number, input: KitchenOrderInput) {
  const data = await request<unknown>(`${WAITER}/tables/${tableId}/orders`, {
    method: 'POST',
    auth: true,
    body: {
      items: input.items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        excluded_ingredients: item.excluded.map((ingredient) => ingredient.id ?? ingredient.name),
        notes: item.notes.trim() || null,
      })),
      label: input.label.trim() || null,
      client_ref: input.clientRef,
      offline: input.offline,
      created_at: input.createdAt,
    },
  });
  assertRegistered(data);
}

// The restaurant doesn't take bank transfers.
export const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value'];
export type Payment = { method: PaymentMethod; amount: number };

export type ChargeInput = {
  payments: Payment[];
  /** Exactly what is being paid: server ids and/or refs of orders not sent yet. */
  orderIds: number[];
  orderRefs: string[];
  clientRef: string;
  /** Done without a connection: the server records it as is and flags it for the admin. */
  offline: boolean;
  chargedAt: string;
  /** "Forzar cobro" while the kitchen hasn't finished: audited by the admin. */
  forced?: { reason: string; password: string };
};

/** How the server recorded a charge; anything but "applied" is for the admin to review. */
export type ChargeStatus = 'applied' | 'discrepancy' | 'conflict';

/** Server answer when dishes are still in preparation and the charge wasn't forced. */
export const KITCHEN_PENDING_STATUS = 409;

export async function chargeTable(tableId: number, input: ChargeInput): Promise<ChargeStatus> {
  const data = await request<unknown>(`${WAITER}/tables/${tableId}/charge`, {
    method: 'POST',
    auth: true,
    body: {
      payments: input.payments.map((p) => ({ method: p.method, amount: Math.round(p.amount * 100) / 100 })),
      order_ids: input.orderIds,
      order_refs: input.orderRefs,
      client_ref: input.clientRef,
      offline: input.offline,
      charged_at: input.chargedAt,
      forced: !!input.forced,
      reason: input.forced?.reason.trim() || null,
      password: input.forced?.password || null,
    },
  });
  assertRegistered(data);
  const status = asString(unwrap(data).status);
  return status === 'discrepancy' || status === 'conflict' ? status : 'applied';
}
