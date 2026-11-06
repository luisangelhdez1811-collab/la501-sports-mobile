import { StyleSheet, Text, View } from 'react-native';

import type { Tracking } from '@/api/account';
import { formatMoney } from '@/domain/money';
import {
  TICKET_FEE_NOTE,
  ticketDate,
  ticketFolio,
  ticketProgress,
  ticketSteps,
  type TicketStep,
} from '@/domain/order-ticket';
import { Brand, BrandFonts } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

const PAYMENT: Record<'efectivo' | 'tarjeta', string> = { efectivo: 'Efectivo', tarjeta: 'Tarjeta' };

/**
 * The order ticket, laid out like the website's: title, three steps, the order's details,
 * each dish with its options and the total. Cancelled orders don't show the steps.
 */
export function OrderTicket({ tracking }: { tracking: Tracking }) {
  const { colors } = useBrandTheme();
  const showSteps = tracking.status !== 'cancelled' && tracking.status !== 'failed';
  const details: [string, string][] = [
    ['Folio de pedido:', tracking.folio ? ticketFolio(tracking.folio) : ''],
    ['Cliente:', tracking.customer.name],
    ['Teléfono:', tracking.customer.phone],
    ['Dirección:', tracking.customer.address],
    ['Fecha:', tracking.createdAt ? ticketDate(tracking.createdAt) : ''],
    ['Método de pago:', tracking.paymentMethod ? PAYMENT[tracking.paymentMethod] : ''],
  ];

  return (
    <View style={styles.ticket}>
      <View style={styles.header}>
        <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no">
          🍔
        </Text>
        <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
          Ticket de pedido
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>¡Gracias por elegir La 501 Sports Restaurant!</Text>
      </View>

      {showSteps && <Timeline tracking={tracking} />}

      <View style={[styles.section, { borderColor: colors.border }]}>
        {details
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
              <Text style={[styles.value, { color: colors.text }]} selectable>
                {value}
              </Text>
            </View>
          ))}
      </View>

      {tracking.lines.length > 0 && (
        <View style={[styles.section, { borderColor: colors.border }]}>
          {tracking.lines.map((line, index) => (
            <View key={`${line.name}-${index}`} style={styles.row}>
              <View style={styles.lineText}>
                <Text style={[styles.lineName, { color: colors.text }]}>
                  <Text style={{ color: colors.accent }}>{line.quantity}x </Text>
                  {line.name}
                </Text>
                {!!line.options && <Text style={[styles.extra, { color: colors.textSecondary }]}>{line.options}</Text>}
                {line.excluded.length > 0 && (
                  <Text style={[styles.extra, { color: colors.textSecondary }]}>Sin: {line.excluded.join(', ')}</Text>
                )}
                {!!line.notes && <Text style={[styles.extra, { color: colors.textSecondary }]}>📝 {line.notes}</Text>}
              </View>
              <Text style={[styles.value, { color: colors.text }]}>{formatMoney(line.subtotal)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={[styles.totalRow, { borderColor: colors.border }]}>
        <Text style={[styles.totalLabel, { color: colors.text }]}>Total del pedido</Text>
        <Text style={[styles.total, { color: colors.accent }]}>{formatMoney(tracking.total)}</Text>
      </View>
      <Text style={[styles.note, { color: colors.textSecondary }]}>{TICKET_FEE_NOTE}</Text>
    </View>
  );
}

function Timeline({ tracking }: { tracking: Tracking }) {
  const { colors } = useBrandTheme();
  const steps = ticketSteps(tracking.status, tracking.isDelivery);
  const progress = ticketProgress(tracking.status, tracking.isDelivery);
  const summary = steps.map((s) => `${s.label}: ${s.state === 'done' ? 'listo' : s.state === 'active' ? 'en curso' : 'pendiente'}`);

  return (
    <View style={styles.timeline} accessible accessibilityLabel={`Estado del pedido. ${summary.join('. ')}.`}>
      {/* The line runs from the middle of the first dot to the middle of the last one. */}
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
      </View>
      {steps.map((step, index) => (
        <StepDot key={step.label} step={step} number={index + 1} />
      ))}
    </View>
  );
}

function StepDot({ step, number }: { step: TicketStep; number: number }) {
  const { colors } = useBrandTheme();
  const dot =
    step.state === 'done'
      ? { backgroundColor: Brand.green, borderColor: Brand.green }
      : step.state === 'active'
        ? { backgroundColor: colors.surface, borderColor: Brand.orange }
        : { backgroundColor: colors.surface, borderColor: colors.border };
  const labelColor = step.state === 'done' ? colors.success : step.state === 'active' ? colors.text : colors.textSecondary;

  return (
    <View style={styles.step}>
      <View style={[styles.dot, dot]}>
        <Text style={[styles.dotText, { color: step.state === 'done' ? Brand.white : labelColor }]}>
          {step.state === 'done' ? '✓' : number}
        </Text>
      </View>
      <Text style={[styles.stepLabel, { color: labelColor }]}>{step.label}</Text>
    </View>
  );
}

const DOT = 36;

const styles = StyleSheet.create({
  ticket: {
    gap: 16,
  },
  header: {
    alignItems: 'center',
    gap: 4,
  },
  emoji: {
    fontSize: 32,
  },
  title: {
    fontFamily: BrandFonts.display,
    fontSize: 30,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontFamily: BrandFonts.body,
    fontSize: 14,
    textAlign: 'center',
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  track: {
    position: 'absolute',
    top: 4 + DOT / 2 - 2,
    left: '16.66%',
    right: '16.66%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Brand.orange,
  },
  step: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
  },
  stepLabel: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 12,
    letterSpacing: 1,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  section: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    paddingTop: 12,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    fontFamily: BrandFonts.body,
    fontSize: 14,
  },
  value: {
    flexShrink: 1,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
    textAlign: 'right',
  },
  lineText: {
    flex: 1,
    gap: 2,
  },
  lineName: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
  },
  extra: {
    fontFamily: BrandFonts.body,
    fontSize: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 14,
  },
  totalLabel: {
    fontFamily: BrandFonts.display,
    fontSize: 22,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  total: {
    fontFamily: BrandFonts.display,
    fontSize: 28,
  },
  note: {
    fontFamily: BrandFonts.body,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
