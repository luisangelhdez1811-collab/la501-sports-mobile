import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useIsOffline } from '@/hooks/use-connectivity';

type OfflineBannerProps = {
  /** The data on screen is a saved copy because the server couldn't be reached. */
  stale?: boolean;
  onRetry?: () => void;
  style?: ViewStyle;
};

/** "Sin conexión" — appears the moment the device goes offline. */
export function OfflineBanner({ stale = false, onRetry, style }: OfflineBannerProps) {
  const { colors } = useBrandTheme();
  const offline = useIsOffline();
  if (!offline && !stale) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      <SymbolView
        name={{ ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' }}
        size={18}
        tintColor={colors.textSecondary}
      />
      <Text style={[styles.text, { color: colors.text }]}>Sin conexión</Text>
      {onRetry && (
        <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8}>
          <Text style={[styles.retry, { color: colors.text }]}>Reintentar</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  text: {
    flex: 1,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
  },
  retry: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textDecorationLine: 'underline',
  },
});
