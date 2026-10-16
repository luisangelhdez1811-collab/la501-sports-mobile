import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { ImagePlaceholder } from '@/components/brand/image-placeholder';
import { SkewButton } from '@/components/brand/skew-button';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import type { Promotion } from '@/types/product';

const DESCRIPTION_LINES = 3;
const DESCRIPTION_LINE_HEIGHT = 21;

type PromoCardProps = {
  promo: Promotion;
  /** "Aprovechar": adds the offer to the order. Hidden for in-store-only offers. */
  onAdd?: (promo: Promotion) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Offer card as on the website: photo with ribbon, title, description, then the price
 * next to "Aprovechar" (delivery offers) or "Solo en el local · Pide con tu mesero".
 * Text areas have fixed heights so every card in the carousel is the same size.
 */
export function PromoCard({ promo, onAdd, style }: PromoCardProps) {
  const { colors } = useBrandTheme();
  const [added, setAdded] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const orderable = !promo.storeOnly && promo.available && promo.id !== null && !!onAdd;

  useEffect(() => () => clearTimeout(addedTimer.current), []);

  const add = () => {
    onAdd?.(promo);
    setAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(false), 1500);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      <View style={styles.media}>
        {promo.image ? (
          <Image source={{ uri: promo.image }} style={styles.image} contentFit="cover" transition={200} />
        ) : (
          <ImagePlaceholder style={styles.image} />
        )}
        {!!promo.badge && (
          <View style={styles.ribbon}>
            <Text style={styles.ribbonText}>{promo.badge}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {promo.name}
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={DESCRIPTION_LINES}>
          {promo.description}
        </Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.footer}>
          <Text style={styles.price} adjustsFontSizeToFit numberOfLines={1}>
            {promo.priceLabel}
          </Text>
          {orderable ? (
            <SkewButton title={added ? 'Agregado ✓' : 'Aprovechar'} color={added ? 'green' : 'orange'} onPress={add} style={styles.button} />
          ) : promo.storeOnly ? (
            <View style={[styles.availability, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Text style={[styles.availabilityTop, { color: colors.textSecondary }]}>Solo en el local</Text>
              <Text style={styles.availabilityBottom}>Pide con tu mesero</Text>
            </View>
          ) : promo.availability ? (
            <View style={[styles.availability, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Text style={[styles.availabilityTop, { color: colors.textSecondary }]}>Disponible</Text>
              <Text style={styles.availabilityBottom}>{promo.availability}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg + 8,
    overflow: 'hidden',
  },
  media: {
    aspectRatio: 16 / 9,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  ribbon: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: Brand.orange,
    paddingHorizontal: 12,
    paddingVertical: 4,
    transform: [{ skewX: '-12deg' }],
  },
  ribbonText: {
    color: Brand.white,
    fontFamily: BrandFonts.labelBold,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    transform: [{ skewX: '12deg' }],
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 8,
  },
  title: {
    fontFamily: BrandFonts.display,
    fontSize: 28,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  description: {
    fontFamily: BrandFonts.body,
    fontSize: 14,
    lineHeight: DESCRIPTION_LINE_HEIGHT,
    // Same height with short or long text, so all cards line up.
    height: DESCRIPTION_LINES * DESCRIPTION_LINE_HEIGHT,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  footer: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  price: {
    flex: 1,
    color: Brand.greenLight,
    fontFamily: BrandFonts.display,
    fontSize: 36,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  button: {
    minHeight: 44,
    paddingHorizontal: 22,
    marginRight: 6,
  },
  availability: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: 'flex-end',
  },
  availabilityTop: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  availabilityBottom: {
    color: Brand.orange,
    fontFamily: BrandFonts.labelBold,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
