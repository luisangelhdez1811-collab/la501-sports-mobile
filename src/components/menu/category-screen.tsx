import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppHeader } from '@/components/brand/app-header';
import { OfflineBanner } from '@/components/brand/offline-banner';
import { ImagePlaceholder } from '@/components/brand/image-placeholder';
import { CategoryCard } from '@/components/menu/category-card';
import { GRID_GAP, GRID_GUTTER, gridCardWidth } from '@/components/menu/grid';
import { MenuStatus } from '@/components/menu/menu-status';
import { ProductCard } from '@/components/menu/product-card';
import { ProductDetailSheet } from '@/components/menu/product-detail-sheet';
import { CART_BAR_HEIGHT, CartBar } from '@/components/order/cart-bar';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { getCachedDetail, loadDetails, useDetailsVersion } from '@/data/product-details';
import { BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useCart } from '@/hooks/use-cart';
import { useMenu } from '@/hooks/use-menu';
import type { Category, Product } from '@/types/product';
import { categoryImage } from '@/utils/category-image';
import { groupBySubcategory } from '@/utils/subcategories';
import { menuImage } from '@/utils/image-source';

type Row = { type: 'subcategory'; group: Category } | { type: 'product'; product: Product };

type CategoryScreenProps = {
  nombre: string;
  sub?: string;
  onOpenSubcategory: (sub: string) => void;
  /** "Arma tu pedido": dish cards say "Agregar" and the sheet can add to the cart. */
  ordering?: boolean;
};

/**
 * One menu category. Categories with subcategories (Destilados → Ron, Mezcal, Tequila…)
 * first show subcategory cards; `sub` then lists that subcategory's dishes.
 */
export function CategoryScreen({ nombre, sub, onOpenSubcategory, ordering = false }: CategoryScreenProps) {
  const { width } = useWindowDimensions();
  const { colors } = useBrandTheme();
  const cart = useCart();
  const { categories, loading, refreshing, error, stale, reload, refresh } = useMenu();
  const cardWidth = gridCardWidth(width);
  const [selected, setSelected] = useState<Product | null>(null);

  // Subcategories come from the saved dish details until the menu endpoint sends them.
  useDetailsVersion();
  useEffect(() => {
    loadDetails();
  }, []);
  const found = categories.find((c) => c.name === nombre);
  const category = found && {
    ...found,
    products: found.products.map((p) =>
      p.subcategory ? p : { ...p, subcategory: getCachedDetail(p.id)?.subcategory ?? '' },
    ),
  };
  // Only split once every dish's subcategory is known, so a half-synced category never
  // shows a misleading partial grouping.
  const subcategoriesKnown = !!found?.products.every((p) => p.subcategory || getCachedDetail(p.id));
  const groups = category && subcategoriesKnown ? groupBySubcategory(category.products) : null;
  const subgroup = sub ? groups?.find((g) => g.name === sub) : undefined;

  // What this screen shows: the subcategory picker, or a list of dishes.
  const showingSubcategories = !!groups && !sub;
  const products = subgroup?.products ?? (groups ? [] : (category?.products ?? []));
  const rows: Row[] = showingSubcategories
    ? groups!.map((group) => ({ type: 'subcategory', group }))
    : products.map((product) => ({ type: 'product', product }));

  const title = sub ?? nombre;
  const image = categoryImage(subgroup?.products ?? category?.products ?? []);
  const count = showingSubcategories ? groups!.length : products.length;
  const countLabel = showingSubcategories
    ? `${count} ${count === 1 ? 'tipo' : 'tipos'}`
    : `${count} ${count === 1 ? 'platillo' : 'platillos'}`;
  const cartInset = ordering && cart.count > 0 ? CART_BAR_HEIGHT : 0;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppHeader />
      <FlatList
        data={rows}
        keyExtractor={(row) => (row.type === 'subcategory' ? `sub-${row.group.name}` : row.product.key)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + 24 + cartInset }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={sub ? `Regresar a ${nombre}` : 'Regresar a las categorías'}
              onPress={goBack}
              hitSlop={8}
              style={({ pressed }) => [
                styles.back,
                { backgroundColor: colors.surface, borderColor: pressed ? Brand.orange : colors.border },
              ]}>
              <SymbolView
                name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                size={16}
                tintColor={Brand.orange}
              />
              <Text style={[styles.backText, { color: colors.text }]}>{sub ? nombre : 'Categorías'}</Text>
            </Pressable>

            <View style={styles.banner}>
              {image ? (
                <Image source={menuImage(image)} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
              ) : (
                <ImagePlaceholder style={StyleSheet.absoluteFill} />
              )}
              <View style={styles.bannerShade} />
              <View style={styles.bannerAccent} />
              <View style={styles.bannerText}>
                {!!sub && <Text style={styles.bannerParent}>{nombre}</Text>}
                <Text style={styles.bannerTitle} accessibilityRole="header" numberOfLines={2}>
                  {title}
                </Text>
                {!!category && <Text style={styles.bannerCount}>{countLabel}</Text>}
              </View>
            </View>

            <OfflineBanner stale={stale} onRetry={reload} />

            {showingSubcategories && (
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                Elige un tipo para ver sus opciones
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <MenuStatus
            loading={loading}
            error={error}
            onRetry={reload}
            emptyText="Esta categoría no tiene platillos por ahora."
          />
        }
        renderItem={({ item }) =>
          item.type === 'subcategory' ? (
            <CategoryCard
              category={item.group}
              width={cardWidth}
              onPress={() => onOpenSubcategory(item.group.name)}
            />
          ) : (
            <ProductCard
              product={item.product}
              width={cardWidth}
              onPress={setSelected}
              actionLabel={ordering ? (item.product.available ? 'Agregar' : 'Agotado') : 'Ver detalles'}
            />
          )
        }
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
        initialNumToRender={6}
        windowSize={7}
      />
      {ordering && <CartBar />}
      <ProductDetailSheet
        product={selected}
        onClose={() => setSelected(null)}
        onAdd={ordering ? (product, excluded, notes) => cart.add(product, { excluded, notes }) : undefined}
      />
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
    paddingHorizontal: GRID_GUTTER,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 14,
  },
  back: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  backText: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  banner: {
    height: 170,
    borderRadius: Radius.lg + 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  bannerShade: {
    ...StyleSheet.absoluteFill,
    experimental_backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 100%)',
  },
  bannerAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    experimental_backgroundImage: `linear-gradient(180deg, ${Brand.orange}, ${Brand.green})`,
  },
  bannerText: {
    padding: 20,
    gap: 2,
  },
  bannerParent: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontFamily: BrandFonts.labelBold,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  bannerTitle: {
    color: Brand.white,
    fontFamily: BrandFonts.display,
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  bannerCount: {
    color: Brand.orange,
    fontFamily: BrandFonts.labelBold,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  hint: {
    fontFamily: BrandFonts.body,
    fontSize: 14,
  },
  row: {
    gap: GRID_GAP,
    paddingHorizontal: GRID_GUTTER,
  },
});
