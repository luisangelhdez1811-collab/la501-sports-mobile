import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ImagePlaceholder } from '@/components/brand/image-placeholder';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import type { Product } from '@/types/product';
import { menuImage } from '@/utils/image-source';

type ProductCardProps = {
  product: Product;
  width: number;
  onPress: (product: Product) => void;
  /** Call to action at the bottom of the card, e.g. "Agregar" in the ordering flow. */
  actionLabel?: string;
};

/** Browse-only menu card; tapping it opens the full dish details. */
export function ProductCard({ product, width, onPress, actionLabel = 'Ver detalles' }: ProductCardProps) {
  const { colors } = useBrandTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, $${product.price.toFixed(2)}. ${actionLabel}`}
      onPress={() => onPress(product)}
      style={({ pressed }) => [
        styles.card,
        { width, backgroundColor: colors.surface, borderColor: pressed ? Brand.orange : colors.border },
        pressed && styles.pressed,
      ]}>
      <View style={styles.imageWrapper}>
        {product.image ? (
          <Image
            source={menuImage(product.image)}
            style={styles.image}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <ImagePlaceholder style={styles.image} />
        )}
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>${product.price.toFixed(2)}</Text>
        </View>
        {!product.available && (
          <View style={[styles.soldOut, { backgroundColor: colors.scrim }]}>
            <Text style={styles.soldOutText}>Agotado</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
          {product.name}
        </Text>
        {!!product.description && (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3}>
            {product.description}
          </Text>
        )}
        <View style={styles.more}>
          <Text style={styles.moreText}>{actionLabel}</Text>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={12}
            tintColor={Brand.orange}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageWrapper: {
    aspectRatio: 1.2,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  priceBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: Brand.orange,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  priceText: {
    color: Brand.white,
    fontFamily: BrandFonts.labelBold,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  soldOut: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOutText: {
    color: Brand.red,
    fontFamily: BrandFonts.labelBold,
    fontSize: 16,
    letterSpacing: 3,
    textTransform: 'uppercase',
    borderWidth: 1.5,
    borderColor: Brand.red,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  body: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  name: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 17,
    lineHeight: 22,
  },
  description: {
    flex: 1,
    fontFamily: BrandFonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  moreText: {
    color: Brand.orange,
    fontFamily: BrandFonts.labelBold,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
