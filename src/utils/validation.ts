// Client-side checks are only for instant feedback; the Laravel API is the real gatekeeper.

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/** Mexican 10-digit phone; spaces and dashes are ignored. */
export function normalizePhone(value: string) {
  return value.replace(/\D/g, '').slice(0, 10);
}

export function isPhone(value: string) {
  return normalizePhone(value).length === 10;
}

// Matches the strictest server rule (reset-password): upper, lower, digit and one of !@#$%^&*.
export const PASSWORD_RULES = [
  { label: '8 caracteres', test: (v: string) => v.length >= 8 },
  { label: 'Mayúscula', test: (v: string) => /[A-ZÁÉÍÓÚÑ]/.test(v) },
  { label: 'Minúscula', test: (v: string) => /[a-záéíóúñ]/.test(v) },
  { label: 'Número', test: (v: string) => /\d/.test(v) },
  { label: 'Símbolo (!@#$%^&*)', test: (v: string) => /[!@#$%^&*]/.test(v) },
] as const;

export function isStrongPassword(value: string) {
  return PASSWORD_RULES.every((rule) => rule.test(value));
}
