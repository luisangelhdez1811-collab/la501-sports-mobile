import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatMoney } from '@/components/account/orders-list';
import { Panel, PanelState, Segmented, StatCard, StatGrid } from '@/components/admin/admin-ui';
import { BarChart } from '@/components/admin/bar-chart';
import { AdminScreen } from '@/components/admin/admin-screen';
import { getDailyCut, getEarnings, getRotation, getSalesSummary, type SalesPeriod } from '@/api/admin';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useAdminResource } from '@/hooks/use-admin-resource';
import { useBrandTheme } from '@/hooks/use-brand-theme';

type Report = 'ganancias' | 'rotacion' | 'corte';

const REPORTS = [
  { value: 'ganancias', label: 'Ganancias' },
  { value: 'rotacion', label: 'Rotación' },
  { value: 'corte', label: 'Corte diario' },
] as const;

const PERIODS = [
  { value: '30d', label: '30 días' },
  { value: 'months', label: 'Meses' },
] as const;

/** Admin home: sales totals and the sales report (earnings, best sellers, daily cut). */
export default function SalesPanelScreen() {
  const [report, setReport] = useState<Report>('ganancias');
  const [period, setPeriod] = useState<SalesPeriod>('months');
  const summary = useAdminResource('sales-summary', getSalesSummary);

  return (
    <AdminScreen
      title="Panel de ventas"
      subtitle="Gestión de La 501 en tiempo real"
      refreshing={summary.refreshing}
      onRefresh={summary.refresh}>

      <StatGrid>
        <StatCard
          accent
          label="Ventas totales"
          value={summary.data ? formatMoney(summary.data.totalSales) : '—'}
          icon={{ ios: 'dollarsign.circle', android: 'paid', web: 'paid' }}
          color={Brand.greenLight}
        />
        <StatCard
          accent
          label="Pedidos hoy"
          value={summary.data ? String(summary.data.ordersToday) : '—'}
          icon={{ ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' }}
          color={Brand.orange}
        />
      </StatGrid>
      {!summary.data && (
        <PanelState
          loading={summary.loading}
          error={summary.error}
          unavailable={summary.unavailable}
          endpoint="GET /app/admin/sales/summary"
          empty={false}
          emptyText=""
          onRetry={summary.reload}
        />
      )}

      <Panel icon={{ ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' }} title="Reporte de ventas">
        <Segmented options={REPORTS} value={report} onChange={setReport} color={Brand.blue} />
        {report !== 'corte' && <Segmented options={PERIODS} value={period} onChange={setPeriod} color={Brand.blue} />}
        {report === 'ganancias' && <EarningsReport period={period} />}
        {report === 'rotacion' && <RotationReport period={period} />}
        {report === 'corte' && <DailyCutReport />}
      </Panel>
    </AdminScreen>
  );
}

function EarningsReport({ period }: { period: SalesPeriod }) {
  const earnings = useAdminResource(`earnings-${period}`, (signal) => getEarnings(period, signal));
  const points = earnings.data ?? [];
  return (
    <>
      <PanelState
        loading={earnings.loading}
        error={earnings.error}
        unavailable={earnings.unavailable}
        endpoint="GET /app/admin/sales/report?type=ganancias"
        empty={!!earnings.data && points.length === 0}
        emptyText="Aún no hay ventas en este periodo."
        onRetry={earnings.reload}
      />
      {points.length > 0 && <BarChart key={period} points={points} />}
    </>
  );
}

function RotationReport({ period }: { period: SalesPeriod }) {
  const { colors } = useBrandTheme();
  const rotation = useAdminResource(`rotation-${period}`, (signal) => getRotation(period, signal));
  const items = rotation.data ?? [];
  const max = Math.max(...items.map((item) => item.quantity), 1);
  return (
    <>
      <PanelState
        loading={rotation.loading}
        error={rotation.error}
        unavailable={rotation.unavailable}
        endpoint="GET /app/admin/sales/report?type=rotacion"
        empty={!!rotation.data && items.length === 0}
        emptyText="Aún no hay productos vendidos en este periodo."
        onRetry={rotation.reload}
      />
      {items.map((item, i) => (
        <View key={`${item.name}-${i}`} style={styles.rotationRow}>
          <View style={styles.rotationText}>
            <Text style={[styles.rotationName, { color: colors.text }]} numberOfLines={1}>
              {i + 1}. {item.name}
            </Text>
            <Text style={[styles.rotationMeta, { color: colors.textSecondary }]}>
              {item.quantity} vendidos · {formatMoney(item.total)}
            </Text>
          </View>
          <View style={[styles.rotationTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.rotationBar, { width: `${(item.quantity / max) * 100}%` }]} />
          </View>
        </View>
      ))}
    </>
  );
}

function DailyCutReport() {
  const { colors } = useBrandTheme();
  const cut = useAdminResource('daily-cut', getDailyCut);
  const rows = cut.data
    ? [
        { label: 'Pedidos', value: String(cut.data.orders) },
        { label: 'Efectivo', value: formatMoney(cut.data.cash) },
        { label: 'Tarjeta', value: formatMoney(cut.data.card) },
      ]
    : [];
  return (
    <>
      <PanelState
        loading={cut.loading}
        error={cut.error}
        unavailable={cut.unavailable}
        endpoint="GET /app/admin/sales/report?type=corte"
        empty={false}
        emptyText=""
        onRetry={cut.reload}
      />
      {cut.data && (
        <View style={[styles.cut, { backgroundColor: colors.background }]}>
          <Text style={[styles.cutLabel, { color: colors.textSecondary }]}>Total del día {cut.data.date}</Text>
          <Text style={[styles.cutTotal, { color: colors.text }]}>{formatMoney(cut.data.total)}</Text>
          {rows.map((row) => (
            <View key={row.label} style={[styles.cutRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.cutRowLabel, { color: colors.textSecondary }]}>{row.label}</Text>
              <Text style={[styles.cutRowValue, { color: colors.text }]}>{row.value}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  rotationRow: {
    gap: 6,
  },
  rotationText: {
    gap: 1,
  },
  rotationName: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
  },
  rotationMeta: {
    fontFamily: BrandFonts.body,
    fontSize: 13,
  },
  rotationTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  rotationBar: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Brand.blue,
  },
  cut: {
    borderRadius: Radius.md,
    padding: 16,
    gap: 4,
  },
  cutLabel: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cutTotal: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 32,
    marginBottom: 6,
  },
  cutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cutRowLabel: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 15,
  },
  cutRowValue: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
  },
});
