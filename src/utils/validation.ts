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

/** Where a verification code was sent. */
export type CodeChannel = 'email' | 'sms';

/** The email code is made by the server (8 digits, like the website's). */
export const EMAIL_CODE_LENGTH = 8;
/**
 * SMS codes come from Twilio Verify, whose length is set in the Twilio console: 6 by
 * default, 8 once it's changed to match the email code. Both are accepted so the app
 * keeps working before and after that change.
 */
export const SMS_CODE_LENGTHS = [6, 8] as const;
/** The longest code: what the code field lets you type. */
export const CODE_MAX_LENGTH = 8;

export function isCompleteCode(code: string, channel: CodeChannel) {
  if (channel === 'email') return code.length === EMAIL_CODE_LENGTH;
  return SMS_CODE_LENGTHS.some((length) => code.length === length);
}

/** The message when the code is missing digits. */
export function incompleteCodeMessage(channel: CodeChannel) {
  return channel === 'email'
    ? `Escribe el código de ${EMAIL_CODE_LENGTH} dígitos que te enviamos a tu correo.`
    : 'Escribe completo el código que te enviamos por SMS.';
}
