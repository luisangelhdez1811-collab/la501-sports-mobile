import { useState } from 'react';

import { forgotPassword, resetPassword, verifyResetCode, type RecoveryTarget } from '@/api/auth';
import { ApiError, errorMessage } from '@/api/client';
import { useCooldown } from '@/hooks/use-cooldown';
import { isCompleteCode, isEmail, isPhone, isStrongPassword } from '@/utils/validation';

// Same order as the website: send the code → verify it → choose the new password.
export type RecoveryStep = 'contact' | 'code' | 'password' | 'done';
export type RecoveryMode = 'email' | 'phone';

/** "¿Olvidaste tu contraseña?" ViewModel: by email or SMS, with a one-time code. */
export function usePasswordRecovery() {
  const cooldown = useCooldown();
  const [step, setStep] = useState<RecoveryStep>('contact');
  // Separate choices so each gets the right keyboard (a phone number on the email keyboard is hard to type).
  const [mode, setMode] = useState<RecoveryMode>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [target, setTarget] = useState<RecoveryTarget | null>(null);
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const send = (next: RecoveryTarget) =>
    run(async () => {
      await cooldown.track(() => forgotPassword(next));
      setTarget(next);
      if (step === 'code') setNotice('Te enviamos un código nuevo.');
      setCode('');
      setStep('code');
    });

  const chooseMode = (next: RecoveryMode) => {
    setMode(next);
    setError(null);
  };

  const sendCode = () => {
    if (mode === 'email' && !isEmail(email)) return setError('Escribe un correo electrónico válido.');
    if (mode === 'phone' && !isPhone(phone)) return setError('El celular debe tener 10 dígitos.');
    send(mode === 'email' ? { email } : { phone });
  };

  const resend = () => {
    if (target) send(target);
  };

  const verify = () => {
    if (!target) return;
    if (!isCompleteCode(code)) return setError('Escribe el código de 6 dígitos que te enviamos.');
    run(async () => {
      setResetToken(await verifyResetCode(target, code));
      setStep('password');
    });
  };

  const reset = () => {
    if (!target) return;
    if (!isStrongPassword(password)) return setError('La contraseña no cumple los requisitos.');
    if (password !== confirm) return setError('Las contraseñas no coinciden.');
    run(async () => {
      try {
        await resetPassword({ target, resetToken, code, password, passwordConfirmation: confirm });
        setStep('done');
      } catch (err) {
        // The code (or its token) expired while choosing the password: back to the code step.
        if (err instanceof ApiError && err.code === 'invalid_or_expired_code') {
          setCode('');
          setResetToken(null);
          setStep('code');
        }
        throw err;
      }
    });
  };

  const startOver = () => {
    setStep('contact');
    setCode('');
    setResetToken(null);
    setError(null);
    setNotice(null);
  };

  return {
    step,
    mode,
    chooseMode,
    email,
    setEmail,
    phone,
    setPhone,
    code,
    setCode,
    password,
    setPassword,
    confirm,
    setConfirm,
    submitting,
    error,
    notice,
    cooldownRemaining: cooldown.remaining,
    /** Where the code went: the email or the phone, as typed. */
    where: target ? ('email' in target ? target.email.trim() : target.phone) : '',
    byPhone: !!target && 'phone' in target,
    codeSent: !!target,
    sendCode,
    resend,
    verify,
    reset,
    startOver,
  };
}
