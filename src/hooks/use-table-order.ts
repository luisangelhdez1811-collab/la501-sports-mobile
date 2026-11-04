import { useEffect, useRef, useState } from 'react';

import { errorMessage } from '@/api/client';
import { offeredBy } from '@/api/orders';
import { getTable, markServed, type TableOrderItem } from '@/api/waiter';
import { getCachedDetail } from '@/data/product-details';
import { placeKitchenOrder } from '@/data/waiter-actions';
import { loadFavorites, recordOrdered, topDishes, useFavoritesVersion } from '@/data/waiter-favorites';
import { useOutbox } from '@/data/waiter-outbox';
import { createSelection, displayName, needsChoice, optionsSummary } from '@/domain/menu-options';
import {
  addChoice,
  chosenCount,
  linePrice,
  linesCount,
  linesTotal,
  removeOneOf,
  updateLine,
  type DishChoice,
  type OrderLine,
} from '@/domain/waiter-order';
import { nextDinerLabel, openOrders, toServe } from '@/domain/waiter-tables';
import { useAuth } from '@/hooks/use-auth';
import { useCachedResource } from '@/hooks/use-cached-resource';
import { useIsOffline } from '@/hooks/use-connectivity';
import { useMenu } from '@/hooks/use-menu';
import type { Product } from '@/types/product';

const FREQUENT_COUNT = 24;

/**
 * Table ViewModel (waiter): the table's open orders, the order being taken for one diner and
 * sending it to the kitchen (or to the outbox without internet), and marking dishes served.
 * Errors come back as messages for the screen to show.
 */
export function useTableOrder(tableId: number, tableNumber: string) {
  const offline = useIsOffline();
  const { user } = useAuth();
  const { categories } = useMenu();
  const detail = useCachedResource(`waiter-table-${tableId}`, (signal) => getTable(tableId, signal), { persist: true });
  const { entries } = useOutbox();
  useFavoritesVersion();
  useEffect(() => loadFavorites(), []);

  const [lines, setLines] = useState<OrderLine[]>([]);
  const nextLineId = useRef(1);
  const [label, setLabel] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [sentLabels, setSentLabels] = useState<string[]>([]);
  const [serving, setServing] = useState<number[]>([]);

  const orders = openOrders(detail.data, tableId, entries);
  const tableTotal = orders.reduce((sum, o) => sum + o.total, 0);
  // Diners sent from here count right away, before the table's list reloads.
  const known = [...orders, ...sentLabels.filter((l) => !orders.some((o) => o.label === l)).map((l) => ({ label: l }))];
  const diner = label?.trim() || nextDinerLabel(known);

  const allProducts = categories.flatMap((c) => c.products);
  const frequent = topDishes(FREQUENT_COUNT)
    .map((id) => allProducts.find((p) => p.id === id))
    .filter((p): p is Product => !!p && p.available);

  /** Adds a dish with its choices, or replaces the choices of the line being edited. */
  const pick = (product: Product, choice: DishChoice, editing?: OrderLine) => {
    setLastSent(null);
    if (editing) return setLines((current) => updateLine(current, editing.id, choice));
    const id = nextLineId.current++;
    setLines((current) => addChoice(current, id, product, choice));
  };

  /**
   * "+" on a dish: straight in, unless it has sizes, lists or ingredients to choose. Returns
   * false when the card has to open first.
   */
  const quickAdd = (product: Product) => {
    // Unknown ingredients (details not saved yet) count as something to choose.
    const ingredients = getCachedDetail(product.id)?.ingredients.length ?? 1;
    if (needsChoice(product, ingredients)) return false;
    pick(product, { excluded: [], notes: '', quantity: 1, selection: createSelection(product) });
    return true;
  };

  const removeOne = (product: Product) => setLines((current) => removeOneOf(current, product.key));
  const removeLine = (id: number) => setLines((current) => current.filter((l) => l.id !== id));

  /** "Entregado": the dish reached the table. Several can be marked at once ("Entregar todo"). */
  const serve = async (items: TableOrderItem[]): Promise<string | null> => {
    const ids = items.map((i) => i.id).filter((id): id is number => id !== null);
    setServing((current) => [...current, ...ids]);
    try {
      for (const id of ids) await markServed(tableId, id);
      return null;
    } catch (err) {
      return errorMessage(err);
    } finally {
      setServing((current) => current.filter((id) => !ids.includes(id)));
      detail.reload();
    }
  };

  /** Sends the diner's order; returns an error message, or null when it was sent or saved. */
  const send = async (): Promise<string | null> => {
    const items = lines.filter((line) => line.product.id !== null);
    if (items.length === 0 || !user) return null;
    setSending(true);
    try {
      const delivery = await placeKitchenOrder({
        tableId,
        tableNumber,
        label: diner,
        owner: user.email,
        offline,
        items: items.map((line) => ({
          productId: line.product.id!,
          name: displayName(line.product, line.selection),
          price: linePrice(line),
          quantity: line.quantity,
          excluded: line.excluded,
          notes: line.notes,
          selection: line.selection,
          offered: offeredBy(line.product),
          summary: optionsSummary(line.product, line.selection),
        })),
      });
      recordOrdered(items.flatMap((line) => Array<number>(line.quantity).fill(line.product.id!)));
      setSentLabels((current) => [...current, diner]);
      setLines([]);
      setLabel(null);
      setLastSent(
        delivery === 'sent'
          ? `${diner} enviado.`
          : `${diner} guardado sin conexión. Avisa a cocina y barra en persona: se enviará al sistema al volver el internet.`,
      );
      if (delivery === 'sent') detail.reload();
      return null;
    } catch (err) {
      return errorMessage(err);
    } finally {
      setSending(false);
    }
  };

  return {
    offline,
    detail,
    orders,
    tableTotal,
    pendingDelivery: toServe(orders),
    categories,
    frequent,
    diner,
    /** The name typed for the diner; null = the next automatic one ("Persona 2"). */
    label,
    setLabel,
    lines,
    count: linesCount(lines),
    total: linesTotal(lines),
    chosen: (product: Product) => chosenCount(lines, product.key),
    pick,
    quickAdd,
    removeOne,
    removeLine,
    serving,
    serve,
    sending,
    send,
    lastSent,
  };
}
