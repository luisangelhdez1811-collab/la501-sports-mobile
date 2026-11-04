import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

type MissingBannerProps = {
  missing: string[];
  onRetry: () => void;
};

/** Tells the customer some categories didn't load instead of hiding them silently. */
export function MissingBanner({ missing, onRetry }: MissingBannerProps) {
  const { colors } = useBrandTheme();
  if (missing.length === 0) return null;

  return (
    <View style={[styles.banner, { borderColor: `${colors.warning}55`, backgroundColor: `${colors.warning}14` }]} accessibilityRole="alert">
      <Text style={[styles.text, { color: colors.warning }]}>
        No pudimos cargar {missing.length === 1 ? 'la categoría' : 'las categorías'}{' '}
        <Text style={styles.names}>{missing.join(', ')}</Text>. Espera unos segundos e intenta de nuevo.
      </Text>
      <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8} style={[styles.button, { borderColor: colors.warning }]}>
        <Text style={[styles.buttonText, { color: colors.warning }]}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#FACC1555',
    backgroundColor: '#FACC1514',
  },
  text: {
    flex: 1,
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 13,
    lineHeight: 19,
  },
  names: {
    fontFamily: BrandFonts.bodyBold,
  },
  button: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#FACC15',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonText: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
