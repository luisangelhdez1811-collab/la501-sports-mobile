import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError, errorMessage } from '@/api/client';
import { getTable, KITCHEN_PENDING_STATUS, PAYMENT_METHODS, type PaymentMethod, type TableOrder } from '@/api/waiter';
import { formatMoney } from '@/components/account/orders-list';
import { FormMessage } from '@/components/brand/form-message';
import { TextField } from '@/components/brand/text-field';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { createBills, coversTable, orderKey, ordersTotal, type Bill } from '@/domain/bills';
import { chargeOrders, CHARGE_NEEDS_CONNECTION, CHARGE_NEEDS_SENT_ORDERS } from '@/data/waiter-actions';
import { newRef, useOutbox } from '@/data/waiter-outbox';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useCachedResource } from '@/hooks/use-cached-resource';
import { useIsOffline } from '@/hooks/use-connectivity';
import { openOrders } from '@/domain/waiter-tables';

const MAX_PAYMENTS = 3;
const AMBER = '#F59E0B';

type Row = { key: number; method: PaymentMethod; amount: string };

const toAmount = (text: string) => {
  const n = Number.parseFloat(text.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const cents = (n: number) => Math.round(n * 100);

export { orderKey } from '@/domain/bills';

type ChargeSheetProps = {
  table: { id: number; number: string; total: number; kitchenPending: boolean };
  /** Charge only this diner's order (see `orderKey`) instead of asking. */
  only?: string;
  onClose: () => void;
  /**
   * After the last bill; `summary` says what happened (charged, or flagged for the admin)
   * and `wholeTable` whether nothing of the table is left open.
   */
  onDone: (summary: string, wholeTable: boolean) => void;
};

/**
 * "Cobrar mesa": when the table has several diners, first ask whether they pay together,
 * separately (each diner's order in the order it was taken) or just one of them. Closing
 * the sheet halfway leaves the rest open. Charging needs a connection: the server confirms
 * every charge before the table is freed (orders, instead, can be taken offline).
 */
export function ChargeSheet({ table, only, onClose, onDone }: ChargeSheetProps) {
  const { colors } = useBrandTheme();
  const insets = useSafeAreaInsets();
  const { entries } = useOutbox();
  const detail = useCachedResource(`waiter-table-${table.id}`, (signal) => getTable(table.id, signal), { persist: true });
  // Bills are fixed once the waiter picks how to pay, so charging one doesn't reshuffle the rest.
  const [bills, setBills] = useState<Bill[] | null>(null);
  const [step, setStep] = useState(0);
  const [outcomes, setOutcomes] = useState<string[]>([]);

  const loading = detail.data === null && detail.loading;
  const orders = detail.data
    ? openOrders(detail.data, table.id, entries)
    : // No saved copy of this table yet: one bill, as the map shows it (charged once online).
      [{ id: null, ref: null, label: 'Mesa completa', total: table.total, kitchenPending: table.kitchenPending, items: [] }];
  const choosing = bills === null && !only && orders.length > 1;
  const activeBills = bills ?? createBills(orders, only ? { mode: 'una', key: only } : { mode: 'junto' });
  const bill = activeBills[step];

  const finishBill = (outcome: string) => {
    const next = [...outcomes, outcome];
    if (step + 1 < activeBills.length) {
      setOutcomes(next);
      setStep(step + 1);
    } else {
      onDone(next.join('\n'), coversTable(activeBills, orders));
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: insets.bottom }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
                Cobrar <Text style={{ color: Brand.orange }}>Mesa {table.number}</Text>
              </Text>
              {!choosing && activeBills.length > 1 && (
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Cuenta {step + 1} de {activeBills.length} · {bill.label}
                </Text>
              )}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={8} onPress={onClose}>
              <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={20} tintColor={colors.textSecondary} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={Brand.orange} size="large" style={styles.loader} />
          ) : choosing ? (
            <ChooseMode
              orders={orders}
              onTogether={() => setBills(createBills(orders, { mode: 'junto' }))}
              onSeparate={() => setBills(createBills(orders, { mode: 'separado' }))}
              onOne={(order) => setBills(createBills(orders, { mode: 'una', key: orderKey(order) }))}
            />
          ) : bill ? (
            <BillPayment
              key={step}
              bill={bill}
              tableId={table.id}
              onCancel={onClose}
              onCharged={finishBill}
            />
          ) : (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>Esta mesa no tiene nada por cobrar.</Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ChooseMode({
  orders,
  onTogether,
  onSeparate,
  onOne,
}: {
  orders: TableOrder[];
  onTogether: () => void;
  onSeparate: () => void;
  onOne: (order: TableOrder) => void;
}) {
  const { colors } = useBrandTheme();
  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={[styles.question, { color: colors.text }]}>¿Cómo van a pagar?</Text>
      <ModeButton
        icon={{ ios: 'person.3.fill', android: 'groups', web: 'groups' }}
        title={`Todo junto · ${formatMoney(ordersTotal(orders))}`}
        subtitle={`Una sola cuenta con los ${orders.length} pedidos de la mesa.`}
        onPress={onTogether}
      />
      <ModeButton
        icon={{ ios: 'person.fill', android: 'person', web: 'person' }}
        title="Por separado"
        subtitle="Cada quien paga lo suyo, en el orden en que se tomaron los pedidos."
        onPress={onSeparate}
      />
      <Text style={[styles.section, { color: colors.textSecondary }]}>O cobra solo a una persona</Text>
      <View style={[styles.list, { borderColor: colors.border }]}>
        {orders.map((order, i) => (
          <Pressable
            key={orderKey(order)}
            accessibilityRole="button"
            accessibilityLabel={`Cobrar solo a ${order.label}, ${formatMoney(order.total)}`}
            onPress={() => onOne(order)}
            style={({ pressed }) => [
              styles.listRow,
              styles.pickRow,
              i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
              pressed && { backgroundColor: `${Brand.green}1A` },
            ]}>
            <Text style={[styles.listLabel, { color: colors.text }]}>
              {i + 1}. {order.label}
              {order.unsent ? '  ·  sin enviar' : ''}
            </Text>
            <Text style={[styles.listValue, { color: colors.text }]}>{formatMoney(order.total)}</Text>
            <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={16} tintColor={colors.textSecondary} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function ModeButton({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof SymbolView>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { colors } = useBrandTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.mode,
        { borderColor: pressed ? Brand.green : colors.border, backgroundColor: pressed ? `${Brand.green}1A` : colors.background },
      ]}>
      <View style={[styles.modeIcon, { backgroundColor: `${Brand.green}22` }]}>
        <SymbolView name={icon} size={24} tintColor={Brand.greenLight} />
      </View>
      <View style={styles.modeText}>
        <Text style={[styles.modeTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.modeSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
      <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={18} tintColor={colors.textSecondary} />
    </Pressable>
  );
}

/**
 * Payments for one bill: split across methods; confirming takes a second tap. When dishes
 * are still in the kitchen it becomes "Forzar cobro" (reason + password, audited).
 */
function BillPayment({
  bill,
  tableId,
  onCancel,
  onCharged,
}: {
  bill: Bill;
  tableId: number;
  onCancel: () => void;
  onCharged: (outcome: string) => void;
}) {
  const { colors } = useBrandTheme();
  const offline = useIsOffline();
  // One reference for every attempt at this bill: retrying after a dropped connection
  // never charges twice.
  const [ref] = useState(() => newRef('cobro'));
  const [rows, setRows] = useState<Row[]>(() => [{ key: 0, method: 'efectivo', amount: bill.total.toFixed(2) }]);
  const unsent = bill.orders.some((o) => o.unsent);
  const [forced, setForced] = useState(() => !unsent && bill.orders.some((o) => o.kitchenPending));
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [armed, setArmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const askForced = forced;
  const blocked = offline ? CHARGE_NEEDS_CONNECTION : unsent ? CHARGE_NEEDS_SENT_ORDERS : null;
  const paid = rows.reduce((total, row) => total + toAmount(row.amount), 0);
  const missing = cents(bill.total) - cents(paid);
  const hasCash = rows.some((row) => row.method === 'efectivo' && toAmount(row.amount) > 0);
  const covered = missing <= 0;
  const forcedReady = !askForced || (reason.trim().length >= 5 && password.length > 0);
  const canConfirm = covered && forcedReady && !submitting && !blocked;

  const update = (key: number, patch: Partial<Row>) => {
    setArmed(false);
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };
  const addRow = () => {
    setArmed(false);
    setRows((current) => [
      ...current,
      { key: Math.max(...current.map((r) => r.key)) + 1, method: 'tarjeta', amount: missing > 0 ? (missing / 100).toFixed(2) : '' },
    ]);
  };
  const removeRow = (key: number) => {
    setArmed(false);
    setRows((current) => current.filter((row) => row.key !== key));
  };

  const confirm = async () => {
    if (!canConfirm) return;
    // First tap arms the button; the second one charges (it can't be undone).
    if (!armed) return setArmed(true);
    setSubmitting(true);
    setError(null);
    try {
      const status = await chargeOrders({
        tableId,
        ref,
        orders: bill.orders,
        payments: rows
          .filter((row) => toAmount(row.amount) > 0)
          .map((row) => ({ method: row.method, amount: toAmount(row.amount) })),
        forced: askForced ? { reason, password } : undefined,
      });
      onCharged(
        status === 'applied' ? `${bill.label}: cobrado.` : `${bill.label}: cobrado y enviado a revisión del administrador.`,
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === KITCHEN_PENDING_STATUS && !forced) {
        setForced(true);
        setError('La cocina aún tiene platillos de esta cuenta. Si necesitas cobrar ya, usa el cobro forzado.');
      } else {
        setError(errorMessage(err));
      }
      setArmed(false);
      setSubmitting(false);
    } finally {
      setPassword('');
    }
  };

  const summary = covered
    ? missing === 0
      ? { text: 'Monto cubierto exactamente', color: Brand.greenLight }
      : { text: `${hasCash ? 'Cambio a entregar' : 'Pagado de más'}: ${formatMoney(-missing / 100)}`, color: Brand.greenLight }
    : { text: `Faltan por cubrir: ${formatMoney(missing / 100)}`, color: AMBER };
  const items = bill.orders.flatMap((order) => order.items);

  return (
    <>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        {!!blocked && (
          <View style={[styles.notice, { borderColor: `${AMBER}66`, backgroundColor: `${AMBER}14` }]}>
            <SymbolView
              name={offline ? { ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' } : { ios: 'tray.and.arrow.up', android: 'cloud_upload', web: 'cloud_upload' }}
              size={16}
              tintColor={AMBER}
            />
            <Text style={[styles.noticeText, { color: colors.text }]}>{blocked}</Text>
          </View>
        )}

        {items.length > 0 && (
          <View style={[styles.list, { borderColor: colors.border }]}>
            {items.map((item, i) => (
              <View key={i} style={[styles.listRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                <Text style={[styles.listLabel, { color: colors.text }]} numberOfLines={2}>
                  {item.quantity}× {item.name}
                </Text>
                <Text style={[styles.listValue, { color: colors.textSecondary }]}>{formatMoney(item.price * item.quantity)}</Text>
              </View>
            ))}
          </View>
        )}

        {askForced && (
          <View style={[styles.forcedBox, { borderColor: `${Brand.red}66`, backgroundColor: `${Brand.red}12` }]}>
            <Text style={styles.forcedText}>
              Hay platillos en preparación. Usa el cobro forzado solo si la cocina no responde o hubo una falla:
              quedará registrado con tu usuario para revisión del administrador.
            </Text>
            <TextField
              label="Motivo (obligatorio)"
              value={reason}
              onChangeText={(v) => {
                setReason(v);
                setArmed(false);
              }}
              placeholder="Ej: la pantalla de cocina no responde"
              multiline
              maxLength={200}
            />
            <TextField
              label="Confirma tu contraseña"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setArmed(false);
              }}
              password
              autoComplete="current-password"
            />
          </View>
        )}

        <View style={styles.sectionRow}>
          <Text style={[styles.section, { color: colors.textSecondary }]}>Pagos</Text>
          {rows.length < MAX_PAYMENTS && (
            <Pressable accessibilityRole="button" onPress={addRow} hitSlop={6}>
              <Text style={styles.addPayment}>+ Dividir pago</Text>
            </Pressable>
          )}
        </View>

        {rows.map((row) => (
          <View key={row.key} style={[styles.payment, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.methods}>
              {PAYMENT_METHODS.map((method) => {
                const active = method.value === row.method;
                return (
                  <Pressable
                    key={method.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    onPress={() => update(row.key, { method: method.value })}
                    style={[
                      styles.method,
                      active ? { backgroundColor: `${Brand.green}26`, borderColor: Brand.green } : { borderColor: colors.border },
                    ]}>
                    <Text style={[styles.methodText, { color: active ? Brand.greenLight : colors.textSecondary }]}>
                      {method.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.amountRow}>
              <View style={[styles.amountBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={[styles.currency, { color: colors.textSecondary }]}>$</Text>
                <TextInput
                  value={row.amount}
                  onChangeText={(v) => update(row.key, { amount: v.replace(/[^\d.,]/g, '') })}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  selectionColor={Brand.orange}
                  selectTextOnFocus
                  style={[styles.amountInput, { color: colors.text }]}
                  accessibilityLabel="Monto"
                />
              </View>
              {rows.length > 1 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Quitar pago"
                  onPress={() => removeRow(row.key)}
                  style={[styles.remove, { borderColor: colors.border }]}>
                  <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={16} tintColor={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          </View>
        ))}

        <View style={[styles.totals, { backgroundColor: colors.background }]}>
          <View style={styles.totalLine}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total a pagar</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>{formatMoney(bill.total)}</Text>
          </View>
          <View style={styles.totalLine}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Recibido</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>{formatMoney(paid)}</Text>
          </View>
          <View style={[styles.status, { borderColor: `${summary.color}55`, backgroundColor: `${summary.color}14` }]}>
            <Text style={[styles.statusText, { color: summary.color }]}>{summary.text}</Text>
          </View>
        </View>

        {!!error && <FormMessage type="error">{error}</FormMessage>}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancel}>
          <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancelar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canConfirm, busy: submitting }}
          disabled={!canConfirm}
          onPress={confirm}
          style={({ pressed }) => [
            styles.confirm,
            {
              backgroundColor: armed || askForced ? Brand.red : Brand.green,
              opacity: canConfirm ? (pressed ? 0.85 : 1) : 0.4,
            },
          ]}>
          <Text style={styles.confirmText}>
            {submitting
              ? 'Cobrando…'
              : armed
                ? '¿Seguro? Toca de nuevo'
                : offline
                  ? 'Sin conexión'
                  : askForced
                    ? 'Forzar cobro'
                    : `Cobrar · ${formatMoney(bill.total)}`}
          </Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    maxHeight: '94%',
    borderTopLeftRadius: Radius.lg + 4,
    borderTopRightRadius: Radius.lg + 4,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: BrandFonts.display,
    fontSize: 28,
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
  },
  loader: {
    paddingVertical: 48,
  },
  empty: {
    padding: 24,
    fontFamily: BrandFonts.body,
    fontSize: 15,
    textAlign: 'center',
  },
  body: {
    padding: 18,
    gap: 14,
  },
  question: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 20,
  },
  mode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderWidth: 1.5,
    borderRadius: Radius.md,
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeText: {
    flex: 1,
    gap: 2,
  },
  modeTitle: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 18,
  },
  modeSubtitle: {
    fontFamily: BrandFonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  list: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
  },
  pickRow: {
    minHeight: 48,
  },
  listLabel: {
    flex: 1,
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 15,
  },
  listValue: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  notice: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 12,
  },
  noticeText: {
    flex: 1,
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 13,
    lineHeight: 19,
  },
  forcedBox: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 14,
    gap: 12,
  },
  forcedText: {
    color: Brand.red,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  section: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  addPayment: {
    color: Brand.orange,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
  },
  payment: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 12,
    gap: 10,
  },
  methods: {
    flexDirection: 'row',
    gap: 6,
  },
  method: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 13,
  },
  amountRow: {
    flexDirection: 'row',
    gap: 8,
  },
  amountBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    minHeight: 52,
  },
  currency: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 18,
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 22,
    paddingVertical: 8,
  },
  remove: {
    width: 52,
    borderWidth: 1,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totals: {
    borderRadius: Radius.md,
    padding: 14,
    gap: 8,
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 15,
  },
  totalValue: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  status: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: 12,
    alignItems: 'center',
  },
  statusText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancel: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cancelText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 16,
  },
  confirm: {
    flex: 1,
    minHeight: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  confirmText: {
    color: Brand.white,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 16,
    textAlign: 'center',
  },
});
