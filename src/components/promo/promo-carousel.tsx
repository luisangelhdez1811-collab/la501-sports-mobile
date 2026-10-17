import { useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';

import { PromoCard } from '@/components/promo/promo-card';
import { Brand } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import type { Promotion } from '@/types/product';

const GUTTER = 16;
const GAP = 12;
// How much of the next card shows, so it's obvious there are more to swipe.
const PEEK = 28;

type PromoCarouselProps = {
  promotions: Promotion[];
  onAdd?: (promo: Promotion) => void;
};

/**
 * Offers side by side, one per swipe: cards keep a readable size and the screen stays the
 * same height no matter how many promotions there are.
 */
export function PromoCarousel({ promotions, onAdd }: PromoCarouselProps) {
  const { colors } = useBrandTheme();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const single = promotions.length === 1;
  const cardWidth = width - GUTTER * 2 - (single ? 0 : PEEK);
  const interval = cardWidth + GAP;

  return (
    <View style={styles.container}>
      <FlatList
        data={promotions}
        keyExtractor={(promo) => promo.key}
        horizontal
        style={styles.listView}
        scrollEnabled={!single}
        showsHorizontalScrollIndicator={false}
        snapToInterval={interval}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        contentContainerStyle={styles.list}
        onScroll={(e) => {
          const next = Math.round(e.nativeEvent.contentOffset.x / interval);
          setIndex(Math.min(Math.max(next, 0), promotions.length - 1));
        }}
        scrollEventThrottle={32}
        renderItem={({ item }) => <PromoCard promo={item} onAdd={onAdd} style={{ width: cardWidth }} />}
      />

      {!single && (
        <View style={styles.dots} accessibilityLabel={`Promoción ${index + 1} de ${promotions.length}`}>
          {promotions.map((promo, i) => (
            <View
              key={promo.key}
              style={[styles.dot, i === index ? styles.dotActive : { backgroundColor: colors.border }]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Bleed to the screen edges so the next card peeks in from the side.
    marginHorizontal: -GUTTER,
    gap: 14,
  },
  // Height comes from the cards themselves, never from leftover screen space.
  listView: {
    flexGrow: 0,
  },
  list: {
    paddingHorizontal: GUTTER,
    gap: GAP,
    alignItems: 'flex-start',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 22,
    backgroundColor: Brand.orange,
  },
});
