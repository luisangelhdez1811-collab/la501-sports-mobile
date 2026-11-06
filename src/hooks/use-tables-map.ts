import { useEffect, useRef, useState } from 'react';

import { errorMessage } from '@/api/client';
import { addTable, getTables, removeTable, type TablesMap } from '@/api/waiter';
import { useOutbox } from '@/data/waiter-outbox';
import { summarize, tableView } from '@/domain/waiter-tables';
import { useCachedResource } from '@/hooks/use-cached-resource';
import { useIsOffline } from '@/hooks/use-connectivity';

// Other waiters change tables too: refresh the map every so often while it's open.
const REFRESH_MS = 20_000;

/**
 * Waiter's map of tables (ViewModel): the server's map with the orders still waiting in the
 * outbox on top, refreshed every few seconds online, and adding / removing tables. The last
 * map is saved on the phone, so orders can be taken without internet.
 */
export function useTablesMap() {
  const offline = useIsOffline();
  const map = useCachedResource<TablesMap>('waiter-tables', getTables, { persist: true });
  const { entries } = useOutbox();
  const [changing, setChanging] = useState<'add' | 'remove' | null>(null);
  const { reload } = map;

  useEffect(() => {
    if (offline) return;
    const timer = setInterval(reload, REFRESH_MS);
    return () => clearInterval(timer);
    // `reload` is recreated every render; one timer per connection state is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offline]);

  // Something saved offline just reached the server: show the server's numbers.
  const pendingBefore = useRef(entries.length);
  useEffect(() => {
    if (entries.length < pendingBefore.current) reload();
    pendingBefore.current = entries.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length]);

  const tables = (map.data?.tables ?? []).map((table) => tableView(table, entries));
  const last = tables.at(-1);
  // Only the last table, when free and above the minimum, can be removed.
  const canRemove =
    !!map.data && !!last && tables.length > map.data.minTables && last.status === 'disponible' && last.unsent === 0;

  /** Resolves the error message, or null when the map changed. */
  const change = async (action: 'add' | 'remove'): Promise<string | null> => {
    setChanging(action);
    try {
      if (action === 'add') await addTable();
      else if (last) await removeTable(last.id);
      reload();
      return null;
    } catch (err) {
      return errorMessage(err);
    } finally {
      setChanging(null);
    }
  };

  return {
    offline,
    map,
    tables,
    totals: summarize(tables),
    toServeTotal: tables.reduce((sum, t) => sum + t.toServe, 0),
    last,
    canRemove,
    changing,
    change,
  };
}
