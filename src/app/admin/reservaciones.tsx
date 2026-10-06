import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  getReservations,
  updateReservationStatus,
  type AdminReservation,
  type ReservationStatus,
} from '@/api/admin';
import { errorMessage } from '@/api/client';
import { AdminColors, Panel, PanelState, Segmented, StatCard, StatGrid, Tag } from '@/components/admin/admin-ui';
import { AdminScreen } from '@/components/admin/admin-screen';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useAdminResource } from '@/hooks/use-admin-resource';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { formatSlot } from '@/utils/opening-hours';

const STATUS = {
  pendiente: { label: 'Pendientes', one: 'Pendiente', color: Brand.orange, icon: { ios: 'clock', android: 'schedule', web: 'schedule' } },
  confirmada: { label: 'Confirmadas', one: 'Confirmada', color: Brand.greenLight, icon: { ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' } },
  cancelada: { label: 'Canceladas', one: 'Cancelada', color: Brand.red, icon: { ios: 'xmark.circle', android: 'cancel', web: 'cancel' } },
  finalizada: { label: 'Finalizadas', one: 'Finalizada', color: AdminColors.purple, icon: { ios: 'checkmark', android: 'done_all', web: 'done_all' } },
} as const;

const ORDER: ReservationStatus[] = ['pendiente', 'confirmada', 'cancelada', 'finalizada'];

// What the staff can do with a reservation in each state.
const ACTIONS: Record<ReservationStatus, { to: ReservationStatus; label: string; color: string }[]> = {
  pendiente: [
    { to: 'confirmada', label: 'Confirmar', color: Brand.green },
    { to: 'cancelada', label: 'Cancelar', color: Brand.red },
  ],
  confirmada: [
    { to: 'finalizada', label: 'Finalizar', color: AdminColors.purple },
    { to: 'cancelada', label: 'Cancelar', color: Brand.red },
  ],
  cancelada: [],
  finalizada: [],
};

const longDate = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return Number.isNaN(date.getTime()) ? iso : longDate.format(date);
}

export default function AdminReservationsScreen() {
  const [status, setStatus] = useState<ReservationStatus>('pendiente');
  const list = useAdminResource(`reservations-${status}`, (signal) => getReservations(status, signal));
  const counts = list.data?.counts;
  const items = list.data?.items ?? [];

  return (
    <AdminScreen
      title="Gestión de reservaciones"
      subtitle="Administra y confirma las solicitudes de mesa de tus clientes."
      refreshing={list.refreshing}
      onRefresh={list.refresh}>

      <StatGrid>
        {ORDER.map((key) => (
          <StatCard
            key={key}
            label={STATUS[key].label}
            value={counts ? String(counts[key]) : '—'}
            icon={STATUS[key].icon}
            color={STATUS[key].color}
            selected={key === status}
            onPress={() => setStatus(key)}
          />
        ))}
      </StatGrid>

      <Segmented
        options={ORDER.map((key) => ({ value: key, label: STATUS[key].label, count: counts?.[key] }))}
        value={status}
        onChange={setStatus}
        color={STATUS[status].color}
      />

      <Panel
        icon={{ ios: 'calendar', android: 'event', web: 'event' }}
        title={`Reservas ${STATUS[status].label.toLowerCase()}`}
        color={STATUS[status].color}
        count={list.data ? items.length : undefined}>
        <PanelState
          loading={list.loading}
          error={list.error}
          unavailable={list.unavailable}
          endpoint="GET /app/admin/reservations"
          empty={!!list.data && items.length === 0}
          emptyText={`No hay reservas ${STATUS[status].label.toLowerCase()}.`}
          onRetry={list.reload}
        />
        {items.map((reservation) => (
          <ReservationCard key={reservation.id} reservation={reservation} onChanged={list.reload} />
        ))}
      </Panel>
    </AdminScreen>
  );
}

function ReservationCard({ reservation, onChanged }: { reservation: AdminReservation; onChanged: () => void }) {
  const { colors } = useBrandTheme();
  const [busy, setBusy] = useState<ReservationStatus | null>(null);
  const status = STATUS[reservation.status];

  const change = (to: ReservationStatus, label: string) => {
    Alert.alert(`${label} reservación`, `${reservation.name} · ${formatDate(reservation.date)}`, [
      { text: 'Volver', style: 'cancel' },
      {
        text: label,
        style: to === 'cancelada' ? 'destructive' : 'default',
        onPress: async () => {
          setBusy(to);
          try {
            await updateReservationStatus(reservation.id, to);
            onChanged();
          } catch (err) {
            Alert.alert('No se pudo actualizar', errorMessage(err));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardWho}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {reservation.name}
          </Text>
          <Text style={[styles.email, { color: colors.textSecondary }]} numberOfLines={1}>
            {reservation.email}
          </Text>
        </View>
        <Tag label={status.one} color={status.color} />
      </View>

      <View style={styles.details}>
        <Detail icon={{ ios: 'calendar', android: 'event', web: 'event' }} text={formatDate(reservation.date)} />
        <Detail
          icon={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
          text={reservation.time ? formatSlot(reservation.time) : '—'}
        />
        <Detail
          icon={{ ios: 'person.2', android: 'group', web: 'group' }}
          text={reservation.people > 10 ? 'Más de 10' : `${reservation.people} ${reservation.people === 1 ? 'persona' : 'personas'}`}
        />
        <Detail icon={{ ios: 'mappin', android: 'location_on', web: 'location_on' }} text={reservation.zone || '—'} />
      </View>

      {!!reservation.phone && (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Llamar a ${reservation.name}`}
          onPress={() => Linking.openURL(`tel:${reservation.phone.replace(/[^\d+]/g, '')}`)}
          style={styles.phone}>
          <SymbolView name={{ ios: 'phone.fill', android: 'call', web: 'call' }} size={14} tintColor={Brand.blue} />
          <Text style={styles.phoneText}>{reservation.phone}</Text>
        </Pressable>
      )}

      {ACTIONS[reservation.status].length > 0 && (
        <View style={styles.actions}>
          {ACTIONS[reservation.status].map((action) => (
            <Pressable
              key={action.to}
              accessibilityRole="button"
              disabled={busy !== null}
              onPress={() => change(action.to, action.label)}
              style={({ pressed }) => [
                styles.action,
                { borderColor: `${action.color}66`, backgroundColor: pressed ? `${action.color}33` : `${action.color}14` },
                busy !== null && busy !== action.to && styles.dim,
              ]}>
              <Text style={[styles.actionText, { color: action.color }]}>
                {busy === action.to ? 'Guardando…' : action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function Detail({ icon, text }: { icon: React.ComponentProps<typeof SymbolView>['name']; text: string }) {
  const { colors } = useBrandTheme();
  return (
    <View style={styles.detail}>
      <SymbolView name={icon} size={14} tintColor={colors.textSecondary} />
      <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 14,
    gap: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardWho: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 16,
  },
  email: {
    fontFamily: BrandFonts.body,
    fontSize: 13,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
  },
  detail: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 8,
  },
  detailText: {
    flexShrink: 1,
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 14,
  },
  phone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  phoneText: {
    color: Brand.blue,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  action: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
  },
  dim: {
    opacity: 0.4,
  },
});
