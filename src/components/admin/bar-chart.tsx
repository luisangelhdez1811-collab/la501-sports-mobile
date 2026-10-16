import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatMoney } from '@/components/account/orders-list';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

const CHART_HEIGHT = 180;
const BAR_WIDTH = 26;

/** $78,500 → "$78.5k" for the labels above the bars. */
function compact(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return `$${Math.round(value)}`;
}

/**
 * Income per day or month as bars (no chart library needed). Tapping a bar shows its
 * exact amount; the latest one is selected by default.
 */
export function BarChart({ points }: { points: { label: string; total: number }[] }) {
  const { colors } = useBrandTheme();
  const [selected, setSelected] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const max = Math.max(...points.map((p) => p.total), 1);
  const active = selected ?? points.length - 1;
  const current = points[active];

  return (
    <View style={styles.container}>
      {current && (
        <View style={styles.readout}>
          <Text style={[styles.readoutLabel, { color: colors.textSecondary }]}>{current.label}</Text>
          <Text style={[styles.readoutValue, { color: colors.text }]}>{formatMoney(current.total)}</Text>
        </View>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bars}
        ref={scrollRef}
        // Newest data is on the right: show the end whenever new data arrives.
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
        {points.map((point, i) => {
          const isActive = i === active;
          const height = Math.max((point.total / max) * CHART_HEIGHT, point.total > 0 ? 4 : 2);
          return (
            <Pressable
              key={`${point.label}-${i}`}
              accessibilityRole="button"
              accessibilityLabel={`${point.label}: ${formatMoney(point.total)}`}
              onPress={() => setSelected(i)}
              style={styles.column}>
              <Text style={[styles.value, { color: isActive ? Brand.blue : colors.textSecondary }]} numberOfLines={1}>
                {point.total > 0 ? compact(point.total) : ''}
              </Text>
              <View style={[styles.track, { height: CHART_HEIGHT }]}>
                <View
                  style={[
                    styles.bar,
                    { height, backgroundColor: isActive ? Brand.blue : `${Brand.blue}66` },
                  ]}
                />
              </View>
              <Text style={[styles.label, { color: isActive ? colors.text : colors.textSecondary }]} numberOfLines={2}>
                {point.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  readout: {
    gap: 2,
  },
  readoutLabel: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 13,
  },
  readoutValue: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 22,
  },
  bars: {
    gap: 10,
    paddingTop: 4,
  },
  column: {
    width: BAR_WIDTH + 18,
    alignItems: 'center',
    gap: 6,
  },
  value: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 10,
  },
  track: {
    justifyContent: 'flex-end',
  },
  bar: {
    width: BAR_WIDTH,
    borderTopLeftRadius: Radius.sm,
    borderTopRightRadius: Radius.sm,
  },
  label: {
    fontFamily: BrandFonts.body,
    fontSize: 10,
    textAlign: 'center',
  },
});
