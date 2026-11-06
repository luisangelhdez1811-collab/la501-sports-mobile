import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BrandButton } from '@/components/brand/brand-button';
import { Brand, BrandFonts } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

type MenuStatusProps = {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  emptyText?: string;
};

/** Loading / error / empty states shared by the menu screens. */
export function MenuStatus({ loading, error, onRetry, emptyText = 'Aún no hay platillos disponibles.' }: MenuStatusProps) {
  const { colors } = useBrandTheme();

  if (loading) {
    return (
      <View style={styles.status}>
        <ActivityIndicator size="large" color={Brand.orange} />
        <Text style={[styles.text, { color: colors.textSecondary }]}>Cargando menú…</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.status}>
        <Text style={[styles.title, { color: colors.text }]}>Ups…</Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>{error}</Text>
        <BrandButton title="Reintentar" onPress={onRetry} />
      </View>
    );
  }
  return (
    <View style={styles.status}>
      <Text style={[styles.text, { color: colors.textSecondary }]}>{emptyText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  status: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 56,
  },
  title: {
    fontFamily: BrandFonts.display,
    fontSize: 36,
    letterSpacing: 2,
  },
  text: {
    fontFamily: BrandFonts.body,
    fontSize: 15,
    textAlign: 'center',
  },
});
