import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { formatTime12, WEEKDAYS, type WeekHours } from '@/utils/opening-hours';

// Monday first, like a calendar week.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Opening hours per day, with today highlighted. Hours come from the server (or the default). */
export function ScheduleCard({ hours, showIcon = false }: { hours: WeekHours; showIcon?: boolean }) {
  const { colors } = useBrandTheme();
  const today = new Date().getDay();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        {showIcon && (
          <View style={styles.icon}>
            <SymbolView name={{ ios: 'clock.fill', android: 'schedule', web: 'schedule' }} size={20} tintColor={Brand.white} />
          </View>
        )}
        <Text style={[styles.title, showIcon && { color: colors.text, fontSize: 20 }]}>Horario</Text>
      </View>
      {WEEK_ORDER.map((day) => {
        const h = hours[day];
        const isToday = day === today;
        return (
          <View key={day} style={[styles.row, { borderTopColor: colors.border }]}>
            <Text style={[styles.day, { color: isToday ? Brand.orange : colors.textSecondary }]}>
              {WEEKDAYS[day]}
              {isToday ? ' · hoy' : ''}
            </Text>
            <Text style={[styles.hours, { color: h ? colors.text : Brand.red }]}>
              {h ? `${formatTime12(h.open)} – ${formatTime12(h.close)}` : 'Cerrado'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    experimental_backgroundImage: `linear-gradient(135deg, ${Brand.orange}, ${Brand.orangeDark})`,
  },
  title: {
    color: Brand.orange,
    fontFamily: BrandFonts.labelBold,
    fontSize: 15,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  day: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 14,
    textTransform: 'capitalize',
  },
  hours: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
  },
});
