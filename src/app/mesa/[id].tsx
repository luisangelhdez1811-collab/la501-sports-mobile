import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/client';
import { getTable } from '@/api/waiter';
import { formatMoney } from '@/components/account/orders-list';
import { ImagePlaceholder } from '@/components/brand/image-placeholder';
import { OfflineBanner } from '@/components/brand/offline-banner';
import { ProductDetailSheet } from '@/components/menu/product-detail-sheet';
import { ChargeSheet } from '@/components/waiter/charge-sheet';
import { OutboxBanner } from '@/components/waiter/outbox-sync';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { placeKitchenOrder } from '@/data/waiter-actions';
import { loadFavorites, recordOrdered, topDishes, useFavoritesVersion } from '@/data/waiter-favorites';
import { useOutbox } from '@/data/waiter-outbox';
import { useAuth } from '@/hooks/use-auth';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useCachedResource } from '@/hooks/use-cached-resource';
import { useIsOffline } from '@/hooks/use-connectivity';
import { useMenu } from '@/hooks/use-menu';
import type { Ingredient, Product } from '@/types/product';
import { menuImage } from '@/utils/image-source';
import { nextDinerLabel, openOrders } from '@/utils/waiter-tables';

type Line = { product: Product; quantity: number; excluded: Ingredient[]; notes: string };

const MAX_QUANTITY = 50;
const FREQUENT = '__frecuentes';
const FREQUENT_COUNT = 24;
const AMBER = '#F59E0B';
const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * "Tomar pedido", one diner at a time: the waiter asks the first person, picks their dishes
 * and sends them to the kitchen; the screen moves on to the next person on its own. Each
 * diner becomes a separate order, so the table can later pay together or separately.
 * Works offline: the menu is saved on the phone and orders wait in the outbox.
 */
