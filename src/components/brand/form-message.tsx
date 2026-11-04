import { StyleSheet, Text, View } from 'react-native';

import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

/** Inline success / error / info banner for forms. */
export function FormMessage({ type, children }: { type: 'error' | 'success' | 'info'; children: string }) {
  const { colors } = useBrandTheme();
  const color = type === 'error' ? Brand.red : type === 'success' ? colors.success : colors.warning;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.box, { borderColor: `${color}66`, backgroundColor: `${color}14` }]}>
      <Text style={[styles.text, { color }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  text: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
  },
});
