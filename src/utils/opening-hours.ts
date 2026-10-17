/**
 * Opening hours and reservation time slots.
 *
 * Hours come from /public/info as free text per day, e.g. "13:00 PM – 10:30 PM" (the site
 * mixes 24h and AM/PM), or "Cerrado". Times are kept as minutes after midnight.
 */

export type DayHours = { open: number; close: number } | null;
/** Index 0 = domingo … 6 = sábado, like Date.getDay(). */
export type WeekHours = DayHours[];

export const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// Used until /public/info loads (and offline on a first launch): every day 13:00–22:30.
export const DEFAULT_HOURS: WeekHours = Array.from({ length: 7 }, () => ({ open: 13 * 60, close: 22 * 60 + 30 }));

// Minute choices in the time picker (00, 05, 10…).
export const MINUTE_STEP = 5;

function parseTime(text: string): number | null {
  const match = text.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)?/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  const meridiem = match[3]?.toLowerCase().replace(/[\s.]/g, '');
  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  if (hours > 24 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** "13:00 PM – 10:30 PM" → { open: 780, close: 1350 }; "Cerrado" or unreadable → null. */
export function parseDayHours(text: string): DayHours {
  const [from, to] = text.split(/\s*[–—-]\s*|\s+a\s+/);
  if (!from || !to) return null;
  const open = parseTime(from);
  let close = parseTime(to);
  if (open === null || close === null) return null;
  if (close <= open) close += 24 * 60; // closes after midnight
  return { open, close };
}

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** { lunes: "…", "miércoles": "…" } → hours per weekday (missing days keep the default). */
export function parseWeekHours(schedule: Record<string, unknown>): WeekHours {
  const byName = new Map(Object.entries(schedule).map(([day, text]) => [normalize(day), text]));
  return WEEKDAYS.map((day, i) => {
    const text = byName.get(normalize(day));
    return typeof text === 'string' ? parseDayHours(text) : DEFAULT_HOURS[i];
  });
}

export function formatTime(minutes: number) {
  const m = minutes % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** 780 → "1:00 PM", for the schedule card. */
export function formatTime12(minutes: number) {
  const m = minutes % (24 * 60);
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "17:30" → "5:30 PM". */
export function formatSlot(time: string) {
  return formatTime12(parseSlot(time));
}

/** "17:30" → 1050. */
export function parseSlot(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** 17 → "5 PM". */
export function formatHour12(hour: number) {
  const h = hour % 24;
  return `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
}

/** First and last bookable minute of a day, both inclusive. */
export type BookingWindow = { from: number; to: number };

/**
 * Times a table can be requested that day: exactly the opening hours saved in the
 * database (any minute, in MINUTE_STEP steps); today, only from now on. null = closed, or
 * already closed today. Whether a table is free is up to the staff when they confirm.
 */
export function bookingWindow(date: Date, week: WeekHours, now = new Date()): BookingWindow | null {
  const hours = week[date.getDay()];
  if (!hours) return null;
  const isToday = date.toDateString() === now.toDateString();
  const earliest = isToday ? now.getHours() * 60 + now.getMinutes() : 0;
  const from = Math.ceil(Math.max(hours.open, earliest) / MINUTE_STEP) * MINUTE_STEP;
  const to = hours.close;
  return from <= to ? { from, to } : null;
}

export function isBookable(time: string, window: BookingWindow | null) {
  if (!window) return false;
  const minutes = parseSlot(time);
  return minutes >= window.from && minutes <= window.to;
}
