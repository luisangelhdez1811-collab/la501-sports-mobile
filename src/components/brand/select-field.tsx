import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

type SelectFieldProps = {
  label: string;
  placeholder: string;
  options: readonly string[];
  value: string | null;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string | null;
};

/** Dropdown styled like the text fields; options open in a bottom sheet. */
export function SelectField({
  label,
  placeholder,
  options,
  value,
  onChange,
  required,
  error,
}: SelectFieldProps) {
  const { colors, scheme } = useBrandTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
        {required && <Text style={{ color: Brand.orange }}> *</Text>}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ?? placeholder}`}
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          {
            borderColor: error ? Brand.red : colors.border,
            backgroundColor: scheme === 'dark' ? '#121110' : colors.surface,
          },
        ]}>
        <Text
          style={[styles.value, { color: value ? colors.text : colors.textSecondary }]}
          numberOfLines={1}>
          {value ?? placeholder}
        </Text>
        <SymbolView
          name={{
            ios: 'chevron.down',
            android: 'expand_more',
            web: 'expand_more',
          }}
          size={18}
          tintColor={colors.textSecondary}
        />
      </Pressable>
      {!!error && <Text style={styles.error}>{error}</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          accessibilityLabel="Cerrar">
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                paddingBottom: insets.bottom + 12,
              },
            ]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{label}</Text>
            <ScrollView style={styles.options} contentContainerStyle={styles.optionsContent}>
              {options.map((option) => {
                const selected = option === value;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      onChange(option);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      { borderColor: selected ? Brand.orange : colors.border },
                      pressed && { backgroundColor: colors.border },
                    ]}>
                    <Text style={[styles.optionText, { color: colors.text }]}>{option}</Text>
                    {selected && (
                      <SymbolView
                        name={{
                          ios: 'checkmark',
                          android: 'check',
                          web: 'check',
                        }}
                        size={18}
                        tintColor={Brand.orange}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  field: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  value: {
    flex: 1,
    fontFamily: BrandFonts.body,
    fontSize: 16,
  },
  error: {
    color: Brand.red,
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 13,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    borderTopLeftRadius: Radius.lg + 4,
    borderTopRightRadius: Radius.lg + 4,
    maxHeight: '85%',
    padding: 20,
    gap: 10,
  },
  options: {
    flexShrink: 1,
  },
  optionsContent: {
    gap: 10,
  },
  sheetTitle: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 18,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  optionText: {
    flex: 1,
    fontFamily: BrandFonts.body,
    fontSize: 15,
  },
});
