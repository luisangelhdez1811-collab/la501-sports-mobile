import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { memo, useRef, useState, type ReactElement } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, Text, View, type ViewToken } from 'react-native';

import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { SECTIONS, sectionCategories } from '@/domain/menu-layout';
import { menuPrice } from '@/domain/menu-options';
import { searchProducts } from '@/domain/menu-search';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import type { Category, MenuSection, Product, Station } from '@/types/product';
import { menuImage } from '@/utils/image-source';

const STATION_LABELS: Record<Station, string> = { cocina: 'Cocina', barra: 'Barra', ninguna: 'Entrega directa' };
const FREQUENT = '★ Frecuentes';
const VIEWABILITY = { itemVisiblePercentThreshold: 50 };

type WaiterMenuProps = {
  categories: Category[];
  /** Dishes this phone orders most; shown first, in both tabs. */
  frequent: Product[];
  query: string;
  quantityOf: (product: Product) => number;
  /** "+": straight in, or the options card when the dish needs choosing. */
  onAdd: (product: Product) => void;
  onRemoveOne: (product: Product) => void;
  /** Pencil: options and a note for this dish. */
  onCustomize: (product: Product) => void;
  header: ReactElement;
  bottomInset: number;
};

type MenuSectionData = { title: string; data: Product[] };

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

/**
 * The menu in "Tomar pedido", like the website's waiter screen: Comidas / Bebidas, the
 * tab's categories as chips that jump to each one, and a compact row per dish with its
 * price, size and who prepares it. A search looks through food and drinks at once.
 */
