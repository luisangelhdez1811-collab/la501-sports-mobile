import { request } from './client';
import { asArray, asId, asNumber, asObject, asString, pick, unwrap, type Json } from './parse';

/**
 * Admin panel data. Every route requires the admin's token and the server must check the
 * role itself: hiding screens in the app is only for convenience, never security.
 * Nothing here is saved on the device (sales and customer data stay on the server).
 *
 * Field names accept the Spanish column names used elsewhere in the API as well.
 */

const ADMIN = '/app/admin';

// ---- Panel de ventas ----

export type SalesSummary = { totalSales: number; ordersToday: number };

export async function getSalesSummary(signal?: AbortSignal): Promise<SalesSummary> {
  const body = unwrap(await request<unknown>(`${ADMIN}/sales/summary`, { auth: true, signal }));
  return {
    totalSales: asNumber(pick(body, 'total_sales', 'ventas_totales')),
    ordersToday: asNumber(pick(body, 'orders_today', 'pedidos_hoy')),
  };
}

export type SalesPeriod = '30d' | 'months';
export type SalesPoint = { label: string; total: number };

/** "Ganancias": income per day (last 30 days) or per month. */
export async function getEarnings(period: SalesPeriod, signal?: AbortSignal): Promise<SalesPoint[]> {
  const data = await request<unknown>(`${ADMIN}/sales/report?type=ganancias&period=${period}`, { auth: true, signal });
  return asArray(data).map((raw) => {
    const obj = asObject(raw) ?? {};
    return {
      label: asString(pick(obj, 'label', 'date', 'fecha', 'month', 'mes')),
      total: asNumber(pick(obj, 'total', 'amount', 'monto')),
    };
  });
}

export type ProductRotation = { name: string; quantity: number; total: number };

/** "Rotación": best-selling products in the period. */
export async function getRotation(period: SalesPeriod, signal?: AbortSignal): Promise<ProductRotation[]> {
  const data = await request<unknown>(`${ADMIN}/sales/report?type=rotacion&period=${period}`, { auth: true, signal });
  return asArray(data).map((raw) => {
    const obj = asObject(raw) ?? {};
    return {
      name: asString(pick(obj, 'name', 'nombre', 'product', 'producto')),
      quantity: asNumber(pick(obj, 'quantity', 'cantidad')),
      total: asNumber(pick(obj, 'total', 'amount', 'monto')),
    };
  });
}

export type DailyCut = { date: string; total: number; orders: number; cash: number; card: number };

/** "Corte diario": today's totals by payment method. */
export async function getDailyCut(signal?: AbortSignal): Promise<DailyCut> {
  const body = unwrap(await request<unknown>(`${ADMIN}/sales/report?type=corte`, { auth: true, signal }));
  return {
    date: asString(pick(body, 'date', 'fecha')),
    total: asNumber(pick(body, 'total')),
    orders: asNumber(pick(body, 'orders', 'pedidos')),
    cash: asNumber(pick(body, 'cash', 'efectivo')),
    card: asNumber(pick(body, 'card', 'tarjeta')),
  };
}

// ---- Reservaciones ----

export const RESERVATION_STATUSES = ['pendiente', 'confirmada', 'cancelada', 'finalizada'] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export type AdminReservation = {
  id: number;
  name: string;
  email: string;
  phone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  people: number;
  zone: string;
  status: ReservationStatus;
};

export type ReservationList = {
  counts: Record<ReservationStatus, number>;
  items: AdminReservation[];
};

function toStatus(value: unknown): ReservationStatus {
  const status = asString(value).toLowerCase();
  if (status.startsWith('confirm')) return 'confirmada';
  if (status.startsWith('cancel')) return 'cancelada';
  if (status.startsWith('final') || status.startsWith('complet')) return 'finalizada';
  return 'pendiente';
}

function toCounts<K extends string>(raw: unknown, keys: readonly K[], aliases: Partial<Record<K, string[]>> = {}) {
  const obj = asObject(raw) ?? {};
  return Object.fromEntries(
    keys.map((key) => [key, asNumber(pick(obj, key, ...(aliases[key] ?? [])))]),
  ) as Record<K, number>;
}

export async function getReservations(status: ReservationStatus, signal?: AbortSignal): Promise<ReservationList> {
  const data = await request<unknown>(`${ADMIN}/reservations?status=${status}`, { auth: true, signal });
  const root = asObject(data) ?? {};
  return {
    counts: toCounts(pick(root, 'counts', 'totales') ?? unwrap(data).counts, RESERVATION_STATUSES, {
      pendiente: ['pendientes'],
      confirmada: ['confirmadas'],
      cancelada: ['canceladas'],
      finalizada: ['finalizadas'],
    }),
    items: asArray(data)
      .map((raw): AdminReservation | null => {
        const obj = asObject(raw);
        const id = obj ? asId(obj.id) : null;
        if (!obj || id === null) return null;
        return {
          id,
          name: asString(pick(obj, 'name', 'nombre_completo', 'nombre')),
          email: asString(pick(obj, 'email', 'correo_electronico')),
          phone: asString(pick(obj, 'phone', 'telefono')),
          date: asString(pick(obj, 'date', 'fecha_reservacion')).slice(0, 10),
          time: asString(pick(obj, 'time', 'hora_reservacion')).slice(0, 5),
          people: asNumber(pick(obj, 'people', 'cantidad_personas')),
          zone: asString(pick(obj, 'zone', 'zona')),
          status: toStatus(pick(obj, 'status', 'estado')),
        };
      })
      .filter((r): r is AdminReservation => r !== null),
  };
}

