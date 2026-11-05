import { useState } from 'react';

import { ApiError, errorMessage } from '@/api/client';
import { KITCHEN_PENDING_STATUS, type PaymentMethod } from '@/api/waiter';
import { chargeOrders, CHARGE_NEEDS_CONNECTION, CHARGE_NEEDS_SENT_ORDERS } from '@/data/waiter-actions';
import { newRef } from '@/data/waiter-outbox';
import type { Bill } from '@/domain/bills';
import { useIsOffline } from '@/hooks/use-connectivity';

export type PaymentRow = { key: number; method: PaymentMethod; amount: string };

/** "120,50" → 120.5; anything that isn't a positive amount counts as 0. */
export const toAmount = (text: string) => {
  const n = Number.parseFloat(text.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const cents = (n: number) => Math.round(n * 100);

/**
 * Charging one bill (waiter ViewModel): up to a few payments (cash / card), what is still
 * missing or the change, and the forced charge (reason + password, audited) when the kitchen
 * hasn't finished. One reference per bill, so a retry after a dropped connection never
 * charges twice. Charging needs a connection.
 */
export function useBillPayment(bill: Bill, tableId: number, onCharged: (outcome: string) => void) {
  const offline = useIsOffline();
  const [ref] = useState(() => newRef('cobro'));
  const [rows, setRows] = useState<PaymentRow[]>(() => [{ key: 0, method: 'efectivo', amount: bill.total.toFixed(2) }]);
  const unsent = bill.orders.some((o) => o.unsent);
  const [forced, setForced] = useState(() => !unsent && bill.orders.some((o) => o.kitchenPending));
  const [reason, setReasonState] = useState('');
  const [password, setPasswordState] = useState('');
  const [armed, setArmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blocked = offline ? CHARGE_NEEDS_CONNECTION : unsent ? CHARGE_NEEDS_SENT_ORDERS : null;
  const paid = rows.reduce((total, row) => total + toAmount(row.amount), 0);
  /** Cents still to cover; negative = change (or overpaid by card). */
  const missing = cents(bill.total) - cents(paid);
  const hasCash = rows.some((row) => row.method === 'efectivo' && toAmount(row.amount) > 0);
  const covered = missing <= 0;
  const forcedReady = !forced || (reason.trim().length >= 5 && password.length > 0);
  const canConfirm = covered && forcedReady && !submitting && !blocked;

  // Any change disarms "Confirmar": the waiter checks the amounts again.
  const setReason = (text: string) => {
    setArmed(false);
    setReasonState(text);
  };
  const setPassword = (text: string) => {
    setArmed(false);
    setPasswordState(text);
  };
  const update = (key: number, patch: Partial<PaymentRow>) => {
    setArmed(false);
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };
  const addRow = () => {
    setArmed(false);
    setRows((current) => [
      ...current,
      { key: Math.max(...current.map((r) => r.key)) + 1, method: 'tarjeta', amount: missing > 0 ? (missing / 100).toFixed(2) : '' },
    ]);
  };
  const removeRow = (key: number) => {
    setArmed(false);
    setRows((current) => current.filter((row) => row.key !== key));
  };

  const confirm = async () => {
    if (!canConfirm) return;
    // First tap arms the button; the second one charges (it can't be undone).
    if (!armed) return setArmed(true);
    setSubmitting(true);
    setError(null);
    try {
      const status = await chargeOrders({
        tableId,
        ref,
        orders: bill.orders,
        payments: rows
          .filter((row) => toAmount(row.amount) > 0)
          .map((row) => ({ method: row.method, amount: toAmount(row.amount) })),
        forced: forced ? { reason, password } : undefined,
      });
      onCharged(status === 'applied' ? `${bill.label}: cobrado.` : `${bill.label}: cobrado y enviado a revisión del administrador.`);
    } catch (err) {
      if (err instanceof ApiError && err.status === KITCHEN_PENDING_STATUS && !forced) {
        setForced(true);
        setError('La cocina aún tiene platillos de esta cuenta. Si necesitas cobrar ya, usa el cobro forzado.');
      } else {
        setError(errorMessage(err));
      }
      setArmed(false);
      setSubmitting(false);
    } finally {
      setPasswordState('');
    }
  };

  return {
    offline,
    blocked,
    rows,
    update,
    addRow,
    removeRow,
    paid,
    missing,
    hasCash,
    covered,
    forced,
    reason,
    setReason,
    password,
    setPassword,
    armed,
    submitting,
    error,
    canConfirm,
    confirm,
  };
}