export function WaiterMenu({
  categories,
  frequent,
  query,
  quantityOf,
  onAdd,
  onRemoveOne,
  onCustomize,
  header,
  bottomInset,
}: WaiterMenuProps) {
  const { colors } = useBrandTheme();
  const list = useRef<SectionList<Product, MenuSectionData>>(null);
  // Category a chip asked for, to retry the jump if its rows weren't drawn yet.
  const target = useRef(0);
  const [section, setSection] = useState<MenuSection>('comidas');
  const [active, setActive] = useState<string | null>(null);

  const searching = query.trim().length > 0;
  const tabFrequent = frequent.filter((p) => p.section === section);
  const sections: MenuSectionData[] = searching
    ? [{ title: 'Resultados', data: searchProducts(categories.flatMap((c) => c.products), query) }].filter((s) => s.data.length > 0)
    : [
        ...(tabFrequent.length > 0 ? [{ title: FREQUENT, data: tabFrequent }] : []),
        ...sectionCategories(categories, section).map((c) => ({ title: c.name, data: c.products })),
      ];
  const current = active ?? sections[0]?.title ?? null;

  const changeSection = (next: MenuSection) => {
    setSection(next);
    setActive(null);
    list.current?.getScrollResponder()?.scrollTo({ y: 0, animated: false });
  };

  const scrollToSection = (sectionIndex: number) =>
    list.current?.scrollToLocation({ sectionIndex, itemIndex: 0, viewPosition: 0, viewOffset: 36 });

  const jumpTo = (index: number) => {
    target.current = index;
    setActive(sections[index].title);
    scrollToSection(index);
  };

  // A category far down isn't drawn yet: get close with the average row height, then retry
  // once those rows exist.
  const onScrollFailed = ({ index, averageItemLength }: { index: number; averageItemLength: number }) => {
    list.current?.getScrollResponder()?.scrollTo({ y: index * averageItemLength, animated: false });
    setTimeout(() => scrollToSection(target.current), 120);
  };

  // The chip of the category being looked at lights up while scrolling. The list doesn't
  // allow changing this callback after mounting, so it's created once.
  const [onViewable] = useState(() => ({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((item) => item.section);
    if (first) setActive((first.section as MenuSectionData).title);
  });

  return (
    <View style={styles.wrap}>
      {!searching && (
        <View style={[styles.bar, { borderBottomColor: colors.border }]}>
          <View style={[styles.segmented, { backgroundColor: colors.background, borderColor: colors.border }]} accessibilityRole="tablist">
            {SECTIONS.map((s) => {
              const on = s.id === section;
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  onPress={() => changeSection(s.id)}
                  style={[styles.segment, on && { backgroundColor: colors.surface, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }]}>
                  <Text style={[styles.segmentText, { color: on ? colors.text : colors.textSecondary }]}>{s.name}</Text>
                </Pressable>
              );
            })}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.chips}>
            {sections.map((s, index) => {
              const on = s.title === current;
              return (
                <Pressable
                  key={s.title}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  onPress={() => jumpTo(index)}
                  style={[
                    styles.chip,
                    on ? { backgroundColor: colors.text, borderColor: colors.text } : { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}>
                  <Text style={[styles.chipText, { color: on ? colors.surface : colors.textSecondary }]}>{s.title}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <SectionList
        ref={list}
        sections={sections}
        keyExtractor={(product, index) => `${product.key}-${index}`}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 16 }]}
        ListHeaderComponent={header}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={VIEWABILITY}
        onScrollToIndexFailed={onScrollFailed}
        renderSectionHeader={({ section: s }) => (
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{s.title}</Text>
        )}
        renderItem={({ item, index, section: s }) => (
          <DishRow
            product={item}
            first={index === 0}
            last={index === s.data.length - 1}
            quantity={quantityOf(item)}
            onAdd={onAdd}
            onRemoveOne={onRemoveOne}
            onCustomize={onCustomize}
          />
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            {searching ? `Sin resultados para «${query.trim()}».` : 'No hay platillos en esta sección.'}
          </Text>
        }
      />
    </View>
  );
}

/** Memoized: changing one dish's count doesn't redraw every row. */
const DishRow = memo(function DishRow({
  product,
  first,
  last,
  quantity,
  onAdd,
  onRemoveOne,
  onCustomize,
}: {
  product: Product;
  first: boolean;
  last: boolean;
  quantity: number;
  onAdd: (product: Product) => void;
  onRemoveOne: (product: Product) => void;
  onCustomize: (product: Product) => void;
}) {
  const { colors } = useBrandTheme();
  const orderable = product.available && product.id !== null;
  const meta = [menuPrice(product), product.presentation, STATION_LABELS[product.station]].filter(Boolean);

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border },
        first && styles.rowFirst,
        last && styles.rowLast,
        !last && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
        quantity > 0 && { backgroundColor: `${Brand.orange}0F` },
      ]}>
      {product.image ? (
        <Image source={menuImage(product.image)} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.initials, { backgroundColor: colors.background }]}>
          <Text style={[styles.initialsText, { color: colors.textSecondary }]}>{initials(product.name)}</Text>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opciones y nota del platillo"
        disabled={!orderable}
        onPress={() => onCustomize(product)}
        style={styles.rowText}>
        <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={2}>
          <Text style={[styles.rowPrice, { color: colors.text }]}>{meta[0]}</Text>
          {meta.length > 1 ? ` · ${meta.slice(1).join(' · ')}` : ''}
        </Text>
        {!orderable && <Text style={[styles.soldOut, { color: colors.danger }]}>Agotado</Text>}
      </Pressable>

      {orderable && (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Opciones y nota para ${product.name}`}
            onPress={() => onCustomize(product)}
            hitSlop={4}
            style={styles.edit}>
            <SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={18} tintColor={colors.textSecondary} />
          </Pressable>
          <View style={[styles.stepper, { borderColor: colors.border }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Quitar uno de ${product.name}`}
              disabled={quantity === 0}
              onPress={() => onRemoveOne(product)}
              style={[styles.step, quantity === 0 && styles.dim]}>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>−</Text>
            </Pressable>
            <Text style={[styles.count, { color: colors.text }]} accessibilityLiveRegion="polite">
              {quantity}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Agregar uno de ${product.name}`} onPress={() => onAdd(product)} style={styles.step}>
              <Text style={[styles.stepText, { color: colors.accent }]}>+</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  bar: {
    gap: 10,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segmented: {
    flexDirection: 'row',
    marginHorizontal: 16,
    padding: 4,
    borderWidth: 1,
    borderRadius: Radius.sm + 2,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
  },
  chips: {
    gap: 6,
    paddingHorizontal: 16,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 13,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionTitle: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  rowFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
  },
  rowLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: Radius.md,
    borderBottomRightRadius: Radius.md,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.sm,
  },
  initials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
  },
  rowMeta: {
    fontFamily: BrandFonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  rowPrice: {
    fontFamily: BrandFonts.bodyBold,
  },
  soldOut: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 12,
  },
  edit: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.sm,
  },
  step: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 22,
  },
  count: {
    minWidth: 22,
    textAlign: 'center',
    fontFamily: BrandFonts.bodyBold,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  dim: {
    opacity: 0.3,
  },
  empty: {
    fontFamily: BrandFonts.body,
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
