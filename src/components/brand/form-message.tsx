import { StyleSheet, Text, View } from 'react-native';

import { Brand, BrandFonts, Radius } from '@/constants/brand';

/** Inline success / error banner for forms. */
export function FormMessage({ type, children }: { type: 'error' | 'success'; children: string }) {
  const color = type === 'error' ? Brand.red : Brand.greenLight;
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
