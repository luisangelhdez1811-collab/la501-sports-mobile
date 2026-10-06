import type { ReactNode } from 'react';
import { FlatList, RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppHeader } from '@/components/brand/app-header';
import { OfflineBanner } from '@/components/brand/offline-banner';
import { CategoryCard } from '@/components/menu/category-card';
import { GRID_GAP, GRID_GUTTER, gridCardWidth } from '@/components/menu/grid';
import { MenuStatus } from '@/components/menu/menu-status';
import { MissingBanner } from '@/components/menu/missing-banner';
import { Brand } from '@/constants/brand';
import { BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useMenu } from '@/hooks/use-menu';

type CategoryGridScreenProps = {
  hero: ReactNode;
  onOpen: (category: string) => void;
  /** Extra bottom padding, e.g. for the floating cart bar. */
  bottomInset?: number;
  /** Rendered above the list (floating cart bar…). */
  overlay?: ReactNode;
};

/** Menu categories as photo cards. Shared by Menú and "Arma tu pedido". */
export function CategoryGridScreen({ hero, onOpen, bottomInset = 0, overlay }: CategoryGridScreenProps) {
  const { width } = useWindowDimensions();
  const { colors } = useBrandTheme();
  const { categories, missing, loading, refreshing, error, stale, reload, refresh } = useMenu();
  const cardWidth = gridCardWidth(width);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppHeader />
      <FlatList
        data={categories}
        keyExtractor={(category) => category.name}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + 24 + bottomInset }]}
        ListHeaderComponent={
          <View style={styles.header}>
            {hero}
            <OfflineBanner stale={stale} onRetry={reload} style={styles.banner} />
            {!stale && <MissingBanner missing={missing} onRetry={reload} />}
          </View>
        }
        ListEmptyComponent={<MenuStatus loading={loading} error={error} onRetry={reload} />}
        renderItem={({ item }) => (
          <CategoryCard category={item} width={cardWidth} onPress={() => onOpen(item.name)} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={Brand.orange}
            colors={[Brand.orange]}
            progressBackgroundColor={colors.surface}
          />
        }
        showsVerticalScrollIndicator={false}
      />
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: GRID_GAP,
  },
  header: {
    marginBottom: 8,
  },
  banner: {
    marginHorizontal: GRID_GUTTER,
    marginTop: 12,
  },
  row: {
    gap: GRID_GAP,
    paddingHorizontal: GRID_GUTTER,
  },
});
