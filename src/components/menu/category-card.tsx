import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ImagePlaceholder } from '@/components/brand/image-placeholder';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import type { Category } from '@/types/product';
import { categoryImage } from '@/utils/category-image';
import { menuImage } from '@/utils/image-source';

type CategoryCardProps = {
  category: Category;
  width: number;
  onPress: () => void;
};

/** Photo tile for a menu category: tap to open its dishes. */
export function CategoryCard({ category, width, onPress }: CategoryCardProps) {
  const image = categoryImage(category.products);
  const count = category.products.length;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${category.name}, ${count} ${count === 1 ? 'platillo' : 'platillos'}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}>
      {image ? (
        <Image
          source={menuImage(image)}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={250}
          cachePolicy="memory-disk"
        />
      ) : (
        <ImagePlaceholder style={StyleSheet.absoluteFill} />
      )}
      {/* Darkens the bottom so the name stays readable over any photo. */}
      <View style={styles.shade} />

      <View style={styles.label}>
        <Text style={styles.name} numberOfLines={2}>
          {category.name}
        </Text>
        <Text style={styles.count}>
          {count} {count === 1 ? 'platillo' : 'platillos'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    aspectRatio: 0.9,
    borderRadius: Radius.lg + 2,
    overflow: 'hidden',
    backgroundColor: '#1A1612',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  shade: {
    ...StyleSheet.absoluteFill,
    experimental_backgroundImage:
      'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.55) 62%, rgba(0,0,0,0.92) 100%)',
  },
  label: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    gap: 2,
  },
  name: {
    color: Brand.white,
    fontFamily: BrandFonts.display,
    fontSize: 28,
    lineHeight: 30,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  count: {
    color: Brand.orange,
    fontFamily: BrandFonts.labelBold,
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
