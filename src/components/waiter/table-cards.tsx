import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ItemStatus, TableOrder, TableOrderItem } from '@/api/waiter';
import { Brand, BrandFonts, Radius, type BrandPalette } from '@/constants/brand';
import { formatMoney } from '@/domain/money';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import type { Station } from '@/types/product';

/** Cards of the "Cuentas" tab of a table (waiter). */

const STATION_LABELS: Record<Station, string> = { cocina: 'Cocina', barra: 'Barra', ninguna: 'Directo' };
// Palette keys, so each status reads in light and dark mode (AA).
const ITEM_STATUS: Record<ItemStatus, { label: string; tone: keyof BrandPalette }> = {
  preparing: { label: 'Preparando', tone: 'warning' },
  ready: { label: 'Por entregar', tone: 'success' },
  served: { label: 'Entregado', tone: 'textSecondary' },
};

const itemDetails = (item: TableOrderItem) =>
  [item.optionsSummary, item.excluded.length > 0 ? `Sin ${item.excluded.join(', ').toLowerCase()}` : '', item.notes.trim()]
    .filter(Boolean)
    .join(' · ');

/** One person's account: what they ordered (with their changes) and what they owe. */
export function AccountCard({ order, onCharge }: { order: TableOrder; onCharge: () => void }) {
  const { colors } = useBrandTheme();
  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={styles.top}>
        <SymbolView name={{ ios: 'person.fill', android: 'person', web: 'person' }} size={18} tintColor={Brand.blue} />
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {order.label}
        </Text>
        {order.unsent ? (
          <Text style={[styles.badge, { color: colors.warning, borderColor: colors.warning }]}>Sin enviar</Text>
        ) : (
          order.kitchenPending && (
            <Text style={[styles.badge, { color: colors.accent, borderColor: colors.accent }]}>En preparación</Text>
          )
        )}
      </View>

      {order.items.length > 0 ? (
        order.items.map((item, i) => (
          <View key={i} style={styles.item}>
            <Text style={[styles.quantity, { color: colors.textSecondary }]}>{item.quantity}×</Text>
            <View style={styles.itemText}>
              <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
              {!!itemDetails(item) && <Text style={[styles.details, { color: colors.accent }]}>{itemDetails(item)}</Text>}
              {item.id !== null && (
                <Text style={[styles.status, { color: colors[ITEM_STATUS[item.status].tone] }]}>
                  {ITEM_STATUS[item.status].label} · {STATION_LABELS[item.station]}
                </Text>
              )}
            </View>
            <Text style={[styles.price, { color: colors.text }]}>{formatMoney(item.price * item.quantity)}</Text>
          </View>
        ))
      ) : (
        <Text style={[styles.quantity, { color: colors.textSecondary }]}>Sin detalle de platillos.</Text>
      )}

      <View style={[styles.bottom, { borderTopColor: colors.border }]}>
        <Text style={[styles.total, { color: colors.text }]}>{formatMoney(order.total)}</Text>
        {order.unsent ? (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>Se cobra cuando llegue al sistema.</Text>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Cobrar a ${order.label}`}
            onPress={onCharge}
            style={({ pressed }) => [styles.charge, { opacity: pressed ? 0.85 : 1 }]}>
            <Text style={styles.chargeText}>Cobrar a {order.label}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/**
 * Dishes kitchen and bar finished (and drinks that need no preparing) still to be taken to
 * the table; tapping one marks it as served, like the website's "Por entregar".
 */
export function ToServeCard({
  entries,
  serving,
  disabled,
  onServe,
  onServeAll,
}: {
  entries: { order: TableOrder; item: TableOrderItem }[];
  serving: number[];
  disabled: boolean;
  onServe: (item: TableOrderItem) => void;
  onServeAll: () => void;
}) {
  const { colors } = useBrandTheme();
  return (
    <View style={[styles.card, { borderColor: colors.success, backgroundColor: `${Brand.green}0F` }]}>
      <View style={styles.top}>
        <SymbolView name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }} size={18} tintColor={colors.success} />
        <Text style={[styles.name, { color: colors.success }]}>Por entregar</Text>
        <Pressable accessibilityRole="button" disabled={disabled} onPress={onServeAll} hitSlop={8} style={disabled && styles.dim}>
          <Text style={[styles.serveAll, { color: colors.textSecondary }]}>Entregar todo</Text>
        </Pressable>
      </View>
      {disabled && (
        <Text style={[styles.hint, styles.left, { color: colors.textSecondary }]}>Sin conexión: márcalos cuando vuelva el internet.</Text>
      )}
      {entries.map(({ order, item }) => {
        const busy = item.id !== null && serving.includes(item.id);
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`Marcar como entregado: ${item.quantity} ${item.name} de ${order.label}`}
            disabled={disabled || busy}
            onPress={() => onServe(item)}
            style={({ pressed }) => [
              styles.serveRow,
              { borderColor: colors.border, backgroundColor: pressed ? colors.background : colors.surface },
              (disabled || busy) && styles.dim,
            ]}>
            <View style={[styles.serveBox, { borderColor: colors.success }]}>
              {busy && <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={14} tintColor={colors.success} />}
            </View>
            <View style={styles.itemText}>
              <Text style={[styles.itemName, { color: colors.text }]}>
                {item.quantity}× {item.name}
              </Text>
              {!!itemDetails(item) && <Text style={[styles.details, { color: colors.accent }]}>{itemDetails(item)}</Text>}
              <Text style={[styles.status, { color: colors.textSecondary }]}>
                {order.label} · {STATION_LABELS[item.station]}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 17,
  },
  badge: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  quantity: {
    minWidth: 28,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
  },
  itemText: {
    flex: 1,
  },
  itemName: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 14,
  },
  details: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 12,
  },
  status: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  price: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  total: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    flex: 1,
    textAlign: 'right',
    fontFamily: BrandFonts.body,
    fontSize: 13,
  },
  left: {
    textAlign: 'left',
  },
  charge: {
    flexShrink: 1,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: Radius.sm,
    backgroundColor: Brand.greenFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chargeText: {
    color: Brand.white,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
    textTransform: 'uppercase',
  },
  serveAll: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  serveRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minHeight: 52,
    padding: 10,
    borderWidth: 1,
    borderRadius: Radius.sm,
  },
  serveBox: {
    width: 24,
    height: 24,
    marginTop: 1,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: {
    opacity: 0.4,
  },
});
