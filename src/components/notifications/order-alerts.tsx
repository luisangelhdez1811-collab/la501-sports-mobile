import { useCustomerOrderAlerts, useWaiterReadyAlerts } from '@/hooks/use-order-alerts';

/** Mounted while a waiter is signed in: "Mesa 5: listo para entregar". Draws nothing. */
export function WaiterAlerts() {
  useWaiterReadyAlerts();
  return null;
}

/** Mounted for customers (signed in or not): "Tu pedido salió de cocina". Draws nothing. */
export function CustomerAlerts() {
  useCustomerOrderAlerts();
  return null;
}
