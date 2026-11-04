import { StyleSheet, Text, View } from 'react-native';

import type { OrderStatus } from '@/api/account';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

// "paid" also covers cash orders: confirmed, not collected yet. Never say "Pagado".
const LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  paid: 'Confirmado',
  failed: 'Pago rechazado',
  preparing: 'En preparación',
  ready: 'Listo',
  delivering: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  unknown: 'En proceso',
};

const COLORS: Partial<Record<OrderStatus, string>> = {
  pending: Brand.blue,
  paid: Brand.orange,
  failed: Brand.red,
  preparing: '#F59E0B',
  ready: Brand.greenLight,
  delivering: '#F59E0B',
  delivered: Brand.green,
  cancelled: Brand.red,
};

export function orderStatusLabel(status: OrderStatus) {
  return LABELS[status];
}

/** Outlined status pill, as in the design system ("PENDIENTE", "CONFIRMADA"…). */
export function StatusBadge({ status }: { status: OrderStatus }) {
  const { colors } = useBrandTheme();
  const color = COLORS[status] ?? colors.textSecondary;

  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: `${color}1A` }]}>
      <Text style={[styles.text, { color }]}>{LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  text: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
