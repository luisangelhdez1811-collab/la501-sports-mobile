import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
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
import {
  chargeTable,
  KITCHEN_PENDING_STATUS,
  PAYMENT_METHODS,
  type PaymentMethod,
  type RestaurantTable,
} from '@/api/waiter';
import { formatMoney } from '@/components/account/orders-list';
import { FormMessage } from '@/components/brand/form-message';
import { TextField } from '@/components/brand/text-field';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

const MAX_PAYMENTS = 3;
const AMBER = '#F59E0B';

type Row = { key: number; method: PaymentMethod; amount: string };

const toAmount = (text: string) => {
  const n = Number.parseFloat(text.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const cents = (n: number) => Math.round(n * 100);

type ChargeSheetProps = {
  table: RestaurantTable | null;
  onClose: () => void;
  onCharged: (table: RestaurantTable) => void;
};

/**
 * "Cobrar mesa": split the bill across payment methods; confirming takes a second tap.
 * When dishes are still in the kitchen it becomes "Forzar cobro", which needs a reason
 * and the waiter's password and is recorded for the admin's audit.
 * Mount it with a `key` per table so each opening starts clean.
 */
export function ChargeSheet({ table, onClose, onCharged }: ChargeSheetProps) {
  const { colors } = useBrandTheme();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<Row[]>(() => [
    { key: 0, method: 'efectivo', amount: table ? table.total.toFixed(2) : '' },
  ]);
  const [forced, setForced] = useState(table?.kitchenPending ?? false);
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [armed, setArmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!table) return null;

  const total = table.total;
  const paid = rows.reduce((sum, row) => sum + toAmount(row.amount), 0);
  const missing = cents(total) - cents(paid);
  const hasCash = rows.some((row) => row.method === 'efectivo' && toAmount(row.amount) > 0);
  const covered = missing <= 0;
  const forcedReady = !forced || (reason.trim().length >= 5 && password.length > 0);
  const canConfirm = covered && forcedReady && !submitting;

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
      await chargeTable(table.id, {
        payments: rows
          .filter((row) => toAmount(row.amount) > 0)
          .map((row) => ({ method: row.method, amount: toAmount(row.amount) })),
        forced: forced ? { reason, password } : undefined,
      });
      onCharged(table);
    } catch (err) {
      if (err instanceof ApiError && err.status === KITCHEN_PENDING_STATUS && !forced) {
        setForced(true);
        setError('La cocina aún tiene platillos de esta mesa. Si necesitas cobrar ya, usa el cobro forzado.');
      } else {
        setError(errorMessage(err));
      }
      setArmed(false);
    } finally {
      setSubmitting(false);
      setPassword('');
    }
  };

  const summary = covered
    ? missing === 0
      ? { text: 'Monto cubierto exactamente', color: Brand.greenLight }
      : { text: `${hasCash ? 'Cambio a entregar' : 'Pagado de más'}: ${formatMoney(-missing / 100)}`, color: Brand.greenLight }
    : { text: `Faltan por cubrir: ${formatMoney(missing / 100)}`, color: AMBER };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: forced ? `${Brand.red}66` : colors.border }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: forced ? Brand.red : colors.text }]} accessibilityRole="header">
              {forced ? 'Forzar cobro — ' : 'Cobrar '}
              <Text style={{ color: Brand.orange }}>Mesa {table.number}</Text>
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={8} onPress={onClose}>
              <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={20} tintColor={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            {forced && (
              <View style={[styles.forcedBox, { borderColor: `${Brand.red}66`, backgroundColor: `${Brand.red}12` }]}>
                <Text style={styles.forcedText}>
                  Esta mesa aún tiene platillos en preparación. Úsalo solo si la cocina no responde o hubo una
                  falla: quedará registrado con tu usuario para revisión del administrador.
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
              <Text style={[styles.section, { color: colors.textSecondary }]}>Distribución de pagos</Text>
              {rows.length < MAX_PAYMENTS && (
                <Pressable accessibilityRole="button" onPress={addRow} hitSlop={6}>
                  <Text style={styles.addPayment}>+ Agregar pago</Text>
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
                          active
                            ? { backgroundColor: `${Brand.green}26`, borderColor: Brand.green }
                            : { borderColor: colors.border },
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
                <Text style={[styles.totalValue, { color: colors.text }]}>{formatMoney(total)}</Text>
              </View>
              <View style={styles.totalLine}>
                <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total pagado</Text>
                <Text style={[styles.totalValue, { color: colors.text }]}>{formatMoney(paid)}</Text>
              </View>
              <View style={[styles.status, { borderColor: `${summary.color}55`, backgroundColor: `${summary.color}14` }]}>
                <Text style={[styles.statusText, { color: summary.color }]}>{summary.text}</Text>
              </View>
            </View>

            <View style={[styles.warning, { borderColor: `${AMBER}55`, backgroundColor: `${AMBER}12` }]}>
              <SymbolView name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }} size={16} tintColor={AMBER} />
              <Text style={styles.warningText}>Confirma solo si el cliente ya pagó el total. Esta acción no se puede deshacer.</Text>
            </View>
            {!!error && <FormMessage type="error">{error}</FormMessage>}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancel}>
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
                  backgroundColor: armed ? Brand.red : forced ? Brand.red : Brand.green,
                  opacity: canConfirm ? (pressed ? 0.85 : 1) : 0.4,
                },
              ]}>
              <Text style={styles.confirmText}>
                {submitting ? 'Cobrando…' : armed ? '¿Seguro? Toca de nuevo' : forced ? 'Forzar cobro' : 'Confirmar pago'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: Radius.lg + 4,
    borderTopRightRadius: Radius.lg + 4,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    flex: 1,
    fontFamily: BrandFonts.display,
    fontSize: 28,
    letterSpacing: 1,
  },
  body: {
    padding: 18,
    gap: 14,
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
    minHeight: 38,
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
    minHeight: 48,
  },
  currency: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 18,
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 20,
    paddingVertical: 8,
  },
  remove: {
    width: 48,
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
  warning: {
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 12,
  },
  warningText: {
    flex: 1,
    color: AMBER,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 12,
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
    minHeight: 54,
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
