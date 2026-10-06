import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  accessibilityLabel?: string;
};

export function Checkbox({ checked, onChange, children, accessibilityLabel }: CheckboxProps) {
  const { colors } = useBrandTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      onPress={() => onChange(!checked)}
      style={styles.row}
      hitSlop={6}>
      <View
        style={[
          styles.box,
          checked
            ? { backgroundColor: Brand.orange, borderColor: Brand.orange }
            : { borderColor: colors.border, backgroundColor: colors.background },
        ]}>
        {checked && (
          <SymbolView
            name={{ ios: 'checkmark', android: 'check', web: 'check' }}
            size={16}
            tintColor={Brand.white}
          />
        )}
      </View>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm - 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontFamily: BrandFonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
});
