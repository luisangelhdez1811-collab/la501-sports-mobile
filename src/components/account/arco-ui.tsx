import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

/** Pieces of "Mis datos y privacidad" (derechos ARCO). */

/** Card with an ARCO letter badge (A, R, C, O), title and description. */
export function RightCard({
  letter,
  title,
  description,
  color = Brand.orange,
  children,
}: {
  letter: string;
  title: string;
  description: string;
  color?: string;
  children: ReactNode;
}) {
  const { colors } = useBrandTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderTopColor: color }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.letter, { backgroundColor: `${color}1F`, borderColor: `${color}66` }]}>
          <Text style={[styles.letterText, { color: colors.text }]}>{letter}</Text>
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={[styles.cardTitle, { color: colors.text }]} accessibilityRole="header">
            {title}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

export function DataRow({ label, value }: { label: string; value: string }) {
  const { colors } = useBrandTheme();
  return (
    <View style={[styles.dataRow, { borderTopColor: colors.border }]}>
      <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.dataValue, { color: colors.text }]} selectable>
        {value || '—'}
      </Text>
    </View>
  );
}

export function PrivacySwitch({
  title,
  description,
  value,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled: boolean;
}) {
  const { colors } = useBrandTheme();
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchText}>
        <Text style={[styles.switchTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: Brand.greenFill }}
        thumbColor={Brand.white}
        accessibilityLabel={title}
      />
    </View>
  );
}

export function LinkRow({ icon, label, onPress }: { icon: SymbolViewProps['name']; label: string; onPress: () => void }) {
  const { colors } = useBrandTheme();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [styles.linkRow, { borderColor: colors.border, backgroundColor: pressed ? colors.border : colors.surface }]}>
      <SymbolView name={icon} size={18} tintColor={colors.accent} />
      <Text style={[styles.linkText, { color: colors.text }]}>{label}</Text>
      <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={16} tintColor={colors.textSecondary} />
    </Pressable>
  );
}

export const arcoStyles = StyleSheet.create({
  description: {
    fontFamily: BrandFonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderTopWidth: 3,
    borderRadius: Radius.lg,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  letter: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    fontFamily: BrandFonts.display,
    fontSize: 24,
  },
  cardHeaderText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 19,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  description: arcoStyles.description,
  dataRow: {
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  dataLabel: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  dataValue: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 15,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  switchTitle: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  linkText: {
    flex: 1,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
  },
});
