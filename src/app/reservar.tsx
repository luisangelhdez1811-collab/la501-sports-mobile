import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { getRestaurantInfo } from '@/api/info';
import { createReservation, type ReservationZone } from '@/api/reservations';
import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { FormCard } from '@/components/brand/form-card';
import { FormMessage } from '@/components/brand/form-message';
import { OfflineBanner } from '@/components/brand/offline-banner';
import { PageHero } from '@/components/brand/page-hero';
import { SelectField } from '@/components/brand/select-field';
import { TextField } from '@/components/brand/text-field';
import { DateField, startOfDay, TimeField } from '@/components/reservation/pickers';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useAuth } from '@/hooks/use-auth';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useCachedResource } from '@/hooks/use-cached-resource';
import { useIsOffline } from '@/hooks/use-connectivity';
import {
  DEFAULT_HOURS,
  formatTime12,
  bookingWindow,
  isBookable,
  WEEKDAYS,
} from '@/utils/opening-hours';
import { isEmail, isPhone, normalizePhone } from '@/utils/validation';

const DAYS_AHEAD = 60;
// Same options as the website: 1–10 people, 11 = "Más de 10 personas…" (goes to WhatsApp).
const GROUP = 11;
const PEOPLE_OPTIONS = [
  ...Array.from({ length: 10 }, (_, i) => `${i + 1} ${i === 0 ? 'Persona' : 'Personas'}`),
  'Más de 10 personas…',
];
// Number used by the website's group button, until /public/info sends one.
const FALLBACK_WHATSAPP = '527711097827';
const GROUP_MESSAGE = 'Hola La 501, me gustaría reservar para un grupo de más de 10 personas.';

