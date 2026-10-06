import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import {
  formatHour12,
  formatSlot,
  formatTime,
  formatTime12,
  isBookable,
  MINUTE_STEP,
  parseSlot,
  type BookingWindow,
} from '@/utils/opening-hours';

const WEEK_HEADER = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const monthTitle = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });

export const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Field that looks like the text inputs and opens a bottom sheet. */
function PickerField({
  label,
  value,
  placeholder,
  icon,
  title,
  open,
  onOpen,
  onClose,
  error,
  children,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  icon: SymbolViewProps['name'];
  title: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  error?: boolean;
  children: ReactNode;
}) {
  const { colors, scheme } = useBrandTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
        <Text style={{ color: Brand.orange }}> *</Text>
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ?? 'sin elegir'}`}
        onPress={onOpen}
        style={[
          styles.field,
          {
            borderColor: error ? Brand.red : colors.border,
            backgroundColor: scheme === 'dark' ? '#121110' : colors.surface,
          },
        ]}>
        <Text style={[styles.value, { color: value ? colors.text : colors.textSecondary }]} numberOfLines={1}>
          {value ?? placeholder}
        </Text>
        <SymbolView name={icon} size={18} tintColor={colors.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar">
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 16 }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text>
            {children}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

type DateFieldProps = {
  value: Date | null;
  onChange: (date: Date) => void;
  minDate: Date;
  maxDate: Date;
  /** Days that can't be picked (closed, or no time left today). */
  isDisabled: (date: Date) => boolean;
  error?: boolean;
};

const shortDate = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });

/** "Fecha" field with a month calendar; past and closed days are blocked. */
export function DateField({ value, onChange, minDate, maxDate, isDisabled, error }: DateFieldProps) {
  const { colors } = useBrandTheme();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const base = value ?? minDate;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7; // Monday-first grid
  const cells: (Date | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
  while (cells.length % 7) cells.push(null);

  const canPrev = first > new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const canNext = new Date(month.getFullYear(), month.getMonth() + 1, 1) <= maxDate;
  const today = startOfDay(new Date());

  return (
    <PickerField
      label="Fecha"
      value={value ? shortDate.format(value) : null}
      placeholder="dd/mm/aaaa"
      icon={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
      title="Elige la fecha"
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      error={error}>
      <View style={styles.monthBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
          disabled={!canPrev}
          onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          style={[styles.monthButton, { borderColor: colors.border }, !canPrev && styles.dim]}>
          <SymbolView name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }} size={18} tintColor={colors.text} />
        </Pressable>
        <Text style={[styles.monthTitle, { color: colors.text }]}>{monthTitle.format(month)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
          disabled={!canNext}
          onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          style={[styles.monthButton, { borderColor: colors.border }, !canNext && styles.dim]}>
          <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={18} tintColor={colors.text} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {WEEK_HEADER.map((day, i) => (
          <Text key={i} style={[styles.weekDay, { color: colors.textSecondary }]}>
            {day}
          </Text>
        ))}
        {cells.map((date, i) => {
          if (!date) return <View key={`empty-${i}`} style={styles.cell} />;
          const blocked = date < minDate || date > maxDate || isDisabled(date);
          const selected = !!value && sameDay(date, value);
          const isToday = sameDay(date, today);
          return (
            <View key={date.toISOString()} style={styles.cell}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: blocked }}
                accessibilityLabel={shortDate.format(date)}
                disabled={blocked}
                onPress={() => {
                  onChange(date);
                  setOpen(false);
                }}
                style={[
                  styles.day,
                  selected && { backgroundColor: Brand.orange },
                  !selected && isToday && { borderWidth: 1.5, borderColor: Brand.orange },
                ]}>
                <Text
                  style={[
                    styles.dayText,
                    { color: selected ? Brand.white : colors.text },
                    blocked && [styles.blockedText, { color: colors.textSecondary }],
                  ]}>
                  {date.getDate()}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Los días en gris ya pasaron o no hay servicio.
      </Text>
    </PickerField>
  );
}

type TimeFieldProps = {
  value: string | null;
  onChange: (time: string) => void;
  /** Bookable range for the chosen day; null when there's none. */
  range: BookingWindow | null;
  /** Shown above the columns, e.g. "Horario de servicio: 1:00 PM – 10:30 PM". */
  hoursLabel: string | null;
  /** No date chosen yet: the sheet asks for one first. */
  needsDate: boolean;
  error?: boolean;
};

/**
 * "Hora" field: any hour and minute within service hours, like the website. Whether a
 * table is free at that time isn't known here; the staff confirms each reservation.
 */
export function TimeField({ value, onChange, range, hoursLabel, needsDate, error }: TimeFieldProps) {
  const { colors } = useBrandTheme();
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState<number | null>(null);
  const [minute, setMinute] = useState<number | null>(null);

  const firstHour = range ? Math.floor(range.from / 60) : 0;
  const hours = range
    ? Array.from({ length: Math.floor(range.to / 60) - firstHour + 1 }, (_, i) => firstHour + i)
    : [];
  const minutesFor = (h: number) =>
    range
      ? Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP).filter((m) => {
          const t = h * 60 + m;
          return t >= range.from && t <= range.to;
        })
      : [];
  const minutes = hour === null ? [] : minutesFor(hour);
  const pending = hour !== null && minute !== null ? hour * 60 + minute : null;

  const pickHour = (h: number) => {
    setHour(h);
    // Keep the minute if it still fits this hour; otherwise the first one that does.
    const options = minutesFor(h);
    setMinute((m) => (m !== null && options.includes(m) ? m : (options[0] ?? null)));
  };

  const openSheet = () => {
    // Start from the current choice, or the first bookable time.
    const start = value && isBookable(value, range) ? parseSlot(value) : range?.from;
    if (start !== undefined) {
      setHour(Math.floor(start / 60));
      setMinute(start % 60);
    }
    setOpen(true);
  };

  return (
    <PickerField
      label="Hora"
      value={value ? formatSlot(value) : null}
      placeholder="Elegir hora"
      icon={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
      title="Elige la hora"
      open={open}
      onOpen={openSheet}
      onClose={() => setOpen(false)}
      error={error}>
      {needsDate ? (
        <Text style={[styles.hint, styles.empty, { color: colors.textSecondary }]}>Primero elige la fecha.</Text>
      ) : !range ? (
        <Text style={[styles.hint, styles.empty, { color: colors.textSecondary }]}>
          Ese día ya no hay horario de servicio. Elige otra fecha.
        </Text>
      ) : (
        <>
          {!!hoursLabel && <Text style={[styles.hint, { color: colors.textSecondary }]}>{hoursLabel}</Text>}
          <View style={styles.columns}>
            <TimeColumn
              title="Hora"
              items={hours.map((h) => ({ key: h, label: formatHour12(h) }))}
              selected={hour}
              onSelect={pickHour}
            />
            <TimeColumn
              title="Minutos"
              items={minutes.map((m) => ({ key: m, label: `:${String(m).padStart(2, '0')}` }))}
              selected={minute}
              onSelect={setMinute}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={pending === null}
            onPress={() => {
              if (pending === null) return;
              onChange(formatTime(pending));
              setOpen(false);
            }}
            style={({ pressed }) => [
              styles.confirm,
              { backgroundColor: pressed ? Brand.greenDark : Brand.green },
              pending === null && styles.dim,
            ]}>
            <Text style={styles.confirmText}>
              {pending === null ? 'Elige la hora' : `Confirmar ${formatTime12(pending)}`}
            </Text>
          </Pressable>
          <Text style={[styles.hint, styles.center, { color: colors.textSecondary }]}>
            Tu mesa queda sujeta a confirmación del personal.
          </Text>
        </>
      )}
    </PickerField>
  );
}

function TimeColumn({
  title,
  items,
  selected,
  onSelect,
}: {
  title: string;
  items: { key: number; label: string }[];
  selected: number | null;
  onSelect: (key: number) => void;
}) {
  const { colors } = useBrandTheme();
  return (
    <View style={[styles.column, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <Text style={[styles.columnTitle, { color: colors.textSecondary, borderBottomColor: colors.border }]}>
        {title}
      </Text>
      <ScrollView contentContainerStyle={styles.columnList} showsVerticalScrollIndicator={false}>
        {items.map((item) => {
          const active = item.key === selected;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(item.key)}
              style={[styles.timeItem, active && { backgroundColor: Brand.orange }]}>
              <Text style={[styles.timeItemText, { color: active ? Brand.white : colors.text }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 8,
  },
  label: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  field: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  value: {
    flex: 1,
    fontFamily: BrandFonts.body,
    fontSize: 16,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    borderTopLeftRadius: Radius.lg + 4,
    borderTopRightRadius: Radius.lg + 4,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  sheetTitle: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 18,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 17,
    letterSpacing: 1,
    textTransform: 'capitalize',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  weekDay: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontFamily: BrandFonts.bodyBold,
    fontSize: 12,
    paddingBottom: 6,
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 3,
  },
  day: {
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 15,
  },
  blockedText: {
    opacity: 0.45,
    textDecorationLine: 'line-through',
  },
  dim: {
    opacity: 0.45,
  },
  hint: {
    fontFamily: BrandFonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  empty: {
    paddingVertical: 20,
    textAlign: 'center',
    fontSize: 15,
  },
  center: {
    textAlign: 'center',
  },
  columns: {
    flexDirection: 'row',
    gap: 12,
    height: 260,
  },
  column: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  columnTitle: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  columnList: {
    padding: 6,
    gap: 4,
  },
  timeItem: {
    minHeight: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeItemText: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 18,
  },
  confirm: {
    minHeight: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: Brand.white,
    fontFamily: BrandFonts.labelBold,
    fontSize: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
