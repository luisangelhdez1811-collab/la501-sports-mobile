import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getWaiterPerformance, type WaiterPeriod } from '@/api/admin';
import { formatMoney } from '@/components/account/orders-list';
import { AdminColors, Panel, PanelState, Segmented, StatCard, StatGrid, Tag } from '@/components/admin/admin-ui';
import { AdminScreen } from '@/components/admin/admin-screen';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useAdminResource } from '@/hooks/use-admin-resource';
import { useBrandTheme } from '@/hooks/use-brand-theme';

const PERIODS = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mes' },
  { value: 'todo', label: 'Todo' },
] as const;

const MEDALS = ['#FACC15', '#A1A1AA', '#D97706'];
const time = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function WaiterPerformanceScreen() {
  const { colors } = useBrandTheme();
  const [period, setPeriod] = useState<WaiterPeriod>('hoy');
  const perf = useAdminResource(`waiters-${period}`, (signal) => getWaiterPerformance(period, signal));
  const data = perf.data;
  const empty = !!data && data.ranking.length === 0;

  return (
    <AdminScreen
      title="Desempeño de meseros"
      subtitle="Ventas por mesero, quién atendió y cobró cada mesa, y auditoría de cobros forzados."
      refreshing={perf.refreshing}
      onRefresh={perf.refresh}>
      <Segmented options={PERIODS} value={period} onChange={setPeriod} color={Brand.blue} />

      <StatGrid>
        <StatCard
          accent
          label="Total vendido"
          value={data ? formatMoney(data.totalSold) : '—'}
          icon={{ ios: 'dollarsign.circle', android: 'paid', web: 'paid' }}
          color={Brand.greenLight}
        />
        <StatCard
          accent
          label="Mesas cobradas"
          value={data ? String(data.tablesCharged) : '—'}
          icon={{ ios: 'checkmark.rectangle', android: 'table_restaurant', web: 'table_restaurant' }}
          color={Brand.orange}
        />
        <StatCard
          accent
          label="Meseros con ventas"
          value={data ? String(data.waitersWithSales) : '—'}
          icon={{ ios: 'person.2', android: 'groups', web: 'groups' }}
          color={Brand.blue}
        />
        <StatCard
          accent
          label="Cobros forzados"
          value={data ? String(data.forcedCharges) : '—'}
          icon={{ ios: 'exclamationmark.shield', android: 'gpp_maybe', web: 'gpp_maybe' }}
          color={Brand.red}
        />
      </StatGrid>

      <Panel icon={{ ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' }} title="Ranking por mesero" color={AdminColors.yellow}>
        <PanelState
          loading={perf.loading}
          error={perf.error}
          unavailable={perf.unavailable}
          endpoint="GET /app/admin/waiters/performance"
          empty={empty}
          emptyText="No hay cobros registrados en este periodo."
          onRetry={perf.reload}
        />
        {data?.ranking.map((row, i) => (
          <View key={`${row.waiter}-${i}`} style={[styles.rankRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
            <View style={[styles.position, { backgroundColor: `${MEDALS[i] ?? colors.textSecondary}26` }]}>
              <Text style={[styles.positionText, { color: MEDALS[i] ?? colors.textSecondary }]}>{i + 1}</Text>
            </View>
            <View style={styles.rankText}>
              <Text style={[styles.rankName, { color: colors.text }]} numberOfLines={1}>
                {row.waiter}
              </Text>
              <Text style={[styles.rankMeta, { color: colors.textSecondary }]}>
                {row.tables} {row.tables === 1 ? 'mesa' : 'mesas'}
              </Text>
            </View>
            <Text style={[styles.rankTotal, { color: colors.text }]}>{formatMoney(row.total)}</Text>
          </View>
        ))}
      </Panel>

      {!!data && data.tables.length > 0 && (
        <Panel icon={{ ios: 'list.bullet.rectangle', android: 'receipt_long', web: 'receipt_long' }} title="Detalle de mesas cobradas" count={data.tables.length}>
          {data.tables.map((row, i) => (
            <View key={`${row.table}-${i}`} style={[styles.tableCard, { borderColor: row.forced ? `${Brand.red}66` : colors.border, backgroundColor: colors.background }]}>
              <View style={styles.tableTop}>
                <Text style={[styles.tableName, { color: colors.text }]}>Mesa {row.table}</Text>
                <Text style={[styles.tableTotal, { color: colors.text }]}>{formatMoney(row.total)}</Text>
              </View>
              <Text style={[styles.tableMeta, { color: colors.textSecondary }]}>
                Atendió: <Text style={{ color: colors.text }}>{row.waiter || '—'}</Text> · Cobró:{' '}
                <Text style={{ color: colors.text }}>{row.chargedBy || '—'}</Text>
              </Text>
              <View style={styles.tableBottom}>
                {!!row.closedAt && <Text style={[styles.tableMeta, { color: colors.textSecondary }]}>{time.format(row.closedAt)}</Text>}
                {row.forced && <Tag label="Cobro forzado" color={Brand.red} />}
              </View>
            </View>
          ))}
        </Panel>
      )}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  position: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
  },
  rankText: {
    flex: 1,
  },
  rankName: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
  },
  rankMeta: {
    fontFamily: BrandFonts.body,
    fontSize: 13,
  },
  rankTotal: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
  },
  tableCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 12,
    gap: 6,
  },
  tableTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tableName: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
  },
  tableTotal: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
  },
  tableMeta: {
    fontFamily: BrandFonts.body,
    fontSize: 13,
  },
  tableBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
