import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { forgotPassword, resetPassword, verifyResetCode, type RecoveryTarget } from '@/api/auth';
import { ApiError, errorMessage } from '@/api/client';
import { Segmented } from '@/components/admin/admin-ui';
import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { FormCard } from '@/components/brand/form-card';
import { FormMessage } from '@/components/brand/form-message';
import { PasswordRules } from '@/components/brand/password-rules';
import { TextLink } from '@/components/brand/text-link';
import { TextField } from '@/components/brand/text-field';
import { CodeField, isCompleteCode, ResendCode } from '@/components/verification/code-input';
import { BrandFonts } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useCooldown } from '@/hooks/use-cooldown';
import { isEmail, isPhone, isStrongPassword, normalizePhone } from '@/utils/validation';

// Same order as the website: send the code → verify it → choose the new password.
type Step = 'contact' | 'code' | 'password' | 'done';
type Mode = 'email' | 'phone';

const MODES = [
  { value: 'email', label: 'Correo' },
  { value: 'phone', label: 'Celular' },
] as const;

const HEADER = {
  contact: { icon: { ios: 'key', android: 'key', web: 'key' }, subtitle: 'Recuperación de contraseña' },
  code: { icon: { ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }, subtitle: 'Verificación de seguridad' },
  password: { icon: { ios: 'lock', android: 'lock', web: 'lock' }, subtitle: 'Crear nueva contraseña' },
  done: { icon: { ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }, subtitle: 'Contraseña actualizada' },
} as const;

export default function RecoverScreen() {
  const { colors } = useBrandTheme();
  const cooldown = useCooldown();
  const [step, setStep] = useState<Step>('contact');
  // Separate choices so each gets the right keyboard (a phone number on the email keyboard is hard to type).
  const [mode, setMode] = useState<Mode>('email');
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

  const sendCode = () => {
    if (mode === 'email' && !isEmail(email)) return setError('Escribe un correo electrónico válido.');
    if (mode === 'phone' && !isPhone(phone)) return setError('El celular debe tener 10 dígitos.');
    send(mode === 'email' ? { email } : { phone });
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

  const byPhone = !!target && 'phone' in target;
  const where = target ? ('email' in target ? target.email.trim() : target.phone) : '';
  const intro = {
    contact:
      mode === 'email'
        ? 'Escribe el correo de tu cuenta y te enviaremos un código para crear una contraseña nueva.'
        : 'Escribe el celular de tu cuenta y te enviaremos un código por SMS para crear una contraseña nueva.',
    // Same wording whether or not the account exists, so it can't be used to probe accounts.
    code: byPhone
      ? `Si ${where} tiene una cuenta, te llegará un SMS con un código de 6 dígitos.`
      : `Si ${where} tiene una cuenta, recibirás en tu correo un código de 6 dígitos.`,
    password: 'Código verificado. Crea una contraseña segura para tu cuenta.',
    done: 'Tu contraseña se actualizó. Por seguridad se cerró la sesión en todos tus dispositivos; inicia sesión de nuevo.',
  }[step];

  return (
    <BrandScreen showBack>
      <FormCard
        icon={HEADER[step].icon}
        title="La 501 Centro"
        subtitle={HEADER[step].subtitle}
        footer={`La 501 Sports Restaurant © ${new Date().getFullYear()} — Acceso seguro`}>
        <View style={styles.intro}>
          <Text style={[styles.introTitle, { color: colors.text }]}>
            {step === 'password' ? 'Nueva contraseña' : 'Recuperar acceso'}
          </Text>
          <Text style={[styles.introText, { color: colors.textSecondary }]}>{intro}</Text>
        </View>
        {!!error && <FormMessage type="error">{error}</FormMessage>}
        {!!notice && <FormMessage type="success">{notice}</FormMessage>}

        {step === 'contact' && (
          <>
            <Segmented
              options={MODES}
              value={mode}
              onChange={(next) => {
                setMode(next);
                setError(null);
              }}
            />
            {mode === 'email' ? (
              <TextField
                label="Correo electrónico"
                placeholder="tu@correo.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={sendCode}
              />
            ) : (
              <TextField
                label="Celular (10 dígitos)"
                placeholder="771 000 0000"
                value={phone}
                onChangeText={(v) => setPhone(normalizePhone(v))}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                maxLength={10}
              />
            )}
            <BrandButton
              title={mode === 'phone' ? 'Enviar código por SMS' : 'Enviar código'}
              icon={{ ios: 'paperplane', android: 'send', web: 'send' }}
              onPress={sendCode}
              loading={submitting}
            />
          </>
        )}

        {step === 'code' && target && (
          <>
            <CodeField value={code} onChange={setCode} />
            <BrandButton
              title="Verificar código"
              icon={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }}
              onPress={verify}
              loading={submitting}
            />
            <ResendCode remaining={cooldown.remaining} phone={byPhone} onResend={() => send(target)} />
            <TextLink
              label={byPhone ? 'Usar otro celular o tu correo' : 'Usar otro correo o tu celular'}
              muted
              onPress={startOver}
            />
          </>
        )}

        {step === 'password' && (
          <>
            <TextField
              label="Nueva contraseña"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChangeText={setPassword}
              password
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <PasswordRules value={password} />
            <TextField
              label="Confirmar contraseña"
              placeholder="Repite tu contraseña"
              value={confirm}
              onChangeText={setConfirm}
              password
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <BrandButton
              title="Guardar nueva contraseña"
              icon={{ ios: 'lock', android: 'lock', web: 'lock' }}
              onPress={reset}
              loading={submitting}
            />
          </>
        )}

        {step === 'done' && <BrandButton title="Iniciar sesión" onPress={() => router.replace('/login')} />}

        {step !== 'done' && (
          <TextLink label="← Volver al inicio de sesión" muted onPress={() => router.back()} />
        )}
      </FormCard>
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: 6,
  },
  introTitle: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 20,
  },
  introText: {
    fontFamily: BrandFonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
});
