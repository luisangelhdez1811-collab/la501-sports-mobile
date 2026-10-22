import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { addTable, getTables, removeTable, type TablesMap } from '@/api/waiter';
import { formatMoney } from '@/components/account/orders-list';
import { AdminTitle, Segmented } from '@/components/admin/admin-ui';
import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { OfflineBanner } from '@/components/brand/offline-banner';
import { ChargeSheet } from '@/components/waiter/charge-sheet';
import { OutboxBanner } from '@/components/waiter/outbox-sync';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useOutbox } from '@/data/waiter-outbox';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useCachedResource } from '@/hooks/use-cached-resource';
import { useIsOffline } from '@/hooks/use-connectivity';
import { summarize, tableView, type TableView } from '@/domain/waiter-tables';

// Other waiters change tables too: refresh the map every so often while it's open.
const REFRESH_MS = 20_000;

type Filter = 'todas' | 'ocupadas' | 'libres';

/**
 * Waiter home: every table at a glance. Tapping a table opens its order; occupied tables
 * can be charged from here (with internet). The last known map is saved on the phone, so
 * orders can still be taken without internet (they wait in the outbox).
 */
export default function TablesMapScreen() {
  const { colors } = useBrandTheme();
  const offline = useIsOffline();
  const map = useCachedResource<TablesMap>('waiter-tables', getTables, { persist: true });
  const { entries } = useOutbox();
  const [filter, setFilter] = useState<Filter>('todas');
  const [charging, setCharging] = useState<TableView | null>(null);
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
  const totals = summarize(tables);
  const visible = tables.filter((t) =>
    filter === 'todas' ? true : filter === 'ocupadas' ? t.status === 'ocupada' : t.status === 'disponible',
  );
  const last = tables.at(-1);
  const canRemove =
    !!map.data && !!last && tables.length > map.data.minTables && last.status === 'disponible' && last.unsent === 0;

  const add = () => {
    Alert.alert('Agregar mesa', `Se agregará la mesa ${tables.length + 1} al mapa.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Agregar', onPress: () => change('add') },
    ]);
  };
  const remove = () => {
    if (!last) return;
    Alert.alert('Quitar mesa', `Se quitará la mesa ${last.number} del mapa.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => change('remove') },
    ]);
  };
  const change = async (action: 'add' | 'remove') => {
    setChanging(action);
    try {
      if (action === 'add') await addTable();
      else if (last) await removeTable(last.id);
      reload();
    } catch (err) {
      Alert.alert(action === 'add' ? 'No se pudo agregar' : 'No se pudo quitar', errorMessage(err));
    } finally {
      setChanging(null);
    }
  };

  const openOrder = (table: TableView) =>
    router.push({ pathname: '/mesa/[id]', params: { id: String(table.id), numero: table.number } });

  return (
    <BrandScreen refreshing={map.refreshing} onRefresh={offline ? undefined : map.refresh}>
      <AdminTitle
        title="Mesas"
        subtitle={
          map.data
            ? `${totals.busy} ocupadas · ${totals.free} libres · ${formatMoney(totals.openTotal)} por cobrar`
            : 'Toma pedidos y cobra desde aquí.'
        }
      />

      <OfflineBanner stale={map.stale} onRetry={reload} />
      {(offline || map.stale) && !!map.data && (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Mostrando el último estado guardado. Puedes seguir tomando pedidos: se guardan en el teléfono y se envían
          solos al volver el internet. Para cobrar necesitas conexión.
        </Text>
      )}
      <OutboxBanner />

      {map.data === null ? (
        map.error ? (
          <View style={styles.state}>
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>{map.error}</Text>
            <BrandButton title="Reintentar" onPress={reload} />
          </View>
        ) : (
          <ActivityIndicator color={Brand.orange} size="large" style={styles.state} />
        )
      ) : (
        <>
          <Segmented
            options={[
              { value: 'todas', label: 'Todas', count: tables.length },
              { value: 'ocupadas', label: 'Ocupadas', count: totals.busy },
              { value: 'libres', label: 'Libres', count: totals.free },
            ]}
            value={filter}
            onChange={setFilter}
            color={Brand.blue}
          />

          <View style={styles.grid}>
            {visible.map((table) => (
              <TableCard key={table.id} table={table} onOpen={() => openOrder(table)} onCharge={() => setCharging(table)} />
            ))}
          </View>
          {visible.length === 0 && (
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>
              {filter === 'ocupadas' ? 'No hay mesas ocupadas.' : 'No hay mesas libres.'}
            </Text>
          )}

          <View style={[styles.manage, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.manageText, { color: colors.textSecondary }]}>
              {tables.length} mesas · mínimo {map.data.minTables}, máximo {map.data.maxTables}
              {offline ? ' · necesitas internet para cambiarlas' : ''}
            </Text>
            <View style={styles.manageActions}>
              <ManageButton
                label={changing === 'remove' ? 'Quitando…' : `Quitar mesa ${last?.number ?? ''}`}
                icon={{ ios: 'minus', android: 'remove', web: 'remove' }}
                color={Brand.red}
                disabled={offline || !canRemove || changing !== null}
                onPress={remove}
              />
              <ManageButton
                label={changing === 'add' ? 'Agregando…' : 'Agregar mesa'}
                icon={{ ios: 'plus', android: 'add', web: 'add' }}
                color={Brand.blue}
                disabled={offline || tables.length >= map.data.maxTables || changing !== null}
                onPress={add}
              />
            </View>
          </View>
        </>
      )}

      {charging && (
        <ChargeSheet
          key={charging.id}
          table={charging}
          onClose={() => setCharging(null)}
          onDone={(summary) => {
            setCharging(null);
            reload();
            Alert.alert(`Mesa ${charging.number}`, summary);
          }}
        />
      )}
    </BrandScreen>
  );
}

