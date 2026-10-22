import { StyleSheet, Text, View } from 'react-native';

import { Brand, BrandFonts } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

type TitleProps = {
  /** First word(s), in the text color. */
  lead: string;
  /** Highlighted word(s). */
  accent: string;
  accentColor?: 'orange' | 'green';
  size?: number;
  align?: 'left' | 'center';
};

/** Bebas Neue title with one word in white and another in orange or green. */
export function BrandTitle({ lead, accent, accentColor = 'orange', size = 44, align = 'left' }: TitleProps) {
  const { colors } = useBrandTheme();
  return (
    <Text
      accessibilityRole="header"
      style={[
        styles.title,
        { color: colors.text, fontSize: size, lineHeight: size * 1.1, textAlign: align },
      ]}>
      {lead}{' '}
      <Text style={{ color: accentColor === 'orange' ? Brand.orange : Brand.greenLight }}>
        {accent}
      </Text>
    </Text>
  );
}

/** Section title with the orange→green vertical bar (e.g. "NUESTRA HISTORIA"). */
export function SectionHeading({ children, emoji }: { children: React.ReactNode; emoji?: string }) {
  return (
    <View style={styles.heading}>
      <View style={styles.bar} />
      {!!emoji && <Text style={styles.emoji}>{emoji}</Text>}
      <View style={styles.headingText}>{children}</View>
    </View>
  );
}

/** Small centered label between two hairlines (e.g. "MISIÓN Y VISIÓN"). */
export function DividerLabel({ children }: { children: string }) {
  const { colors } = useBrandTheme();
  return (
    <View style={styles.divider}>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
      <Text style={styles.dividerText}>{children}</Text>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: BrandFonts.display,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bar: {
    width: 4,
    alignSelf: 'stretch',
    minHeight: 36,
    borderRadius: 2,
    experimental_backgroundImage: `linear-gradient(180deg, ${Brand.orange}, ${Brand.green})`,
  },
  emoji: {
    fontSize: 26,
  },
  headingText: {
    flexShrink: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    color: Brand.orange,
    fontFamily: BrandFonts.label,
    fontSize: 14,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
});
