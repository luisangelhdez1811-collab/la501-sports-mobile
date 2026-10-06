import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { SectionTag } from '@/components/brand/section-tag';
import { BrandTitle } from '@/components/brand/typography';
import { Brand, BrandFonts } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

const logo = require('@/assets/images/logo-501.png');

type PageHeroProps = {
  tag: string;
  lead: string;
  accent: string;
  description?: string;
  align?: 'left' | 'center';
  /** Centered heroes (Promociones, Novedades) stack the two title words. */
  size?: number;
  accentColor?: 'orange' | 'green';
};

/** Page header from the website: slanted tag, two-tone title, faded logo watermark. */
export function PageHero({ tag, lead, accent, description, align = 'left', size = 46, accentColor }: PageHeroProps) {
  const { colors } = useBrandTheme();
  const centered = align === 'center';

  return (
    <View
      style={[
        styles.container,
        centered && styles.centered,
        { experimental_backgroundImage: `linear-gradient(180deg, ${colors.heroTop}, ${colors.background})` },
      ]}>
      <View style={styles.watermark} pointerEvents="none">
        {Array.from({ length: 8 }, (_, i) => (
          <Image key={i} source={logo} style={styles.watermarkLogo} contentFit="contain" tintColor={colors.text} />
        ))}
      </View>

      <View style={centered && styles.tagCentered}>
        <SectionTag>{tag}</SectionTag>
      </View>
      <BrandTitle lead={lead} accent={accent} size={size} align={align} accentColor={accentColor} />
      {!!description && (
        <Text style={[styles.description, centered && styles.textCentered, { color: colors.textSecondary }]}>
          {description}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 6,
    overflow: 'hidden',
    borderBottomWidth: 3,
    borderBottomColor: Brand.orange,
  },
  centered: {
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 32,
  },
  tagCentered: {
    alignItems: 'center',
  },
  watermark: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignContent: 'space-around',
    gap: 20,
    padding: 8,
    opacity: 0.06,
  },
  watermarkLogo: {
    width: 110,
    aspectRatio: 1224 / 624,
  },
  description: {
    fontFamily: BrandFonts.body,
    fontSize: 15,
    lineHeight: 23,
  },
  textCentered: {
    textAlign: 'center',
    maxWidth: 420,
  },
});
