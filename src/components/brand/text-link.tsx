import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, BrandFonts } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

type TextLinkProps = {
  /** Muted text before the link, e.g. "¿No tienes cuenta?". */
  prefix?: string;
  label: string;
  onPress: () => void;
  muted?: boolean;
};

export function TextLink({ prefix, label, onPress, muted = false }: TextLinkProps) {
  const { colors } = useBrandTheme();
  return (
    <View style={styles.row}>
      {!!prefix && <Text style={[styles.text, { color: colors.textSecondary }]}>{prefix} </Text>}
      <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8}>
        <Text
          style={[
            styles.text,
            muted ? { color: colors.textSecondary } : { color: Brand.orange, fontFamily: BrandFonts.bodyBold },
          ]}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

/** "──── o ────" separator. */
export function OrDivider() {
  const { colors } = useBrandTheme();
  return (
    <View style={styles.divider}>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
      <Text style={[styles.text, { color: colors.textSecondary }]}>o</Text>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  text: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
});