function TableCard({ table, onOpen, onCharge }: { table: TableView; onOpen: () => void; onCharge: () => void }) {
  const { colors } = useBrandTheme();
  const busy = table.status === 'ocupada';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Mesa ${table.number}, ${busy ? `ocupada, ${formatMoney(table.total)}` : 'libre'}`}
      accessibilityHint={busy ? 'Agrega platillos a esta mesa' : 'Toma el pedido de esta mesa'}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        busy
          ? { backgroundColor: `${Brand.orange}12`, borderColor: `${Brand.orange}88` }
          : { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}>
      <View style={styles.cardTop}>
        <Text style={[styles.number, { color: busy ? Brand.orange : colors.text }]}>{table.number}</Text>
        <View style={styles.badges}>
          {table.unsent > 0 && (
            <View style={[styles.badge, { backgroundColor: '#F59E0B' }]} accessibilityLabel={`${table.unsent} sin enviar`}>
              <SymbolView name={{ ios: 'icloud.slash', android: 'cloud_off', web: 'cloud_off' }} size={12} tintColor={Brand.white} />
              <Text style={styles.badgeText}>{table.unsent}</Text>
            </View>
          )}
          {busy && table.kitchenPending && (
            <SymbolView name={{ ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' }} size={18} tintColor={Brand.orange} />
          )}
        </View>
      </View>

      <Text style={[styles.status, { color: busy ? Brand.orange : Brand.greenLight }]}>
        {busy ? (table.ordersCount > 1 ? `Ocupada · ${table.ordersCount} cuentas` : 'Ocupada') : 'Libre'}
      </Text>
      {busy && (
        <Text style={[styles.total, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {formatMoney(table.total)}
        </Text>
      )}

      {busy ? (
        <View style={styles.cardActions}>
          <CardButton label="+ Pedido" color={Brand.blue} onPress={onOpen} />
          <CardButton label="Cobrar" color={Brand.green} onPress={onCharge} />
        </View>
      ) : (
        <View style={styles.cardActions}>
          <CardButton label="Tomar pedido" color={Brand.green} onPress={onOpen} />
        </View>
      )}
    </Pressable>
  );
}

function CardButton({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.cardButton, { backgroundColor: color, opacity: pressed ? 0.85 : 1 }]}>
      <Text style={styles.cardButtonText} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
    </Pressable>
  );
}

function ManageButton({
  label,
  icon,
  color,
  disabled,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof SymbolView>['name'];
  color: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.manageButton,
        { borderColor: `${color}88`, backgroundColor: pressed ? `${color}33` : `${color}14`, opacity: disabled ? 0.4 : 1 },
      ]}>
      <SymbolView name={icon} size={16} tintColor={color} />
      <Text style={[styles.manageButtonText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontFamily: BrandFonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  state: {
    paddingVertical: 32,
    gap: 16,
    alignItems: 'center',
  },
  stateText: {
    fontFamily: BrandFonts.body,
    fontSize: 15,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flexBasis: '46%',
    flexGrow: 1,
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    padding: 14,
    gap: 2,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  number: {
    fontFamily: BrandFonts.display,
    fontSize: 48,
    lineHeight: 50,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: Radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    color: Brand.white,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 12,
  },
  status: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  total: {
    marginTop: 4,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  cardButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cardButtonText: {
    color: Brand.white,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  manage: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 14,
    gap: 12,
  },
  manageText: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 13,
    textAlign: 'center',
  },
  manageActions: {
    flexDirection: 'row',
    gap: 10,
  },
  manageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
  },
  manageButtonText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
  },
});
