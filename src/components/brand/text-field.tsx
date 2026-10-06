import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  /** Adds the eye toggle and hides the value. */
  password?: boolean;
};

export function TextField({
  label,
  required,
  hint,
  error,
  password,
  editable = true,
  ...inputProps
}: TextFieldProps) {
  const { colors, scheme } = useBrandTheme();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  const borderColor = error ? Brand.red : focused ? Brand.orange : colors.border;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <View
        style={[
          styles.inputRow,
          {
            borderColor,
            backgroundColor: scheme === 'dark' ? '#121110' : colors.surface,
            boxShadow: focused ? `0 0 0 3px ${Brand.orange}26` : undefined,
            opacity: editable ? 1 : 0.6,
          },
        ]}>
        <TextInput
          // Passwords are typed exactly as entered: no auto-capital, autocorrect or
          // suggestions (they'd change it silently when the eye toggle shows it).
          {...(password && { autoCapitalize: 'none', autoCorrect: false, spellCheck: false })}
          {...inputProps}
          editable={editable}
          secureTextEntry={password && !visible}
          placeholderTextColor={colors.textSecondary}
          selectionColor={Brand.orange}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          style={[styles.input, { color: colors.text }]}
          accessibilityLabel={label}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            hitSlop={10}
            onPress={() => setVisible((v) => !v)}>
            <SymbolView
              name={
                visible
                  ? { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' }
                  : { ios: 'eye', android: 'visibility', web: 'visibility' }
              }
              size={20}
              tintColor={colors.textSecondary}
            />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {!error && !!hint && <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  required: {
    color: Brand.orange,
  },
  inputRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontFamily: BrandFonts.body,
    fontSize: 16,
  },
  error: {
    color: Brand.red,
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 13,
  },
  hint: {
    fontFamily: BrandFonts.body,
    fontSize: 12,
  },
});
