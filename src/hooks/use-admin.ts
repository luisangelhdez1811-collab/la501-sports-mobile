import { useState } from 'react';

import {
  getDailyCut,
  getEarnings,
  getMessages,
  getReservations,
  getRotation,
  getSalesSummary,
  getWaiterPerformance,
  markMessageAttended,
  updateReservationStatus,
  type MessageFilter,
  type ReservationStatus,
  type SalesPeriod,
  type WaiterPeriod,
} from '@/api/admin';
import { errorMessage } from '@/api/client';
import { useAdminResource } from '@/hooks/use-admin-resource';

/**
 * ViewModels of the admin panel. Its data is sensitive: it lives only on the server and is
 * never saved on the device (see useAdminResource).
 */

export const useSalesSummary = () => useAdminResource('sales-summary', getSalesSummary);
export const useEarnings = (period: SalesPeriod) => useAdminResource(`earnings-${period}`, (signal) => getEarnings(period, signal));
export const useRotation = (period: SalesPeriod) => useAdminResource(`rotation-${period}`, (signal) => getRotation(period, signal));
export const useDailyCut = () => useAdminResource('daily-cut', getDailyCut);
export const useWaiterPerformance = (period: WaiterPeriod) =>
  useAdminResource(`waiters-${period}`, (signal) => getWaiterPerformance(period, signal));
export const useMessages = (filter: MessageFilter, search: string) =>
  useAdminResource(`messages-${filter}-${search}`, (signal) => getMessages(filter, search, signal));
export const useReservations = (status: ReservationStatus) =>
  useAdminResource(`reservations-${status}`, (signal) => getReservations(status, signal));

/** Runs one admin action; resolves the error message, or null when it worked. */
function useAction<A extends unknown[]>(action: (...args: A) => Promise<unknown>) {
  const [busy, setBusy] = useState(false);
  const run = async (...args: A): Promise<string | null> => {
    setBusy(true);
    try {
      await action(...args);
      return null;
    } catch (err) {
      return errorMessage(err);
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

export const useMarkMessageAttended = () => useAction(markMessageAttended);
export const useChangeReservationStatus = () => useAction(updateReservationStatus);
