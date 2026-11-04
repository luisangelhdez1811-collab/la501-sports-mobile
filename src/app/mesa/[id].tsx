import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { TableOrderItem } from '@/api/waiter';
import { OfflineBanner } from '@/components/brand/offline-banner';
import { CustomizeSheet } from '@/components/menu/customize-sheet';
import { ChargeSheet, orderKey } from '@/components/waiter/charge-sheet';
import { OutboxBanner } from '@/components/waiter/outbox-sync';
import { AccountCard, ToServeCard } from '@/components/waiter/table-cards';
import { WaiterMenu } from '@/components/waiter/waiter-menu';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { displayName } from '@/domain/menu-options';
import { formatMoney } from '@/domain/money';
import { customization, linePrice, type OrderLine } from '@/domain/waiter-order';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useTableOrder } from '@/hooks/use-table-order';
import type { Product } from '@/types/product';

type Mode = 'pedido' | 'cuentas';

/**
 * A table, in two tabs. "Tomar pedido", one diner at a time: tapping a dish opens its card
 * (description, ingredients, comments, how many) like the customer sees it; the order is
 * sent to the kitchen and the screen moves on to the next person. "Cuentas": what each
 * person ordered and their total, to charge one of them or the whole table.
 * Orders work offline (the menu is saved on the phone and orders wait in the outbox);
 * charging needs internet. The logic lives in useTableOrder; this screen only draws it.
 */
