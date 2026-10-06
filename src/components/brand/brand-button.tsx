import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

type Variant = 'primary' | 'action' | 'secondary' | 'danger';

type BrandButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: SymbolViewProps['name'];
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

const FILL: Record<'primary' | 'action', { idle: string; pressed: string }> = {
  primary: { idle: Brand.orange, pressed: Brand.orangeDark },
  action: { idle: Brand.green, pressed: Brand.greenDark },
};

/** Primary (orange), action (green), secondary (outlined) and danger buttons. */
export function BrandButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  style,
}: BrandButtonProps) {
  const { colors } = useBrandTheme();
  const inactive = disabled || loading;
  const filled = variant === 'primary' || variant === 'action';
  const textColor = filled ? Brand.white : variant === 'danger' ? Brand.red : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        filled && {
          backgroundColor: pressed ? FILL[variant].pressed : FILL[variant].idle,
          boxShadow: `0 6px 18px ${FILL[variant].idle}55`,
        },
        variant === 'secondary' && {
          backgroundColor: pressed ? colors.border : colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
        },
        variant === 'danger' && {
          backgroundColor: pressed ? `${Brand.red}33` : `${Brand.red}1A`,
          borderColor: `${Brand.red}66`,
          borderWidth: 1,
        },
        inactive && styles.inactive,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon && <SymbolView name={icon} size={18} tintColor={textColor} />}
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    paddingHorizontal: 20,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  inactive: {
    opacity: 0.55,
  },
  title: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