export default function TakeOrderScreen() {
  const { colors } = useBrandTheme();
  const insets = useSafeAreaInsets();
  const offline = useIsOffline();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id: string; numero?: string }>();
  const tableId = Number(params.id);
  const tableNumber = params.numero ?? params.id;

  const { categories } = useMenu();
  const detail = useCachedResource(`waiter-table-${tableId}`, (signal) => getTable(tableId, signal), { persist: true });
  const { entries } = useOutbox();
  useFavoritesVersion();
  useEffect(() => loadFavorites(), []);

  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [lines, setLines] = useState<Record<string, Line>>({});
  const [label, setLabel] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [charging, setCharging] = useState(false);

  const [sentLabels, setSentLabels] = useState<string[]>([]);

  const orders = openOrders(detail.data, tableId, entries);
  const tableTotal = orders.reduce((sum, o) => sum + o.total, 0);
  // Diners sent from here count right away, before the table's list reloads.
  const known = [...orders, ...sentLabels.filter((l) => !orders.some((o) => o.label === l)).map((l) => ({ label: l }))];
  const diner = label?.trim() || nextDinerLabel(known);

  const allProducts = categories.flatMap((c) => c.products);
  const frequent = topDishes(FREQUENT_COUNT)
    .map((id) => allProducts.find((p) => p.id === id))
    .filter((p): p is Product => !!p && p.available);
  const activeCategory = category ?? (frequent.length > 0 ? FREQUENT : (categories[0]?.name ?? null));
  const search = normalize(query.trim());
  const products = search
    ? allProducts.filter((p) => normalize(`${p.name} ${p.description} ${p.category}`).includes(search))
    : activeCategory === FREQUENT
      ? frequent
      : (categories.find((c) => c.name === activeCategory)?.products ?? []);

  const chosen = Object.values(lines).filter((line) => line.quantity > 0);
  const count = chosen.reduce((sum, line) => sum + line.quantity, 0);
  const total = chosen.reduce((sum, line) => sum + line.quantity * line.product.price, 0);

  const setQuantity = (product: Product, quantity: number) => {
    setLastSent(null);
    setLines((current) => ({
      ...current,
      [product.key]: {
        product,
        excluded: current[product.key]?.excluded ?? [],
        notes: current[product.key]?.notes ?? '',
        quantity: Math.max(0, Math.min(quantity, MAX_QUANTITY)),
      },
    }));
  };

  const leave = () => {
    if (count === 0) return router.back();
    Alert.alert('¿Salir sin enviar?', `Los platillos de ${diner} no se han mandado a cocina.`, [
      { text: 'Seguir aquí', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const send = async () => {
    const items = chosen.filter((line) => line.product.id !== null);
    if (items.length === 0 || !user) return;
    setSending(true);
    try {
      const delivery = await placeKitchenOrder({
        tableId,
        tableNumber,
        label: diner,
        owner: user.email,
        offline,
        items: items.map((line) => ({
          productId: line.product.id!,
          name: line.product.name,
          price: line.product.price,
          quantity: line.quantity,
          excluded: line.excluded,
          notes: line.notes,
        })),
      });
      recordOrdered(items.flatMap((line) => Array<number>(line.quantity).fill(line.product.id!)));
      setSentLabels((current) => [...current, diner]);
      setLines({});
      setLabel(null);
      setQuery('');
      setLastSent(
        delivery === 'sent'
          ? `${diner} enviado a cocina.`
          : `${diner} guardado sin conexión. Avisa a cocina en persona: se enviará al sistema al volver el internet.`,
      );
      if (delivery === 'sent') detail.reload();
    } catch (err) {
      Alert.alert('No se pudo enviar', errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const editingLine = editing ? lines[editing.key] : undefined;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header: table, what it already has, and the diner being served now. */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Regresar al mapa de mesas"
            onPress={leave}
            style={[styles.back, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={22} tintColor={colors.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Muestra lo que ya pidió la mesa"
            onPress={() => setShowTable((v) => !v)}
            style={styles.headerText}>
            <Text style={[styles.tableTitle, { color: colors.text }]}>Mesa {tableNumber}</Text>
            <Text style={[styles.tableSubtitle, { color: colors.textSecondary }]}>
              {orders.length > 0
                ? `${orders.length} ${orders.length === 1 ? 'cuenta' : 'cuentas'} · ${formatMoney(tableTotal)} ${showTable ? '▲' : '▼'}`
                : 'Mesa nueva'}
            </Text>
          </Pressable>
          {orders.length > 0 && count === 0 && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setCharging(true)}
              style={({ pressed }) => [styles.chargeButton, { opacity: pressed ? 0.85 : 1 }]}>
              <Text style={styles.chargeText}>Cobrar</Text>
            </Pressable>
          )}
        </View>

        <View style={[styles.diner, { borderColor: `${Brand.blue}66`, backgroundColor: `${Brand.blue}14` }]}>
          <SymbolView name={{ ios: 'person.fill', android: 'person', web: 'person' }} size={18} tintColor={Brand.blue} />
          {editingLabel ? (
            <TextInput
              autoFocus
              value={label ?? diner}
              onChangeText={setLabel}
              onBlur={() => setEditingLabel(false)}
              onSubmitEditing={() => setEditingLabel(false)}
              maxLength={40}
              returnKeyType="done"
              selectTextOnFocus
              selectionColor={Brand.orange}
              style={[styles.dinerInput, { color: colors.text }]}
              accessibilityLabel="Nombre del comensal"
            />
          ) : (
            <Pressable accessibilityRole="button" accessibilityHint="Cambia el nombre del comensal" onPress={() => setEditingLabel(true)} style={styles.dinerName}>
              <Text style={[styles.dinerText, { color: colors.text }]} numberOfLines={1}>
                Pidiendo: <Text style={styles.dinerStrong}>{diner}</Text>
              </Text>
              <SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={14} tintColor={colors.textSecondary} />
            </Pressable>
          )}
        </View>

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
              <SymbolView name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }} size={20} tintColor={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {!search && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={[styles.chipsBar, { borderBottomColor: colors.border }]}
          contentContainerStyle={styles.chips}>
          {[...(frequent.length > 0 ? [{ name: FREQUENT, label: '★ Frecuentes' }] : []), ...categories.map((c) => ({ name: c.name, label: c.name }))].map(
            (chip) => {
              const active = chip.name === activeCategory;
              return (
                <Pressable
                  key={chip.name}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setCategory(chip.name)}
                  style={[
                    styles.chip,
                    active ? { backgroundColor: Brand.blue, borderColor: Brand.blue } : { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}>
                  <Text style={[styles.chipText, { color: active ? Brand.white : colors.text }]}>{chip.label}</Text>
                </Pressable>
              );
            },
          )}
        </ScrollView>
      )}

      <FlatList
        data={products}
        keyExtractor={(product) => product.key}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 140 }]}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <OfflineBanner />
            <OutboxBanner tableId={tableId} />
            {!!lastSent && (
              <View style={[styles.sent, { borderColor: `${Brand.green}66`, backgroundColor: `${Brand.green}14` }]}>
                <SymbolView name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} size={18} tintColor={Brand.greenLight} />
                <Text style={[styles.sentText, { color: colors.text }]}>
                  {lastSent} Sigue con <Text style={styles.dinerStrong}>{diner}</Text> o regresa al mapa.
                </Text>
              </View>
            )}
            {showTable && <TableOrders orders={orders} />}
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
        {offline && count > 0 && (
          <Text style={styles.offlineNote}>
            Sin conexión: la cocina no recibirá este pedido hasta que vuelva el internet. Avísale en persona.
          </Text>
        )}
        <View style={styles.bottomRow}>
          <View style={styles.bottomTotal}>
            <Text style={[styles.bottomLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              {diner} · {count} {count === 1 ? 'platillo' : 'platillos'}
            </Text>
            <Text style={styles.bottomValue}>{formatMoney(total)}</Text>
          </View>
          {count > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: sending, busy: sending }}
              disabled={sending}
              onPress={send}
              style={({ pressed }) => [styles.send, { backgroundColor: offline ? AMBER : Brand.blue, opacity: pressed || sending ? 0.85 : 1 }]}>
              <SymbolView
                name={offline ? { ios: 'tray.and.arrow.down', android: 'save', web: 'save' } : { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }}
                size={18}
                tintColor={Brand.white}
              />
              <Text style={styles.sendText}>{sending ? 'Enviando…' : offline ? 'Guardar pedido' : 'Enviar a cocina'}</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.send, { backgroundColor: colors.border, opacity: pressed ? 0.85 : 1 }]}>
              <Text style={[styles.sendText, { color: colors.text }]}>Terminar</Text>
            </Pressable>
          )}
        </View>
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

      {charging && (
        <ChargeSheet
          table={{ id: tableId, number: tableNumber, total: tableTotal, kitchenPending: orders.some((o) => o.kitchenPending) }}
          onClose={() => setCharging(false)}
          onDone={(summary) => {
            setCharging(false);
            Alert.alert(`Mesa ${tableNumber}`, summary, [{ text: 'Listo', onPress: () => router.back() }]);
          }}
        />
      )}
    </View>
  );
}