export default function TableScreen() {
  const { colors } = useBrandTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; numero?: string }>();
  const tableId = Number(params.id);
  const tableNumber = params.numero ?? params.id;
  const table = useTableOrder(tableId, tableNumber);

  const [mode, setMode] = useState<Mode>('pedido');
  const [query, setQuery] = useState('');
  const [picking, setPicking] = useState<{ product: Product; line?: OrderLine } | null>(null);
  const [showLines, setShowLines] = useState(true);
  const [editingLabel, setEditingLabel] = useState(false);
  // `only`: one diner's order (see orderKey); absent: the whole table (asks how they pay).
  const [charging, setCharging] = useState<{ only?: string } | null>(null);
  const [barHeight, setBarHeight] = useState(140);
  const searching = query.trim().length > 0;

  const quickAdd = (product: Product) => {
    if (table.quickAdd(product)) setShowLines(true);
    else setPicking({ product });
  };

  const serve = async (items: TableOrderItem[]) => {
    const failed = await table.serve(items);
    if (failed) Alert.alert('No se pudo marcar como entregado', failed);
  };

  const send = async () => {
    const failed = await table.send();
    if (failed) Alert.alert('No se pudo enviar', failed);
    else setQuery('');
  };

  const leave = () => {
    if (table.count === 0) return router.back();
    Alert.alert('¿Salir sin enviar?', `Los platillos de ${table.diner} todavía no se envían.`, [
      { text: 'Seguir aquí', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => router.back() },
    ]);
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
              {table.orders.length > 0
                ? `${table.orders.length} ${table.orders.length === 1 ? 'cuenta' : 'cuentas'} · ${formatMoney(table.tableTotal)}`
                : 'Mesa nueva'}
            </Text>
          </View>
        </View>

        <View style={[styles.tabs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(
            [
              { value: 'pedido', label: 'Tomar pedido' },
              { value: 'cuentas', label: table.orders.length > 0 ? `Cuentas · ${table.orders.length}` : 'Cuentas' },
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
                  value={table.label ?? table.diner}
                  onChangeText={table.setLabel}
                  onBlur={() => setEditingLabel(false)}
                  onSubmitEditing={() => setEditingLabel(false)}
                  maxLength={40}
                  returnKeyType="done"
                  selectTextOnFocus
                  selectionColor={colors.accent}
                  style={[styles.dinerInput, { color: colors.text }]}
                  accessibilityLabel="Nombre del comensal"
                />
              ) : (
                <Pressable accessibilityRole="button" accessibilityHint="Cambia el nombre del comensal" onPress={() => setEditingLabel(true)} style={styles.dinerName}>
                  <Text style={[styles.dinerText, { color: colors.text }]} numberOfLines={1}>
                    Pidiendo: <Text style={styles.dinerStrong}>{table.diner}</Text>
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
                selectionColor={colors.accent}
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
          <WaiterMenu
            categories={table.categories}
            frequent={table.frequent}
            query={query}
            quantityOf={table.chosen}
            onAdd={quickAdd}
            onRemoveOne={table.removeOne}
            onCustomize={(product) => setPicking({ product })}
            bottomInset={barHeight}
            header={
              <View style={styles.listHeader}>
                <OfflineBanner />
                <OutboxBanner tableId={tableId} />
                {!!table.lastSent && (
                  <View style={[styles.sent, { borderColor: `${Brand.green}66`, backgroundColor: `${Brand.green}14` }]}>
                    <SymbolView name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} size={18} tintColor={colors.success} />
                    <Text style={[styles.sentText, { color: colors.text }]}>
                      {table.lastSent} Sigue con <Text style={styles.dinerStrong}>{table.diner}</Text> o revisa las cuentas.
                    </Text>
                  </View>
                )}
                {table.pendingDelivery.length > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setMode('cuentas')}
                    style={[styles.sent, { borderColor: `${Brand.green}66`, backgroundColor: `${Brand.green}14` }]}>
                    <SymbolView name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }} size={18} tintColor={colors.success} />
                    <Text style={[styles.sentText, { color: colors.text }]}>
                      <Text style={styles.dinerStrong}>{table.pendingDelivery.reduce((n, p) => n + p.item.quantity, 0)} por entregar</Text>{' '}
                      en esta mesa. Toca para verlos.
                    </Text>
                  </Pressable>
                )}
              </View>
            }
          />

          <View
            onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
            style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
            {table.count > 0 && showLines && (
              <ScrollView style={styles.lines} contentContainerStyle={styles.linesContent}>
                {table.lines.map((line) => (
                  <Pressable
                    key={line.id}
                    accessibilityRole="button"
                    accessibilityHint="Cambia opciones, ingredientes, comentarios o cantidad"
                    onPress={() => setPicking({ product: line.product, line })}
                    style={({ pressed }) => [styles.line, { borderColor: colors.border, backgroundColor: pressed ? colors.background : 'transparent' }]}>
                    <Text style={styles.lineQty}>{line.quantity}×</Text>
                    <View style={styles.lineText}>
                      <Text style={[styles.lineName, { color: colors.text }]} numberOfLines={1}>
                        {displayName(line.product, line.selection)}
                      </Text>
                      {!!customization(line) && (
                        <Text style={[styles.lineCustom, { color: colors.accent }]} numberOfLines={2}>
                          {customization(line)}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.linePrice, { color: colors.text }]}>{formatMoney(linePrice(line) * line.quantity)}</Text>
                    <SymbolView name={{ ios: 'square.and.pencil', android: 'edit_note', web: 'edit_note' }} size={18} tintColor={colors.textSecondary} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
            {table.offline && table.count > 0 && (
              <Text style={[styles.offlineNote, { color: colors.warning }]}>
                Sin conexión: cocina y barra no recibirán este pedido hasta que vuelva el internet. Avísales en persona.
              </Text>
            )}
            <View style={styles.bottomRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityHint={table.count > 0 ? (showLines ? 'Oculta los platillos elegidos' : 'Muestra los platillos elegidos') : undefined}
                disabled={table.count === 0}
                onPress={() => setShowLines((v) => !v)}
                style={styles.bottomTotal}>
                <Text style={[styles.bottomLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                  {table.diner} · {table.count} {table.count === 1 ? 'platillo' : 'platillos'}
                  {table.count > 0 ? (showLines ? '  ▼' : '  ▲') : ''}
                </Text>
                <Text style={[styles.bottomValue, { color: colors.success }]}>{formatMoney(table.total)}</Text>
              </Pressable>
              {table.count > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: table.sending, busy: table.sending }}
                  disabled={table.sending}
                  onPress={send}
                  style={({ pressed }) => [styles.send, { backgroundColor: table.offline ? Brand.orangeFill : Brand.blue, opacity: pressed || table.sending ? 0.85 : 1 }]}>
                  <SymbolView
                    name={table.offline ? { ios: 'tray.and.arrow.down', android: 'save', web: 'save' } : { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }}
                    size={18}
                    tintColor={Brand.white}
                  />
                  <Text style={styles.sendText}>{table.sending ? 'Enviando…' : table.offline ? 'Guardar pedido' : 'Enviar pedido'}</Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => (table.orders.length > 0 ? setMode('cuentas') : router.back())}
                  style={({ pressed }) => [styles.send, { backgroundColor: colors.border, opacity: pressed ? 0.85 : 1 }]}>
                  <Text style={[styles.sendText, { color: colors.text }]}>{table.orders.length > 0 ? 'Ver cuentas' : 'Terminar'}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </>
      ) : (
        <>
          <ScrollView contentContainerStyle={[styles.list, { paddingBottom: barHeight + 16 }]}>
            <OfflineBanner stale={table.detail.stale} onRetry={table.detail.reload} />
            <OutboxBanner tableId={tableId} />
            {table.pendingDelivery.length > 0 && (
              <ToServeCard
                entries={table.pendingDelivery}
                serving={table.serving}
                disabled={table.offline}
                onServe={(item) => serve([item])}
                onServeAll={() => serve(table.pendingDelivery.map((p) => p.item))}
              />
            )}
            {table.orders.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>
                {table.detail.data === null && table.detail.loading ? 'Cargando cuentas…' : 'Esta mesa aún no tiene pedidos.'}
              </Text>
            ) : (
              table.orders.map((order) => (
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
                  Total de la mesa · {table.orders.length} {table.orders.length === 1 ? 'cuenta' : 'cuentas'}
                </Text>
                <Text style={[styles.bottomValue, { color: colors.success }]}>{formatMoney(table.tableTotal)}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: table.orders.length === 0 }}
                disabled={table.orders.length === 0}
                onPress={() => setCharging({})}
                style={({ pressed }) => [styles.send, { backgroundColor: Brand.greenFill, opacity: table.orders.length === 0 ? 0.4 : pressed ? 0.85 : 1 }]}>
                <SymbolView name={{ ios: 'creditcard', android: 'payments', web: 'payments' }} size={18} tintColor={Brand.white} />
                <Text style={styles.sendText}>Cobrar mesa</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}

      {picking && (
        <CustomizeSheet
          key={`${picking.product.key}-${picking.line?.id ?? 'nuevo'}`}
          product={picking.product}
          onClose={() => setPicking(null)}
          initial={picking.line}
          withQuantity
          confirmLabel={picking.line ? 'Guardar' : 'Agregar'}
          reminderNote="Confirma con el cliente."
          onRemove={picking.line ? () => table.removeLine(picking.line!.id) : undefined}
          onAdd={(product, choice) => {
            setShowLines(true);
            table.pick(product, choice, picking.line);
          }}
        />
      )}

      {charging && (
        <ChargeSheet
          table={{ id: tableId, number: tableNumber, total: table.tableTotal, kitchenPending: table.orders.some((o) => o.kitchenPending) }}
          only={charging.only}
          onClose={() => setCharging(null)}
          onDone={(summary, wholeTable) => {
            setCharging(null);
            table.detail.reload();
            Alert.alert(`Mesa ${tableNumber}`, summary, [{ text: 'Listo', onPress: wholeTable ? () => router.back() : undefined }]);
          }}
        />
      )}
    </View>
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
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 12,
  },
  linePrice: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  offlineNote: {
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
