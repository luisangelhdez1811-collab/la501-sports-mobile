import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { addTable, getTables, type RestaurantTable } from '@/api/waiter';
import { formatMoney } from '@/components/account/orders-list';
import { AdminScreen } from '@/components/admin/admin-screen';
import { PanelState } from '@/components/admin/admin-ui';
import { ChargeSheet } from '@/components/waiter/charge-sheet';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useAdminResource } from '@/hooks/use-admin-resource';
import { useBrandTheme } from '@/hooks/use-brand-theme';

// Other waiters change tables too: refresh the map every so often while it's open.
const REFRESH_MS = 20_000;

/** Waiter home: every table with its state, to take orders and charge. */
export default function TablesMapScreen() {
  const tables = useAdminResource('waiter-tables', getTables);
  const [charging, setCharging] = useState<RestaurantTable | null>(null);
  const [adding, setAdding] = useState(false);
  const { refresh } = tables;

  useEffect(() => {
    const timer = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer);
    // `refresh` is recreated every render; one timer for the screen's lifetime is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = tables.data ?? [];

  const add = () => {
    Alert.alert('Agregar mesa', '¿Agregar una mesa nueva al mapa?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Agregar',
        onPress: async () => {
          setAdding(true);
          try {
            await addTable();
            tables.reload();
          } catch (err) {
            Alert.alert('No se pudo agregar', errorMessage(err));
          } finally {
            setAdding(false);
          }
        },
      },
    ]);
  };

  const openOrder = (table: RestaurantTable) =>
    router.push({ pathname: '/mesa/[id]', params: { id: String(table.id), numero: table.number } });

  return (
    <AdminScreen
      title="Mapa de mesas"
      subtitle="Gestiona los pedidos de los comensales."
      refreshing={tables.refreshing}
      onRefresh={tables.refresh}>
      <Pressable
        accessibilityRole="button"
        onPress={add}
        disabled={adding || tables.unavailable}
        style={({ pressed }) => [styles.addTable, { opacity: adding ? 0.6 : pressed ? 0.8 : 1 }]}>
        <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={18} tintColor={Brand.white} />
        <Text style={styles.addTableText}>{adding ? 'Agregando…' : 'Agregar mesa'}</Text>
      </Pressable>

      <PanelState
        loading={tables.loading}
        error={tables.error}
        unavailable={tables.unavailable}
        endpoint="GET /app/waiter/tables"
        empty={!!tables.data && list.length === 0}
        emptyText="Aún no hay mesas. Agrega la primera."
        onRetry={tables.reload}
      />

      <View style={styles.grid}>
        {list.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            onOrder={() => openOrder(table)}
            onCharge={() => setCharging(table)}
          />
        ))}
      </View>

      {charging && (
        <ChargeSheet
          key={charging.id}
          table={charging}
          onClose={() => setCharging(null)}
          onCharged={(table) => {
            setCharging(null);
            tables.reload();
            Alert.alert('¡Éxito!', `Mesa ${table.number} cobrada exitosamente.`);
          }}
        />
      )}
    </AdminScreen>
  );
}

function TableCard({ table, onOrder, onCharge }: { table: RestaurantTable; onOrder: () => void; onCharge: () => void }) {
  const { colors } = useBrandTheme();
  const busy = table.status === 'ocupada';
  const accent = busy ? Brand.orange : Brand.greenLight;

  return (
    <View
      style={[
        styles.card,
        busy
          ? { backgroundColor: `${Brand.orange}0F`, borderColor: `${Brand.orange}66` }
          : { backgroundColor: colors.surface, borderColor: colors.border },
      ]}>
      <Text style={[styles.number, { color: busy ? Brand.orange : colors.text }]}>#{table.number}</Text>
      <Text style={[styles.status, { color: accent }]}>{busy ? 'Ocupada' : 'Disponible'}</Text>
      {busy && (
        <View style={styles.totalBox}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total</Text>
          <Text style={[styles.total, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(table.total)}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        {busy ? (
          <>
            <CardButton label="Agregar más" color={Brand.blue} onPress={onOrder} />
            <CardButton
              label={table.kitchenPending ? 'Forzar cobro' : 'Cobrar mesa'}
              color={table.kitchenPending ? Brand.red : Brand.green}
              onPress={onCharge}
            />
          </>
        ) : (
          <CardButton label="Tomar pedido" color={Brand.green} onPress={onOrder} />
        )}
      </View>
    </View>
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

const styles = StyleSheet.create({
  addTable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: Radius.md,
    backgroundColor: Brand.blue,
  },
  addTableText: {
    color: Brand.white,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flexBasis: '46%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 14,
    gap: 2,
  },
  number: {
    fontFamily: BrandFonts.display,
    fontSize: 40,
    lineHeight: 42,
  },
  status: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  totalBox: {
    marginTop: 6,
  },
  totalLabel: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  total: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 20,
  },
  actions: {
    gap: 8,
    marginTop: 12,
  },
  cardButton: {
    minHeight: 42,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  cardButtonText: {
    color: Brand.white,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
