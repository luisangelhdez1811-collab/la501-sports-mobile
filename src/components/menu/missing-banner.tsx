import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandFonts, Radius } from '@/constants/brand';

type MissingBannerProps = {
  missing: string[];
  onRetry: () => void;
};

/** Tells the customer some categories didn't load instead of hiding them silently. */
export function MissingBanner({ missing, onRetry }: MissingBannerProps) {
  if (missing.length === 0) return null;

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.text}>
        No pudimos cargar {missing.length === 1 ? 'la categoría' : 'las categorías'}{' '}
        <Text style={styles.names}>{missing.join(', ')}</Text>. Espera unos segundos e intenta de nuevo.
      </Text>
      <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8} style={styles.button}>
        <Text style={styles.buttonText}>Reintentar</Text>
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
    color: '#FACC15',
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
    color: '#FACC15',
    fontFamily: BrandFonts.labelBold,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
