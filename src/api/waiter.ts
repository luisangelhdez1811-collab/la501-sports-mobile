import type { Ingredient } from '@/types/product';

import { request } from './client';
import { asArray, asId, asNumber, asObject, asString, pick, unwrap, type Json } from './parse';

/**
 * Waiter (mesero) service: tables map, sending orders to the kitchen and charging tables.
 * Every route requires the waiter's token; the server checks the role and recalculates
 * every amount from the database (the app never decides prices).
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
};

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
  };
}

export async function getTables(signal?: AbortSignal): Promise<RestaurantTable[]> {
  const data = await request<unknown>(`${WAITER}/tables`, { auth: true, signal });
  return asArray(data)
    .map(toTable)
    .filter((t): t is RestaurantTable => t !== null);
}

export async function addTable(): Promise<RestaurantTable | null> {
  const data = await request<unknown>(`${WAITER}/tables`, { method: 'POST', auth: true, body: {} });
  return toTable(unwrap(data));
}

export type TableOrderItem = { name: string; quantity: number; price: number; notes: string };

export type TableDetail = RestaurantTable & { items: TableOrderItem[] };

/** What the table already has (sent earlier), shown while adding more. */
export async function getTable(id: number, signal?: AbortSignal): Promise<TableDetail | null> {
  const body: Json = unwrap(await request<unknown>(`${WAITER}/tables/${id}`, { auth: true, signal }));
  const table = toTable(asObject(body.table) ?? body);
  if (!table) return null;
  return {
    ...table,
    items: asArray(pick(body, 'items', 'productos') ?? []).map((raw) => {
      const obj = asObject(raw) ?? {};
      return {
        name: asString(pick(obj, 'name', 'nombre', 'product', 'producto')),
        quantity: asNumber(pick(obj, 'quantity', 'cantidad')),
        price: asNumber(pick(obj, 'price', 'precio')),
        notes: asString(pick(obj, 'notes', 'notas')),
      };
    }),
  };
}

export type KitchenItem = {
  productId: number;
  quantity: number;
  excluded: Ingredient[];
  notes: string;
};

/** "Enviar a cocina": only ids, quantities and customizations; the server sets prices. */
export async function sendToKitchen(tableId: number, items: KitchenItem[]) {
  await request(`${WAITER}/tables/${tableId}/orders`, {
    method: 'POST',
    auth: true,
    body: {
      items: items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        excluded_ingredients: item.excluded.map((ingredient) => ingredient.id ?? ingredient.name),
        notes: item.notes.trim() || null,
      })),
    },
  });
}

export const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' },
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value'];
export type Payment = { method: PaymentMethod; amount: number };

export type ChargeInput = {
  payments: Payment[];
  /** "Forzar cobro" while the kitchen hasn't finished: audited by the admin. */
  forced?: { reason: string; password: string };
};

/** Server answer when dishes are still in preparation and the charge wasn't forced. */
export const KITCHEN_PENDING_STATUS = 409;

export async function chargeTable(tableId: number, input: ChargeInput) {
  await request(`${WAITER}/tables/${tableId}/charge`, {
    method: 'POST',
    auth: true,
    body: {
      payments: input.payments.map((p) => ({ method: p.method, amount: Math.round(p.amount * 100) / 100 })),
      forced: !!input.forced,
      reason: input.forced?.reason.trim() || null,
      password: input.forced?.password || null,
    },
  });
}