const ZONES: { value: ReservationZone; label: string; icon: SymbolViewProps['name'] }[] = [
  { value: 'General', label: 'Área general', icon: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' } },
  { value: 'Terraza', label: 'Terraza', icon: { ios: 'leaf.fill', android: 'park', web: 'park' } },
];

// Schedule card rows, Monday first.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

type Errors = Partial<Record<'name' | 'phone' | 'email' | 'date' | 'time', string>>;

function toIsoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export default function ReserveScreen() {
  const { colors } = useBrandTheme();
  const { user } = useAuth();
  const offline = useIsOffline();
  // Saved on the device so the schedule (and blocked hours) also work offline.
  const { data: info } = useCachedResource('restaurant-info', getRestaurantInfo, { persist: true });
  const hours = info?.hours ?? DEFAULT_HOURS;

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [zone, setZone] = useState<ReservationZone>('General');
  const [people, setPeople] = useState(2);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const today = startOfDay(new Date());
  const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + DAYS_AHEAD);
  const range = date ? bookingWindow(date, hours) : null;
  const dayHours = date ? hours[date.getDay()] : null;
  const isGroup = people >= GROUP;

  const validate = (): Errors => {
    const next: Errors = {};
    if (name.trim().length < 3) next.name = 'Escribe tu nombre completo.';
    if (!isPhone(phone)) next.phone = 'El teléfono debe tener 10 dígitos.';
    if (!isEmail(email)) next.email = 'Correo electrónico no válido.';
    if (!date) next.date = 'Elige la fecha.';
    // Re-checked here: the chosen time may have passed while the form was open.
    if (!time || !isBookable(time, range)) next.time = 'Elige una hora dentro del horario de servicio.';
    return next;
  };

  const submit = async () => {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) {
      return setMessage({ type: 'error', text: Object.values(next)[0] ?? 'Revisa los campos marcados.' });
    }

    setSubmitting(true);
    setMessage(null);
    try {
      await createReservation({ name, phone, email, date: toIsoDate(date!), time: time!, people, zone });
      setMessage({ type: 'success', text: 'Solicitud enviada. Espera nuestra confirmación.' });
      setDate(null);
      setTime(null);
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const openWhatsApp = () => {
    const number = info?.whatsapp ?? FALLBACK_WHATSAPP;
    // wa.me opens the WhatsApp app when installed (or the web version) with the message ready.
    Linking.openURL(`https://wa.me/${number}?text=${encodeURIComponent(GROUP_MESSAGE)}`).catch(() =>
      setMessage({ type: 'error', text: 'No se pudo abrir WhatsApp.' }),
    );
  };

  return (
    <BrandScreen showBack contentStyle={styles.content}>
      <PageHero
        align="center"
        tag="La 501 Sports Restaurant"
        lead="Reser"
        accent="vaciones"
        accentColor="green"
        description="Aparta tu mesa y disfruta de la mejor experiencia. Sujeto a confirmación del personal."
      />

      <View style={styles.body}>
        <OfflineBanner />

        <FormCard>
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: `${Brand.green}1F`, borderColor: `${Brand.green}55` }]}>
              <SymbolView name={{ ios: 'calendar', android: 'event', web: 'event' }} size={18} tintColor={Brand.greenLight} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, { color: colors.text }]} accessibilityRole="header">
                Solicitar mesa
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Completa el formulario y te confirmaremos la disponibilidad.
              </Text>
            </View>
          </View>

          <TextField
            label="Nombre completo"
            required
            placeholder="Juan Pérez"
            value={name}
            onChangeText={setName}
            autoComplete="name"
            error={errors.name}
          />
          <TextField
            label="Teléfono"
            required
            placeholder="771 000 0000"
            value={phone}
            onChangeText={(v) => setPhone(normalizePhone(v))}
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={10}
            error={errors.phone}
          />
          <TextField
            label="Correo electrónico"
            required
            placeholder="ejemplo@correo.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
          />

          <View style={styles.row}>
            <DateField
              value={date}
              onChange={(next) => {
                setDate(next);
                // Keep the time only if it's still bookable on the new day.
                if (time && !isBookable(time, bookingWindow(next, hours))) setTime(null);
                setErrors((e) => ({ ...e, date: undefined }));
              }}
              minDate={today}
              maxDate={maxDate}
              isDisabled={(day) => !bookingWindow(day, hours)}
              error={!!errors.date}
            />
            <TimeField
              value={time}
              onChange={(next) => {
                setTime(next);
                setErrors((e) => ({ ...e, time: undefined }));
              }}
              range={range}
              needsDate={!date}
              hoursLabel={
                dayHours ? `Horario de servicio: ${formatTime12(dayHours.open)} – ${formatTime12(dayHours.close)}` : null
              }
              error={!!errors.time}
            />
          </View>

          <View style={styles.group}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Zona<Text style={{ color: Brand.orange }}> *</Text>
            </Text>
            <View style={styles.zones} accessibilityRole="radiogroup">
              {ZONES.map((option) => {
                const active = option.value === zone;
                const tint = active ? Brand.greenLight : colors.textSecondary;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    onPress={() => setZone(option.value)}
                    style={[
                      styles.zone,
                      active
                        ? { borderColor: Brand.green, backgroundColor: `${Brand.green}14` }
                        : { borderColor: colors.border, backgroundColor: colors.background },
                    ]}>
                    <SymbolView name={option.icon} size={24} tintColor={tint} />
                    <Text style={[styles.zoneLabel, { color: tint }]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <SelectField
            label="Cantidad de personas"
            required
            placeholder="Elige"
            options={PEOPLE_OPTIONS}
            value={PEOPLE_OPTIONS[people - 1]}
            onChange={(option) => setPeople(PEOPLE_OPTIONS.indexOf(option) + 1)}
          />

          {!!message && <FormMessage type={message.type}>{message.text}</FormMessage>}

          {isGroup ? (
            <>
              <Text style={styles.groupNote}>
                Para grupos grandes te redirigiremos a WhatsApp para coordinar mejor.
              </Text>
              <BrandButton
                title="Contactar por WhatsApp"
                variant="action"
                icon={{ ios: 'message.fill', android: 'chat', web: 'chat' }}
                onPress={openWhatsApp}
              />
            </>
          ) : (
            <BrandButton
              title={offline ? 'Sin conexión' : 'Solicitar reservación'}
              variant="action"
              icon={{ ios: 'calendar.badge.plus', android: 'event_available', web: 'event_available' }}
              onPress={submit}
              loading={submitting}
              disabled={offline}
            />
          )}
        </FormCard>

        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.infoTitle}>Horarios</Text>
          {WEEK_ORDER.map((day) => {
            const h = hours[day];
            const isToday = day === today.getDay();
            return (
              <View key={day} style={[styles.scheduleRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.scheduleDay, { color: isToday ? Brand.orange : colors.textSecondary }]}>
                  {WEEKDAYS[day]}
                  {isToday ? ' · hoy' : ''}
                </Text>
                <Text style={[styles.scheduleHours, { color: h ? colors.text : Brand.red }]}>
                  {h ? `${formatTime12(h.open)} – ${formatTime12(h.close)}` : 'Cerrado'}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={[styles.notice, { borderColor: `${Brand.orange}55`, backgroundColor: `${Brand.orange}10` }]}>
          <SymbolView
            name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }}
            size={18}
            tintColor={Brand.orange}
          />
          <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
            <Text style={styles.noticeStrong}>Importante: </Text>
            Las reservaciones están sujetas a disponibilidad y confirmación por parte de nuestro personal. Te
            contactaremos para confirmar tu mesa.
          </Text>
        </View>
      </View>
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 0,
    paddingTop: 0,
  },
  body: {
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 20,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontFamily: BrandFonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  group: {
    gap: 8,
  },
  label: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  zones: {
    flexDirection: 'row',
    gap: 12,
  },
  zone: {
    flex: 1,
    minHeight: 84,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: Radius.md,
  },
  zoneLabel: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
  },
  groupNote: {
    color: Brand.orange,
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  infoTitle: {
    color: Brand.orange,
    fontFamily: BrandFonts.labelBold,
    fontSize: 15,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  scheduleDay: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 14,
    textTransform: 'capitalize',
  },
  scheduleHours: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
  },
  notice: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderLeftColor: Brand.orange,
    borderRadius: Radius.md,
    padding: 14,
  },
  noticeText: {
    flex: 1,
    fontFamily: BrandFonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  noticeStrong: {
    color: Brand.orange,
    fontFamily: BrandFonts.bodyBold,
  },
});