export async function updateReservationStatus(id: number, status: ReservationStatus) {
  await request(`${ADMIN}/reservations/${id}`, { method: 'PUT', auth: true, body: { estado: status } });
}

// ---- Mensajes ----

export const MESSAGE_FILTERS = ['todos', 'pendientes', 'atendidos', 'quejas', 'sugerencias'] as const;
export type MessageFilter = (typeof MESSAGE_FILTERS)[number];
export type MessageType = 'queja' | 'sugerencia' | 'pregunta' | 'otro';

export type AdminMessage = {
  id: number;
  name: string;
  email: string;
  subject: string;
  body: string;
  type: MessageType;
  attended: boolean;
  createdAt: Date | null;
};

export type MessageList = {
  counts: { total: number; pendientes: number; quejas: number; atendidos: number };
  items: AdminMessage[];
};

function toMessageType(value: unknown): MessageType {
  const type = asString(value).toLowerCase();
  if (type.startsWith('queja')) return 'queja';
  if (type.startsWith('suger')) return 'sugerencia';
  if (type.startsWith('pregun')) return 'pregunta';
  return 'otro';
}

export async function getMessages(filter: MessageFilter, search: string, signal?: AbortSignal): Promise<MessageList> {
  const query = `filter=${filter}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
  const data = await request<unknown>(`${ADMIN}/messages?${query}`, { auth: true, signal });
  const root = asObject(data) ?? {};
  return {
    counts: toCounts(pick(root, 'counts', 'totales') ?? unwrap(data).counts, [
      'total',
      'pendientes',
      'quejas',
      'atendidos',
    ] as const),
    items: asArray(data)
      .map((raw): AdminMessage | null => {
        const obj = asObject(raw);
        const id = obj ? asId(obj.id) : null;
        if (!obj || id === null) return null;
        const created = new Date(asString(pick(obj, 'created_at', 'fecha')));
        const status = asString(pick(obj, 'status', 'estado')).toLowerCase();
        return {
          id,
          name: asString(pick(obj, 'name', 'nombre')),
          email: asString(pick(obj, 'email', 'correo', 'correo_electronico')),
          subject: asString(pick(obj, 'subject', 'asunto')),
          body: asString(pick(obj, 'message', 'mensaje', 'body')),
          type: toMessageType(pick(obj, 'type', 'tipo')),
          attended: status.startsWith('atend') || obj.attended === true,
          createdAt: Number.isNaN(created.getTime()) ? null : created,
        };
      })
      .filter((m): m is AdminMessage => m !== null),
  };
}

export async function markMessageAttended(id: number) {
  await request(`${ADMIN}/messages/${id}`, { method: 'PUT', auth: true, body: { estado: 'atendido' } });
}

// ---- Desempeño de meseros ----

export const WAITER_PERIODS = ['hoy', 'semana', 'mes', 'todo'] as const;
export type WaiterPeriod = (typeof WAITER_PERIODS)[number];

export type WaiterPerformance = {
  totalSold: number;
  tablesCharged: number;
  waitersWithSales: number;
  forcedCharges: number;
  ranking: { waiter: string; tables: number; total: number }[];
  tables: { table: string; waiter: string; chargedBy: string; total: number; forced: boolean; closedAt: Date | null }[];
};

export async function getWaiterPerformance(period: WaiterPeriod, signal?: AbortSignal): Promise<WaiterPerformance> {
  const body: Json = unwrap(await request<unknown>(`${ADMIN}/waiters/performance?period=${period}`, { auth: true, signal }));
  const summary = asObject(pick(body, 'summary', 'resumen')) ?? body;
  return {
    totalSold: asNumber(pick(summary, 'total_sold', 'total_vendido')),
    tablesCharged: asNumber(pick(summary, 'tables_charged', 'mesas_cobradas')),
    waitersWithSales: asNumber(pick(summary, 'waiters_with_sales', 'meseros_con_ventas')),
    forcedCharges: asNumber(pick(summary, 'forced_charges', 'cobros_forzados')),
    ranking: asArray(pick(body, 'ranking') ?? []).map((raw) => {
      const obj = asObject(raw) ?? {};
      return {
        waiter: asString(pick(obj, 'waiter', 'mesero', 'name', 'nombre')),
        tables: asNumber(pick(obj, 'tables', 'mesas')),
        total: asNumber(pick(obj, 'total')),
      };
    }),
    tables: asArray(pick(body, 'tables', 'mesas') ?? []).map((raw) => {
      const obj = asObject(raw) ?? {};
      const closed = new Date(asString(pick(obj, 'closed_at', 'cobrada_en')));
      return {
        table: asString(pick(obj, 'table', 'mesa')),
        waiter: asString(pick(obj, 'waiter', 'mesero')),
        chargedBy: asString(pick(obj, 'charged_by', 'cobro')),
        total: asNumber(pick(obj, 'total')),
        forced: Boolean(pick(obj, 'forced', 'forzado')),
        closedAt: Number.isNaN(closed.getTime()) ? null : closed,
      };
    }),
  };
}
