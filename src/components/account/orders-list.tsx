import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { OrderSummary } from '@/api/account';
import { StatusBadge } from '@/components/brand/status-badge';
import { BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

const dateFormat = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatMoney(value: number) {
  return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Order rows as cards (a table doesn't fit a phone). Tapping opens live tracking. */
export function OrdersList({ orders }: { orders: OrderSummary[] }) {
  const { colors } = useBrandTheme();

  return (
    <View style={styles.list}>
      {orders.map((order) => (
        <Pressable
          key={order.key}
          accessibilityRole={order.trackingToken ? 'button' : undefined}
          disabled={!order.trackingToken}
          onPress={() =>
            order.trackingToken &&
            router.push({ pathname: '/pedido/[token]', params: { token: order.trackingToken } })
          }
          style={({ pressed }) => [
            styles.row,
            { borderColor: colors.border, backgroundColor: pressed ? colors.border : 'transparent' },
          ]}>
          <View style={styles.main}>
            <Text style={[styles.folio, { color: colors.text }]}>#{order.folio}</Text>
            {order.createdAt && (
              <Text style={[styles.date, { color: colors.textSecondary }]}>
                {dateFormat.format(order.createdAt)}
              </Text>
            )}
          </View>
          <View style={styles.side}>
            <Text style={[styles.total, { color: colors.text }]}>{formatMoney(order.total)}</Text>
            <StatusBadge status={order.status} />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 14,
  },
  main: {
    gap: 4,
    flexShrink: 1,
  },
  folio: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 16,
  },
  date: {
    fontFamily: BrandFonts.body,
    fontSize: 13,
  },
  side: {
    alignItems: 'flex-end',
    gap: 6,
  },
  total: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 16,
  },
});