/** What the table already ordered, per diner, so nothing is asked twice. */
function TableOrders({ orders }: { orders: ReturnType<typeof openOrders> }) {
  const { colors } = useBrandTheme();
  if (orders.length === 0) {
    return <Text style={[styles.empty, { color: colors.textSecondary }]}>Esta mesa aún no tiene pedidos.</Text>;
  }
  return (
    <View style={[styles.tableOrders, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      {orders.map((order, i) => (
        <View key={order.ref ?? order.id ?? i} style={[styles.tableOrder, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
          <View style={styles.tableOrderTop}>
            <Text style={[styles.tableOrderLabel, { color: colors.text }]}>
              {order.label}
              {order.unsent && <Text style={{ color: AMBER }}>  · sin enviar</Text>}
            </Text>
            <Text style={[styles.tableOrderTotal, { color: colors.text }]}>{formatMoney(order.total)}</Text>
          </View>
          <Text style={[styles.tableOrderItems, { color: colors.textSecondary }]}>
            {order.items.map((item) => `${item.quantity}× ${item.name}`).join(' · ')}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Tap the dish to add one; − and the pencil (ingredients, notes) appear once it's chosen. */
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${formatMoney(product.price)}${quantity ? `, ${quantity} en el pedido` : ''}`}
      accessibilityHint="Agrega uno"
      disabled={!orderable}
      onPress={() => onChange(quantity + 1)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: quantity > 0 ? Brand.blue : colors.border },
        pressed && styles.pressed,
        !orderable && styles.dim,
      ]}>
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
        {!orderable && <Text style={styles.unavailable}>Agotado</Text>}
        {customized && (
          <Text style={[styles.custom, { color: Brand.orange }]} numberOfLines={2}>
            {[
              line!.excluded.length > 0 ? `Sin ${line!.excluded.map((i) => i.name.toLowerCase()).join(', ')}` : '',
              line!.notes.trim(),
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        )}
      </View>

      {quantity > 0 ? (
        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Personalizar ${product.name}`}
            onPress={onEdit}
            hitSlop={4}
            style={[styles.iconButton, { backgroundColor: colors.background, borderColor: customized ? Brand.orange : colors.border }]}>
            <SymbolView name={{ ios: 'square.and.pencil', android: 'edit_note', web: 'edit_note' }} size={18} tintColor={customized ? Brand.orange : colors.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Quitar uno de ${product.name}`}
            onPress={() => onChange(quantity - 1)}
            hitSlop={4}
            style={[styles.iconButton, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.stepText, { color: colors.text }]}>−</Text>
          </Pressable>
          <View style={styles.qtyBadge}>
            <Text style={styles.qtyText} accessibilityLiveRegion="polite">
              {quantity}
            </Text>
          </View>
        </View>
      ) : (
        orderable && (
          <View style={[styles.addHint, { borderColor: colors.border }]}>
            <Text style={[styles.stepText, { color: Brand.blue }]}>+</Text>
          </View>
        )
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    fontFamily: BrandFonts.display,
    fontSize: 30,
    lineHeight: 32,
  },
  tableSubtitle: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 13,
  },
  chargeButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: Radius.sm,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chargeText: {
    color: Brand.white,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
    textTransform: 'uppercase',
  },
  diner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  dinerName: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dinerText: {
    flexShrink: 1,
    fontFamily: BrandFonts.body,
    fontSize: 16,
  },
  dinerStrong: {
    fontFamily: BrandFonts.bodyBold,
  },
  dinerInput: {
    flex: 1,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 16,
    paddingVertical: 8,
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
    fontSize: 16,
    paddingVertical: 12,
  },
  chipsBar: {
    flexGrow: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chips: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chip: {
    minHeight: 42,
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
    gap: 10,
  },
  listHeader: {
    gap: 10,
  },
  sent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  sentText: {
    flex: 1,
    fontFamily: BrandFonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  tableOrders: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
  },
  tableOrder: {
    paddingVertical: 10,
    gap: 4,
  },
  tableOrderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  tableOrderLabel: {
    flex: 1,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
  },
  tableOrderTotal: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  tableOrderItems: {
    fontFamily: BrandFonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  empty: {
    fontFamily: BrandFonts.body,
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: 10,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: Radius.sm,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 16,
  },
  rowPrice: {
    color: Brand.greenLight,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
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
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBadge: {
    minWidth: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: Brand.blue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  qtyText: {
    color: Brand.white,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 18,
  },
  addHint: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 22,
  },
  dim: {
    opacity: 0.4,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  offlineNote: {
    color: AMBER,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 13,
    lineHeight: 18,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bottomTotal: {
    flex: 1,
  },
  bottomLabel: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  bottomValue: {
    color: Brand.greenLight,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
  },
  send: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 56,
    paddingHorizontal: 20,
    borderRadius: Radius.md,
  },
  sendText: {
    color: Brand.white,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
    textTransform: 'uppercase',
  },
});
