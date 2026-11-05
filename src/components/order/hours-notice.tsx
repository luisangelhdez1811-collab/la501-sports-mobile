import { StyleSheet, Text, View } from 'react-native';

import { BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useRestaurantInfo } from '@/hooks/use-restaurant';
import { nextOpening, todayHours } from '@/utils/opening-hours';

type HoursNoticeProps = {
  /** checkout: always says the hours; order: only while it waits for the restaurant to open. */
  context: 'checkout' | 'order';
};

/**
 * The restaurant cooks and delivers only during its opening hours: an order placed while
 * it's closed is received, and preparing it starts when it opens.
 */
export function HoursNotice({ context }: HoursNoticeProps) {
  const { colors } = useBrandTheme();
  const { hours } = useRestaurantInfo();
  const opens = nextOpening(hours);

  if (!opens && context === 'order') return null;

  const text = opens
    ? context === 'checkout'
      ? `Ahora estamos cerrados. Puedes hacer tu pedido, pero lo empezamos a preparar y enviar cuando abramos, ${opens}.`
      : `Estamos cerrados. Recibimos tu pedido y lo empezamos a preparar cuando abramos, ${opens}.`
    : `Servicio a domicilio ${todayHours(hours)}. Los pedidos hechos fuera de ese horario se preparan y envían al abrir.`;

  return (
    <View
      accessible
      accessibilityRole={opens ? 'alert' : undefined}
      style={[
        styles.box,
        { backgroundColor: colors.background, borderColor: opens ? colors.warning : colors.border },
      ]}>
      {!!opens && <Text style={[styles.title, { color: colors.warning }]}>Fuera de horario</Text>}
      <Text style={[styles.text, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  title: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  text: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
});
