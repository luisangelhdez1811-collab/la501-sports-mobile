import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/client';
import { getTable, sendToKitchen } from '@/api/waiter';
import { formatMoney } from '@/components/account/orders-list';
import { ImagePlaceholder } from '@/components/brand/image-placeholder';
import { OfflineBanner } from '@/components/brand/offline-banner';
import { ProductDetailSheet } from '@/components/menu/product-detail-sheet';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useAdminResource } from '@/hooks/use-admin-resource';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useIsOffline } from '@/hooks/use-connectivity';
import { useMenu } from '@/hooks/use-menu';
import type { Ingredient, Product } from '@/types/product';
import { menuImage } from '@/utils/image-source';

type Line = { product: Product; quantity: number; excluded: Ingredient[]; notes: string };

const MAX_QUANTITY = 50;
const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** "Tomar pedido" for a table: pick dishes, customize them and send them to the kitchen. */
export default function TakeOrderScreen() {
  const { colors } = useBrandTheme();
  const insets = useSafeAreaInsets();
  const offline = useIsOffline();
  const params = useLocalSearchParams<{ id: string; numero?: string }>();
  const tableId = Number(params.id);
  const tableNumber = params.numero ?? params.id;

  const { categories } = useMenu();
  const existing = useAdminResource(`table-${tableId}`, (signal) => getTable(tableId, signal));
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [lines, setLines] = useState<Record<string, Line>>({});
  const [editing, setEditing] = useState<Product | null>(null);
  const [sending, setSending] = useState(false);

  const activeCategory = category ?? categories[0]?.name ?? null;
  const search = normalize(query.trim());
  const products = search
    ? categories.flatMap((c) => c.products).filter((p) => normalize(`${p.name} ${p.description}`).includes(search))
    : (categories.find((c) => c.name === activeCategory)?.products ?? []);

  const chosen = Object.values(lines).filter((line) => line.quantity > 0);
  const count = chosen.reduce((sum, line) => sum + line.quantity, 0);
  const total = chosen.reduce((sum, line) => sum + line.quantity * line.product.price, 0);
  const already = existing.data?.items ?? [];

  const setQuantity = (product: Product, quantity: number) =>
    setLines((current) => ({
      ...current,
      [product.key]: {
        product,
        excluded: current[product.key]?.excluded ?? [],
        notes: current[product.key]?.notes ?? '',
        quantity: Math.max(0, Math.min(quantity, MAX_QUANTITY)),
      },
    }));

  const leave = () => {
    if (count === 0) return router.back();
    Alert.alert('¿Salir sin enviar?', 'Los platillos que elegiste no se han mandado a cocina.', [
      { text: 'Seguir aquí', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const send = async () => {
    const items = chosen.filter((line) => line.product.id !== null);
    if (items.length === 0) return;
    setSending(true);
    try {
      await sendToKitchen(
        tableId,
        items.map((line) => ({
          productId: line.product.id!,
          quantity: line.quantity,
          excluded: line.excluded,
          notes: line.notes,
        })),
      );
      setLines({});
      Alert.alert('Pedido enviado', `La orden de la mesa ${tableNumber} ya está en cocina.`, [
        { text: 'Listo', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('No se pudo enviar', errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const editingLine = editing ? lines[editing.key] : undefined;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Regresar al mapa de mesas"
          onPress={leave}
          style={[styles.back, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={22} tintColor={colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.tableTitle, { color: colors.text }]}>Mesa {tableNumber}</Text>
          <Text style={[styles.tableSubtitle, { color: colors.textSecondary }]}>Tomando orden</Text>
        </View>
      </View>

      {!search && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.chipsBar, { borderBottomColor: colors.border }]}
          contentContainerStyle={styles.chips}>
          {categories.map((c) => {
            const active = c.name === activeCategory;
            return (
              <Pressable
                key={c.name}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setCategory(c.name)}
                style={[
                  styles.chip,
                  active ? { backgroundColor: Brand.blue, borderColor: Brand.blue } : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}>
                <Text style={[styles.chipText, { color: active ? Brand.white : colors.text }]}>{c.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <FlatList
        data={products}
        keyExtractor={(product) => product.key}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 120 }]}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <OfflineBanner />
            <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={18} tintColor={colors.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar platillo o bebida…"
                placeholderTextColor={colors.textSecondary}
                selectionColor={Brand.orange}
                autoCorrect={false}
                returnKeyType="search"
                style={[styles.searchInput, { color: colors.text }]}
                accessibilityLabel="Buscar platillo o bebida"
              />
              {!!query && (
                <Pressable accessibilityRole="button" accessibilityLabel="Borrar búsqueda" hitSlop={8} onPress={() => setQuery('')}>
                  <SymbolView name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }} size={18} tintColor={colors.textSecondary} />
                </Pressable>
              )}
            </View>
            {already.length > 0 && (
              <View style={[styles.already, { borderColor: `${Brand.orange}55`, backgroundColor: `${Brand.orange}12` }]}>
                <Text style={[styles.alreadyText, { color: colors.text }]}>
                  Ya en la mesa: {already.reduce((sum, item) => sum + item.quantity, 0)} platillos ·{' '}
                  {formatMoney(existing.data?.total ?? 0)}
                </Text>
              </View>
            )}
            <View style={styles.sectionTitle}>
              <View style={styles.sectionBar} />
              <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
                {search ? `Resultados (${products.length})` : activeCategory}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            {search ? 'No hay platillos con ese nombre.' : 'Esta categoría no tiene platillos.'}
          </Text>
        }
        renderItem={({ item }) => (
          <OrderRow
            product={item}
            line={lines[item.key]}
            onChange={(quantity) => setQuantity(item, quantity)}
            onEdit={() => setEditing(item)}
          />
        )}
      />

      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.bottomTotal}>
          <Text style={[styles.bottomLabel, { color: colors.textSecondary }]}>Total a mandar</Text>
          <Text style={styles.bottomValue}>{formatMoney(total)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: count === 0 || offline || sending }}
          disabled={count === 0 || offline || sending}
          onPress={send}
          style={({ pressed }) => [
            styles.send,
            { opacity: count === 0 || offline ? 0.45 : pressed ? 0.85 : 1 },
          ]}>
          <SymbolView name={{ ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }} size={18} tintColor={Brand.white} />
          <Text style={styles.sendText}>{offline ? 'Sin conexión' : sending ? 'Enviando…' : 'Enviar a cocina'}</Text>
        </Pressable>
      </View>

      <ProductDetailSheet
        key={editing?.key ?? 'none'}
        product={editing}
        onClose={() => setEditing(null)}
        initialExcluded={editingLine?.excluded}
        initialNotes={editingLine?.notes}
        confirmLabel="Confirmar"
        ingredientsHint="Desmarca lo que el cliente no quiera."
        onAdd={(product, excluded, notes) =>
          setLines((current) => ({
            ...current,
            [product.key]: {
              product,
              excluded,
              notes,
              quantity: Math.max(current[product.key]?.quantity ?? 0, 1),
            },
          }))
        }
      />
    </View>
  );
}

function OrderRow({
  product,
  line,
  onChange,
  onEdit,
}: {
  product: Product;
  line?: Line;
  onChange: (quantity: number) => void;
  onEdit: () => void;
}) {
  const { colors } = useBrandTheme();
  const quantity = line?.quantity ?? 0;
  const orderable = product.available && product.id !== null;
  const customized = !!line && (line.excluded.length > 0 || !!line.notes.trim());

  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: quantity > 0 ? `${Brand.blue}88` : colors.border }]}>
      <View style={styles.rowTop}>
        {product.image ? (
          <Image source={menuImage(product.image)} style={styles.thumb} contentFit="cover" />
        ) : (
          <ImagePlaceholder style={styles.thumb} />
        )}
        <View style={styles.rowText}>
          <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.rowPrice}>{formatMoney(product.price)}</Text>
          {!orderable && <Text style={styles.unavailable}>No disponible</Text>}
          {customized && (
            <Text style={[styles.custom, { color: colors.textSecondary }]} numberOfLines={2}>
              {[
                line!.excluded.length > 0 ? `Sin ${line!.excluded.map((i) => i.name.toLowerCase()).join(', ')}` : '',
                line!.notes.trim(),
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.rowBottom}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Personalizar ${product.name}`}
          disabled={!orderable}
          onPress={onEdit}
          style={[styles.edit, { backgroundColor: colors.background, borderColor: customized ? Brand.orange : colors.border }, !orderable && styles.dim]}>
          <SymbolView name={{ ios: 'square.and.pencil', android: 'edit_note', web: 'edit_note' }} size={20} tintColor={customized ? Brand.orange : colors.text} />
        </Pressable>
        <View style={[styles.stepper, { backgroundColor: colors.background }, !orderable && styles.dim]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Quitar uno de ${product.name}`}
            disabled={!orderable || quantity === 0}
            onPress={() => onChange(quantity - 1)}
            style={[styles.step, { backgroundColor: colors.surface }]}>
            <Text style={[styles.stepText, { color: colors.text }]}>−</Text>
          </Pressable>
          <Text style={[styles.quantity, { color: colors.text }]} accessibilityLiveRegion="polite">
            {quantity}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Agregar uno de ${product.name}`}
            disabled={!orderable}
            onPress={() => onChange(quantity + 1)}
            style={[styles.step, { backgroundColor: Brand.blue }]}>
            <Text style={[styles.stepText, { color: Brand.white }]}>+</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  tableTitle: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 22,
  },
  tableSubtitle: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  chipsBar: {
    flexGrow: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chips: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  listHeader: {
    gap: 12,
    marginBottom: 4,
  },
  search: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: BrandFonts.body,
    fontSize: 15,
    paddingVertical: 12,
  },
  already: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 12,
  },
  alreadyText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  sectionBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: Brand.blue,
  },
  sectionText: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  empty: {
    fontFamily: BrandFonts.body,
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 24,
  },
  row: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 14,
    gap: 12,
  },
  rowTop: {
    flexDirection: 'row',
    gap: 14,
  },
  thumb: {
    width: 76,
    height: 76,
    borderRadius: Radius.md,
  },
  rowText: {
    flex: 1,
    gap: 3,
    justifyContent: 'center',
  },
  rowName: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 16,
  },
  rowPrice: {
    color: Brand.greenLight,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 16,
  },
  unavailable: {
    color: Brand.red,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 12,
  },
  custom: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 12,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  edit: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.md,
    padding: 5,
  },
  step: {
    width: 46,
    height: 46,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 22,
  },
  quantity: {
    minWidth: 32,
    textAlign: 'center',
    fontFamily: BrandFonts.bodyBold,
    fontSize: 18,
  },
  dim: {
    opacity: 0.4,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bottomTotal: {
    flex: 1,
  },
  bottomLabel: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  bottomValue: {
    color: Brand.greenLight,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 24,
  },
  send: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 54,
    paddingHorizontal: 18,
    borderRadius: Radius.md,
    backgroundColor: Brand.blue,
  },
  sendText: {
    color: Brand.white,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
    textTransform: 'uppercase',
  },
});
