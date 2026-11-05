import { useState } from 'react';

import type { User } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { useAuth } from '@/hooks/use-auth';
import { useStorePolicy } from '@/hooks/use-store-policy';
import { isEmail, isPhone, isStrongPassword, normalizePhone } from '@/utils/validation';

/** ViewModels of "Iniciar sesión" and "Crear cuenta". */

/** Resolves with the signed-in user, or null when it didn't happen (the error is shown). */
export function useLoginForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fail = (message: string) => {
    setError(message);
    return null;
  };

  const submit = async (): Promise<User | null> => {
    if (!isEmail(email)) return fail('Escribe un correo electrónico válido.');
    if (!password) return fail('Escribe tu contraseña.');
    setError(null);
    setSubmitting(true);
    try {
      return await signIn(email, password, remember);
    } catch (err) {
      setError(errorMessage(err));
      return null;
    } finally {
      setSubmitting(false);
      setPassword('');
    }
  };

  return { email, setEmail, password, setPassword, remember, setRemember, submitting, error, submit };
}

export type RegisterField = 'name' | 'email' | 'phone' | 'password' | 'confirm';
type Errors = Partial<Record<RegisterField, string>>;

/**
 * Creating an account. Consent checkboxes always start unchecked (explicit opt-in); the
 * versions of the texts accepted go with them (M-22). Resolves 'signed-in' (the server opened
 * the session), 'sign-in' (the account exists, now sign in) or null (the error is shown).
 */
export function useRegisterForm() {
  const { signUp } = useAuth();
  const policy = useStorePolicy();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [terms, setTerms] = useState(false);
  const [adult, setAdult] = useState(false);
  const [promoOptIn, setPromoOptIn] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): Errors => {
    const next: Errors = {};
    if (name.trim().length < 3) next.name = 'Escribe tu nombre completo.';
    if (!isEmail(email)) next.email = 'Correo electrónico no válido.';
    if (!isPhone(phone)) next.phone = 'El teléfono debe tener 10 dígitos.';
    if (!isStrongPassword(password)) next.password = 'La contraseña no cumple los requisitos.';
    if (confirm !== password) next.confirm = 'Las contraseñas no coinciden.';
    return next;
  };

  const fail = (message: string) => {
    setFormError(message);
    return null;
  };

  const submit = async (): Promise<'signed-in' | 'sign-in' | null> => {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return fail('Revisa los campos marcados.');
    if (!adult) return fail('Para crear tu cuenta debes ser mayor de 18 años.');
    if (!terms) return fail('Para crear tu cuenta debes aceptar los Términos y el Aviso de privacidad.');

    setFormError(null);
    setSubmitting(true);
    try {
      const user = await signUp({
        name,
        email,
        phone: normalizePhone(phone),
        password,
        passwordConfirmation: confirm,
        promoOptIn,
        adult,
        termsVersion: policy.termsVersion,
        privacyVersion: policy.privacyVersion,
      });
      return user ? 'signed-in' : 'sign-in';
    } catch (err) {
      setFormError(errorMessage(err));
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    name,
    setName,
    email,
    setEmail,
    phone,
    setPhone,
    password,
    setPassword,
    confirm,
    setConfirm,
    terms,
    setTerms,
    adult,
    setAdult,
    promoOptIn,
    setPromoOptIn,
    errors,
    formError,
    submitting,
    submit,
  };
}
