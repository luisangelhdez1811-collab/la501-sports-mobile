import { useState } from 'react';

import { errorMessage } from '@/api/client';
import { DEFAULT_ADDRESS, DEFAULT_MAP_QUERY, getRestaurantInfo } from '@/api/info';
import { createReservation, type ReservationZone } from '@/api/reservations';
import { useAuth } from '@/hooks/use-auth';
import { preloadResource, useCachedResource } from '@/hooks/use-cached-resource';
import { bookingWindow, DEFAULT_HOURS, isBookable, type WeekHours } from '@/utils/opening-hours';
import { isEmail, isPhone } from '@/utils/validation';

const INFO_KEY = 'restaurant-info';

/** Downloads the restaurant's info while the splash shows (customers only). */
export function preloadRestaurantInfo() {
  preloadResource(INFO_KEY, getRestaurantInfo, { persist: true });
}

/**
 * Opening hours, address and WhatsApp, saved on the device so the schedule (and blocked
 * hours) also work offline. Never empty: until the server answers, the website's values.
 */
export function useRestaurantInfo() {
  const { data } = useCachedResource(INFO_KEY, getRestaurantInfo, { persist: true });
  return {
    hours: data?.hours ?? DEFAULT_HOURS,
    address: data?.address || DEFAULT_ADDRESS,
    mapQuery: data?.mapQuery || DEFAULT_MAP_QUERY,
    whatsapp: data?.whatsapp ?? null,
  };
}

export type ReservationField = 'name' | 'phone' | 'email' | 'date' | 'time';
type Errors = Partial<Record<ReservationField, string>>;
type Message = { type: 'error' | 'success'; text: string } | null;

function toIsoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "Reservar" ViewModel: the form, the opening-hours check and sending the request. */
export function useReservationForm(hours: WeekHours) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [date, setDateState] = useState<Date | null>(null);
  const [time, setTimeState] = useState<string | null>(null);
  const [zone, setZone] = useState<ReservationZone>('General');
  const [people, setPeople] = useState(2);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const range = date ? bookingWindow(date, hours) : null;

  // Picking a value clears its error.
  const setDate = (next: Date | null) => {
    setDateState(next);
    setErrors((e) => ({ ...e, date: undefined }));
  };
  const setTime = (next: string | null) => {
    setTimeState(next);
    setErrors((e) => ({ ...e, time: undefined }));
  };

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
      setDateState(null);
      setTimeState(null);
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  return {
    name,
    setName,
    phone,
    setPhone,
    email,
    setEmail,
    date,
    setDate,
    time,
    setTime,
    zone,
    setZone,
    people,
    setPeople,
    range,
    errors,
    submitting,
    message,
    setMessage,
    submit,
  };
}
