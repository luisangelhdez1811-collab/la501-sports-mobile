import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/client';
import { getTable, type TableOrder } from '@/api/waiter';
import { formatMoney } from '@/components/account/orders-list';
import { ImagePlaceholder } from '@/components/brand/image-placeholder';
import { OfflineBanner } from '@/components/brand/offline-banner';
import { ProductDetailSheet } from '@/components/menu/product-detail-sheet';
import { ChargeSheet, orderKey } from '@/components/waiter/charge-sheet';
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
import { searchProducts } from '@/utils/menu-search';
import { nextDinerLabel, openOrders } from '@/utils/waiter-tables';

/** One dish in the current diner's order; the same dish can appear with different choices. */
type Line = { id: number; product: Product; quantity: number; excluded: Ingredient[]; notes: string };
type Mode = 'pedido' | 'cuentas';

const MAX_QUANTITY = 50;
const FREQUENT = '__frecuentes';
const FREQUENT_COUNT = 24;
const AMBER = '#F59E0B';

const ingredientIds = (list: Ingredient[]) => list.map((i) => String(i.id ?? i.name)).sort().join('|');
const sameChoice = (line: Line, product: Product, excluded: Ingredient[], notes: string) =>
  line.product.key === product.key && line.notes.trim() === notes.trim() && ingredientIds(line.excluded) === ingredientIds(excluded);

const customization = (excluded: Ingredient[], notes: string) =>
  [excluded.length > 0 ? `Sin ${excluded.map((i) => i.name.toLowerCase()).join(', ')}` : '', notes.trim()]
    .filter(Boolean)
    .join(' · ');

/**
 * A table, in two tabs. "Tomar pedido", one diner at a time: tapping a dish opens its card
 * (description, ingredients, comments, how many) like the customer sees it; the order is
 * sent to the kitchen and the screen moves on to the next person. "Cuentas": what each
 * person ordered and their total, to charge one of them or the whole table.
 * Orders work offline (the menu is saved on the phone and orders wait in the outbox);
 * charging needs internet.
 */
