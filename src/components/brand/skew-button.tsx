import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { Brand, BrandFonts } from '@/constants/brand';

type SkewButtonProps = {
  title: string;
  onPress: () => void;
  color?: 'orange' | 'green';
  loading?: boolean;
  style?: ViewStyle;
};

const COLORS = {
  orange: { idle: Brand.orange, pressed: Brand.orangeDark },
  green: { idle: Brand.green, pressed: Brand.greenDark },
};

/** Slanted call-to-action ("VER MENÚ", "UNIRME →", "INICIAR SESIÓN"). */
export function SkewButton({ title, onPress, color = 'orange', loading = false, style }: SkewButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? COLORS[color].pressed : COLORS[color].idle },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={Brand.white} style={styles.unskew} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ skewX: '-12deg' }],
  },
  unskew: {
    transform: [{ skewX: '12deg' }],
  },
  text: {
    color: Brand.white,
    fontFamily: BrandFonts.labelBold,
    fontSize: 16,
    letterSpacing: 3,
    textTransform: 'uppercase',
    transform: [{ skewX: '12deg' }],
  },
});
