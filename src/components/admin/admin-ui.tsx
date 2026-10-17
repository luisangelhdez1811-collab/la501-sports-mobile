import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandButton } from '@/components/brand/brand-button';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

type Icon = SymbolViewProps['name'];

export const AdminColors = {
  purple: '#8B5CF6',
  yellow: '#EAB308',
} as const;

/** Page title like the website's admin panel: bold title and a grey subtitle. */
export function AdminTitle({ title, subtitle }: { title: string; subtitle: string }) {
  const { colors } = useBrandTheme();
  return (
    <View style={styles.titleBox}>
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
        {title}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
    </View>
  );
}

/** Number card. `accent` draws the coloured top border used on Panel de ventas. */
export function StatCard({
  label,
  value,
  icon,
  color,
  accent = false,
  selected = false,
  onPress,
}: {
  label: string;
  value: string;
  icon?: Icon;
  color: string;
  accent?: boolean;
  /** Highlights the card (e.g. the reservation status being listed). */
  selected?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useBrandTheme();
  const iconBox = icon && (
    <View style={[styles.statIcon, { backgroundColor: `${color}1F` }]}>
      <SymbolView name={icon} size={18} tintColor={color} />
    </View>
  );

  if (accent) {
    return (
      <View style={[styles.stat, styles.statAccent, { backgroundColor: colors.surface, borderColor: colors.border, borderTopColor: color }]}>
        <View style={styles.statHeader}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
          {iconBox}
        </View>
        <Text style={[styles.statValueBig, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={onPress ? { selected } : undefined}
      style={[
        styles.stat,
        styles.statRow,
        { backgroundColor: colors.surface, borderColor: selected ? color : colors.border },
      ]}>
      {iconBox}
      <View style={styles.statText}>
        <Text style={[styles.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={2}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

/** Two cards per row. */
export function StatGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

/** Pill tabs (Ganancias / Rotación…, Hoy / Esta semana…). Scrolls sideways if needed. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  color = Brand.orange,
}: {
  options: readonly { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  color?: string;
}) {
  const { colors } = useBrandTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmented}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              active
                ? { backgroundColor: color, borderColor: color }
                : { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
            <Text style={[styles.segmentText, { color: active ? Brand.white : colors.textSecondary }]}>
              {option.label}
              {option.count !== undefined && option.count > 0 ? ` · ${option.count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Card with an icon + title header (e.g. "Reporte de ventas", "Mensajes · 88 registros"). */
export function Panel({
  icon,
  title,
  color = Brand.blue,
  count,
  children,
}: {
  icon: Icon;
  title: string;
  color?: string;
  count?: number;
  children: ReactNode;
}) {
  const { colors } = useBrandTheme();
  return (
    <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.panelHeader, { borderBottomColor: colors.border }]}>
        <View style={[styles.panelIcon, { backgroundColor: `${color}1F`, borderColor: `${color}40` }]}>
          <SymbolView name={icon} size={16} tintColor={color} />
        </View>
        <Text style={[styles.panelTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {count !== undefined && (
          <View style={[styles.countChip, { borderColor: colors.border }]}>
            <Text style={[styles.countText, { color: colors.textSecondary }]}>
              {count} {count === 1 ? 'registro' : 'registros'}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.panelBody}>{children}</View>
    </View>
  );
}

/** Loading, error, "not on the server yet" and empty states for a panel. */
export function PanelState({
  loading,
  error,
  unavailable,
  endpoint,
  empty,
  emptyText,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  unavailable: boolean;
  /** Route shown when the server doesn't have it yet, e.g. "GET /app/admin/messages". */
  endpoint: string;
  empty: boolean;
  emptyText: string;
  onRetry: () => void;
}) {
  const { colors } = useBrandTheme();
  if (loading) return <ActivityIndicator color={Brand.orange} style={styles.state} />;
  if (unavailable) {
    return (
      <View style={[styles.pending, { borderColor: `${Brand.blue}55`, backgroundColor: `${Brand.blue}14` }]}>
        <SymbolView name={{ ios: 'hammer.fill', android: 'construction', web: 'construction' }} size={18} tintColor={Brand.blue} />
        <Text style={[styles.pendingText, { color: colors.textSecondary }]}>
          Esta sección se llenará cuando el servidor active{' '}
          <Text style={[styles.code, { color: colors.text }]}>{endpoint}</Text>.
        </Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.stateBox}>
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>{error}</Text>
        <BrandButton title="Reintentar" variant="secondary" onPress={onRetry} />
      </View>
    );
  }
  if (empty) return <Text style={[styles.stateText, styles.state, { color: colors.textSecondary }]}>{emptyText}</Text>;
  return null;
}

/** Small coloured label, e.g. a reservation status or message type. */
export function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: `${color}1F`, borderColor: `${color}55` }]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleBox: {
    gap: 4,
  },
  title: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 28,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: BrandFonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stat: {
    flexBasis: '46%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 16,
  },
  statAccent: {
    borderTopWidth: 3,
    gap: 10,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: {
    flex: 1,
  },
  statLabel: {
    flexShrink: 1,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 26,
  },
  statValueBig: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 30,
  },
  segmented: {
    gap: 8,
  },
  segment: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
  },
  panel: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  panelIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelTitle: {
    flex: 1,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 17,
  },
  countChip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countText: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 12,
  },
  panelBody: {
    padding: 14,
    gap: 12,
  },
  state: {
    paddingVertical: 24,
  },
  stateBox: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  stateText: {
    fontFamily: BrandFonts.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  pending: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 14,
  },
  pendingText: {
    flex: 1,
    fontFamily: BrandFonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  code: {
    fontFamily: BrandFonts.bodyBold,
  },
  tag: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tagText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
