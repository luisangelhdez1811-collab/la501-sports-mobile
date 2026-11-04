import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { ADULTS_ONLY } from '@/api/info';
import { BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

type AlcoholNoticeProps = {
  /** The server's legend (alcohol.legend), or the default one. */
  legend: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Health warning that goes with every drink with alcohol the app shows or sells: product,
 * offer, cart and checkout (Ley General de Salud art. 308, Google Play alcohol policy).
 */
export function AlcoholNotice({ legend, style }: AlcoholNoticeProps) {
  const { colors } = useBrandTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${legend} ${ADULTS_ONLY}`}
      style={[styles.box, { borderColor: colors.border, backgroundColor: colors.background }, style]}>
      <Text style={[styles.legend, { color: colors.text }]}>{legend}</Text>
      <Text style={[styles.adults, { color: colors.warning }]}>{ADULTS_ONLY}</Text>
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
  legend: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  adults: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
