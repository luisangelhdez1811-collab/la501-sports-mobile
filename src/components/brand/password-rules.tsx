import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { Brand, BrandFonts } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { PASSWORD_RULES } from '@/utils/validation';

/** Live checklist under the new-password field. */
export function PasswordRules({ value }: { value: string }) {
  const { colors } = useBrandTheme();

  return (
    <View style={styles.list} accessibilityLabel="Requisitos de la contraseña">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value);
        return (
          <View key={rule.label} style={styles.row}>
            <SymbolView
              name={
                ok
                  ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }
                  : { ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' }
              }
              size={16}
              tintColor={ok ? Brand.greenLight : colors.textSecondary}
            />
            <Text style={[styles.text, { color: ok ? Brand.greenLight : colors.textSecondary }]}>
              {rule.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 6,
    marginTop: -8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 13,
  },
});