export default function TableScreen() {
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

  const [mode, setMode] = useState<Mode>('pedido');
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const nextLineId = useRef(1);
  const [picking, setPicking] = useState<{ product: Product; line?: Line } | null>(null);
  const [showLines, setShowLines] = useState(true);
  const [label, setLabel] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [sentLabels, setSentLabels] = useState<string[]>([]);
  // `only`: one diner's order (see orderKey); absent: the whole table (asks how they pay).
  const [charging, setCharging] = useState<{ only?: string } | null>(null);
  const [barHeight, setBarHeight] = useState(140);

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
  const searching = query.trim().length > 0;
  const products = searching
    ? searchProducts(allProducts, query)
    : activeCategory === FREQUENT
      ? frequent
      : (categories.find((c) => c.name === activeCategory)?.products ?? []);

  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const total = lines.reduce((sum, line) => sum + line.quantity * line.product.price, 0);
  const chosen = (product: Product) =>
    lines.filter((line) => line.product.key === product.key).reduce((sum, line) => sum + line.quantity, 0);

  const pick = (product: Product, excluded: Ingredient[], notes: string, quantity: number) => {
    setLastSent(null);
    setShowLines(true);
    const editing = picking?.line;
    if (editing) {
      setLines((current) => current.map((l) => (l.id === editing.id ? { ...l, excluded, notes, quantity } : l)));
      return;
    }
    const id = nextLineId.current++;
    setLines((current) => {
      const same = current.find((l) => sameChoice(l, product, excluded, notes));
      if (same) {
        return current.map((l) => (l === same ? { ...l, quantity: Math.min(MAX_QUANTITY, l.quantity + quantity) } : l));
      }
      return [...current, { id, product, quantity, excluded, notes }];
    });
  };

  const removeLine = (id: number) => setLines((current) => current.filter((l) => l.id !== id));

  const leave = () => {
    if (count === 0) return router.back();
    Alert.alert('¿Salir sin enviar?', `Los platillos de ${diner} no se han mandado a cocina.`, [
      { text: 'Seguir aquí', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const send = async () => {
    const items = lines.filter((line) => line.product.id !== null);
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
      setLines([]);
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

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Regresar al mapa de mesas"
            onPress={leave}
            style={[styles.back, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={22} tintColor={colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.tableTitle, { color: colors.text }]}>Mesa {tableNumber}</Text>
            <Text style={[styles.tableSubtitle, { color: colors.textSecondary }]}>
              {orders.length > 0
                ? `${orders.length} ${orders.length === 1 ? 'cuenta' : 'cuentas'} · ${formatMoney(tableTotal)}`
                : 'Mesa nueva'}
            </Text>
          </View>
        </View>

        <View style={[styles.tabs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(
            [
              { value: 'pedido', label: 'Tomar pedido' },
              { value: 'cuentas', label: orders.length > 0 ? `Cuentas · ${orders.length}` : 'Cuentas' },
            ] as const
          ).map((tab) => {
            const active = tab.value === mode;
            return (
              <Pressable
                key={tab.value}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setMode(tab.value)}
                style={[styles.tab, active && { backgroundColor: Brand.blue }]}>
                <Text style={[styles.tabText, { color: active ? Brand.white : colors.textSecondary }]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {mode === 'pedido' && (
          <>
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
              {searching && (
                <Pressable accessibilityRole="button" accessibilityLabel="Borrar búsqueda" hitSlop={8} onPress={() => setQuery('')}>
                  <SymbolView name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }} size={20} tintColor={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          </>
        )}
      </View>

      {mode === 'pedido' ? (
        <>
          {!searching && (
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
            contentContainerStyle={[styles.list, { paddingBottom: barHeight + 16 }]}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <OfflineBanner />
                <OutboxBanner tableId={tableId} />
                {!!lastSent && (
                  <View style={[styles.sent, { borderColor: `${Brand.green}66`, backgroundColor: `${Brand.green}14` }]}>
                    <SymbolView name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} size={18} tintColor={Brand.greenLight} />
                    <Text style={[styles.sentText, { color: colors.text }]}>
                      {lastSent} Sigue con <Text style={styles.dinerStrong}>{diner}</Text> o revisa las cuentas.
                    </Text>
                  </View>
                )}
              </View>
            }
            ListEmptyComponent={
              <Text style={[styles.empty, { color: colors.textSecondary }]}>
                {searching ? 'No hay platillos con ese nombre.' : 'Esta categoría no tiene platillos.'}
              </Text>
            }
            renderItem={({ item }) => <ProductRow product={item} quantity={chosen(item)} onPress={() => setPicking({ product: item })} />}
          />

          <View
            onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
            style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
            {count > 0 && showLines && (
              <ScrollView style={styles.lines} contentContainerStyle={styles.linesContent}>
                {lines.map((line) => (
                  <Pressable
                    key={line.id}
                    accessibilityRole="button"
                    accessibilityHint="Cambia ingredientes, comentarios o cantidad"
                    onPress={() => setPicking({ product: line.product, line })}
                    style={({ pressed }) => [styles.line, { borderColor: colors.border, backgroundColor: pressed ? colors.background : 'transparent' }]}>
                    <Text style={styles.lineQty}>{line.quantity}×</Text>
                    <View style={styles.lineText}>
                      <Text style={[styles.lineName, { color: colors.text }]} numberOfLines={1}>
                        {line.product.name}
                      </Text>
                      {!!customization(line.excluded, line.notes) && (
                        <Text style={styles.lineCustom} numberOfLines={2}>
                          {customization(line.excluded, line.notes)}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.linePrice, { color: colors.text }]}>{formatMoney(line.product.price * line.quantity)}</Text>
                    <SymbolView name={{ ios: 'square.and.pencil', android: 'edit_note', web: 'edit_note' }} size={18} tintColor={colors.textSecondary} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
            {offline && count > 0 && (
              <Text style={styles.offlineNote}>
                Sin conexión: la cocina no recibirá este pedido hasta que vuelva el internet. Avísale en persona.
              </Text>
            )}
            <View style={styles.bottomRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityHint={count > 0 ? (showLines ? 'Oculta los platillos elegidos' : 'Muestra los platillos elegidos') : undefined}
                disabled={count === 0}
                onPress={() => setShowLines((v) => !v)}
                style={styles.bottomTotal}>
                <Text style={[styles.bottomLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                  {diner} · {count} {count === 1 ? 'platillo' : 'platillos'}
                  {count > 0 ? (showLines ? '  ▼' : '  ▲') : ''}
                </Text>
                <Text style={styles.bottomValue}>{formatMoney(total)}</Text>
              </Pressable>
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
                  onPress={() => (orders.length > 0 ? setMode('cuentas') : router.back())}
                  style={({ pressed }) => [styles.send, { backgroundColor: colors.border, opacity: pressed ? 0.85 : 1 }]}>
                  <Text style={[styles.sendText, { color: colors.text }]}>{orders.length > 0 ? 'Ver cuentas' : 'Terminar'}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </>
      ) : (
        <>
          <ScrollView contentContainerStyle={[styles.list, { paddingBottom: barHeight + 16 }]}>
            <OfflineBanner stale={detail.stale} onRetry={detail.reload} />
            <OutboxBanner tableId={tableId} />
            {orders.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>
                {detail.data === null && detail.loading ? 'Cargando cuentas…' : 'Esta mesa aún no tiene pedidos.'}
              </Text>
            ) : (
              orders.map((order) => (
                <AccountCard key={orderKey(order)} order={order} onCharge={() => setCharging({ only: orderKey(order) })} />
              ))
            )}
          </ScrollView>

          <View
            onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
            style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.bottomRow}>
              <View style={styles.bottomTotal}>
                <Text style={[styles.bottomLabel, { color: colors.textSecondary }]}>
                  Total de la mesa · {orders.length} {orders.length === 1 ? 'cuenta' : 'cuentas'}
                </Text>
                <Text style={styles.bottomValue}>{formatMoney(tableTotal)}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: orders.length === 0 }}
                disabled={orders.length === 0}
                onPress={() => setCharging({})}
                style={({ pressed }) => [styles.send, { backgroundColor: Brand.green, opacity: orders.length === 0 ? 0.4 : pressed ? 0.85 : 1 }]}>
                <SymbolView name={{ ios: 'creditcard', android: 'payments', web: 'payments' }} size={18} tintColor={Brand.white} />
                <Text style={styles.sendText}>Cobrar mesa</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}

      <ProductDetailSheet
        key={picking ? `${picking.product.key}-${picking.line?.id ?? 'nuevo'}` : 'none'}
        product={picking?.product ?? null}
        onClose={() => setPicking(null)}
        initialExcluded={picking?.line?.excluded}
        initialNotes={picking?.line?.notes}
        initialQuantity={picking?.line?.quantity ?? 1}
        withQuantity
        confirmLabel={picking?.line ? 'Guardar' : 'Agregar'}
        ingredientsHint="Desmarca lo que el cliente no quiera."
        onRemove={picking?.line ? () => removeLine(picking.line!.id) : undefined}
        onAdd={pick}
      />

      {charging && (
        <ChargeSheet
          table={{ id: tableId, number: tableNumber, total: tableTotal, kitchenPending: orders.some((o) => o.kitchenPending) }}
          only={charging.only}
          onClose={() => setCharging(null)}
          onDone={(summary, wholeTable) => {
            setCharging(null);
            detail.reload();
            Alert.alert(`Mesa ${tableNumber}`, summary, [{ text: 'Listo', onPress: wholeTable ? () => router.back() : undefined }]);
          }}
        />
      )}
    </View>
  );
}

/** One person's account: what they ordered (with their changes) and what they owe. */
function AccountCard({ order, onCharge }: { order: TableOrder; onCharge: () => void }) {
  const { colors } = useBrandTheme();
  return (
    <View style={[styles.account, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={styles.accountTop}>
        <SymbolView name={{ ios: 'person.fill', android: 'person', web: 'person' }} size={18} tintColor={Brand.blue} />
        <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>
          {order.label}
        </Text>
        {order.unsent ? (
          <Text style={[styles.badge, { color: AMBER, borderColor: `${AMBER}66` }]}>Sin enviar</Text>
        ) : (
          order.kitchenPending && <Text style={[styles.badge, { color: Brand.orange, borderColor: `${Brand.orange}66` }]}>En cocina</Text>
        )}
      </View>

      {order.items.length > 0 ? (
        order.items.map((item, i) => (
          <View key={i} style={styles.accountItem}>
            <Text style={[styles.accountQty, { color: colors.textSecondary }]}>{item.quantity}×</Text>
            <View style={styles.lineText}>
              <Text style={[styles.accountItemName, { color: colors.text }]}>{item.name}</Text>
              {!!item.notes.trim() && <Text style={styles.lineCustom}>{item.notes}</Text>}
            </View>
            <Text style={[styles.accountItemPrice, { color: colors.text }]}>{formatMoney(item.price * item.quantity)}</Text>
          </View>
        ))
      ) : (
        <Text style={[styles.accountQty, { color: colors.textSecondary }]}>Sin detalle de platillos.</Text>
      )}

      <View style={[styles.accountBottom, { borderTopColor: colors.border }]}>
        <Text style={[styles.accountTotal, { color: colors.text }]}>{formatMoney(order.total)}</Text>
        {order.unsent ? (
          <Text style={[styles.accountHint, { color: colors.textSecondary }]}>Se cobra cuando llegue al sistema.</Text>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Cobrar a ${order.label}`}
            onPress={onCharge}
            style={({ pressed }) => [styles.accountCharge, { opacity: pressed ? 0.85 : 1 }]}>
            <Text style={styles.accountChargeText}>Cobrar a {order.label}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Tapping a dish opens its card to choose ingredients, comments and how many. */
function ProductRow({ product, quantity, onPress }: { product: Product; quantity: number; onPress: () => void }) {
  const { colors } = useBrandTheme();
  const orderable = product.available && product.id !== null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${formatMoney(product.price)}${quantity ? `, ${quantity} en el pedido` : ''}`}
      accessibilityHint="Abre el platillo para agregarlo"
      disabled={!orderable}
      onPress={onPress}
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
        {!!product.description && (
          <Text style={[styles.rowDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {product.description}
          </Text>
        )}
        <Text style={styles.rowPrice}>{formatMoney(product.price)}</Text>
        {!orderable && <Text style={styles.unavailable}>Agotado</Text>}
      </View>

      {quantity > 0 ? (
        <View style={styles.qtyBadge}>
          <Text style={styles.qtyText} accessibilityLiveRegion="polite">
            {quantity}
          </Text>
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
  tabs: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
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
    width: 64,
    height: 64,
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
  rowDescription: {
    fontFamily: BrandFonts.body,
    fontSize: 13,
    lineHeight: 18,
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
  account: {
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  accountTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountName: {
    flex: 1,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 17,
  },
  badge: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  accountQty: {
    minWidth: 28,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
  },
  accountItemName: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 14,
  },
  accountItemPrice: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  accountBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  accountTotal: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  accountHint: {
    flex: 1,
    textAlign: 'right',
    fontFamily: BrandFonts.body,
    fontSize: 13,
  },
  accountCharge: {
    flexShrink: 1,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: Radius.sm,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountChargeText: {
    color: Brand.white,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
    textTransform: 'uppercase',
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
  lines: {
    maxHeight: 200,
  },
  linesContent: {
    gap: 6,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: Radius.sm,
  },
  lineQty: {
    color: Brand.blue,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 16,
    minWidth: 30,
  },
  lineText: {
    flex: 1,
  },
  lineName: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
  },
  lineCustom: {
    color: Brand.orange,
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 12,
  },
  linePrice: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
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
