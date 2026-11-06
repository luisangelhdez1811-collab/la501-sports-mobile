import { request } from './client';

export type ReservationZone = 'General' | 'Terraza';

// Field names verified against the backend validation; same fields as the website form.
export type ReservationInput = {
  name: string;
  phone: string;
  email: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  /** 1–10, or 11 for "Más de 10 personas" (same values as the website). */
  people: number;
  zone: ReservationZone;
};

export async function createReservation(input: ReservationInput) {
  await request('/app/reservations', {
    method: 'POST',
    // Sends the token when signed in so the reservation counts toward the account.
    auth: true,
    body: {
      nombre_completo: input.name.trim(),
      telefono: input.phone,
      correo_electronico: input.email.trim().toLowerCase(),
      fecha_reservacion: input.date,
      hora_reservacion: input.time,
      cantidad_personas: input.people,
      zona: input.zone,
    },
  });
}
