import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

type FormCardProps = {
  children: ReactNode;
  /** Big centered header: orange icon tile + Bebas title + subtitle (login, registro…). */
  icon?: SymbolViewProps['name'];
  title?: string;
  subtitle?: string;
  footer?: string;
  /** Direction of the top border gradient. */
  accent?: 'orange-green' | 'green-orange' | 'orange' | 'green';
  style?: ViewStyle;
};

const ACCENTS = {
  'orange-green': `linear-gradient(90deg, ${Brand.orange}, ${Brand.green})`,
  'green-orange': `linear-gradient(90deg, ${Brand.green}, ${Brand.orange})`,
  orange: `linear-gradient(90deg, ${Brand.orange}, ${Brand.orange})`,
  green: `linear-gradient(90deg, ${Brand.greenLight}, ${Brand.greenLight})`,
} as const;

/** Surface card with the gradient top border from the design system. */
export function FormCard({
  children,
  icon,
  title,
  subtitle,
  footer,
  accent = 'orange-green',
  style,
}: FormCardProps) {
  const { colors } = useBrandTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      <View style={[styles.accent, { experimental_backgroundImage: ACCENTS[accent] }]} />
      <View style={styles.body}>
        {(icon || title) && (
          <View style={styles.header}>
            {icon && (
              <View style={styles.iconTile}>
                <SymbolView name={icon} size={26} tintColor={Brand.white} />
              </View>
            )}
            {!!title && (
              <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
                {title}
              </Text>
            )}
            {!!subtitle && (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
            )}
          </View>
        )}
        {children}
      </View>
      {!!footer && (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>{footer}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg + 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accent: {
    height: 4,
  },
  body: {
    padding: 22,
    gap: 18,
  },
  header: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  iconTile: {
    width: 60,
    height: 60,
    borderRadius: Radius.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    experimental_backgroundImage: `linear-gradient(135deg, ${Brand.orange}, ${Brand.orangeDark})`,
    boxShadow: `0 6px 20px ${Brand.orange}55`,
  },
  title: {
    fontFamily: BrandFonts.display,
    fontSize: 36,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: BrandFonts.body,
    fontSize: 12,
  },
});
