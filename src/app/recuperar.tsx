import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { forgotPassword, resetPassword } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { FormCard } from '@/components/brand/form-card';
import { FormMessage } from '@/components/brand/form-message';
import { PasswordRules } from '@/components/brand/password-rules';
import { TextLink } from '@/components/brand/text-link';
import { TextField } from '@/components/brand/text-field';
import { BrandFonts } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { isEmail, isStrongPassword } from '@/utils/validation';

type Step = 'email' | 'code' | 'done';

export default function RecoverScreen() {
  const { colors } = useBrandTheme();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    if (!isEmail(email)) return setError('Escribe un correo electrónico válido.');
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setStep('code');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const reset = async () => {
    if (code.trim().length < 4) return setError('Escribe el código que te enviamos.');
    if (!isStrongPassword(password)) return setError('La contraseña no cumple los requisitos.');
    if (password !== confirm) return setError('Las contraseñas no coinciden.');
    setError(null);
    setSubmitting(true);
    try {
      await resetPassword({ email, code, password, passwordConfirmation: confirm });
      setStep('done');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const intro = {
    email: 'Ingresa tu correo y te enviaremos un código de seguridad para restablecer tu contraseña.',
    // Same wording whether or not the email exists, so it can't be used to probe accounts.
    code: `Si ${email.trim()} tiene una cuenta, recibirás un código. Escríbelo junto con tu nueva contraseña.`,
    done: 'Tu contraseña se actualizó. Ya puedes iniciar sesión.',
  }[step];

  return (
    <BrandScreen showBack>
      <FormCard
        icon={{ ios: 'key', android: 'key', web: 'key' }}
        title="La 501 Centro"
        subtitle="Recuperación de contraseña"
        footer={`La 501 Sports Restaurant © ${new Date().getFullYear()} — Acceso seguro`}>
        <View style={styles.intro}>
          <Text style={[styles.introTitle, { color: colors.text }]}>Recuperar acceso</Text>
          <Text style={[styles.introText, { color: colors.textSecondary }]}>{intro}</Text>
        </View>
        {!!error && <FormMessage type="error">{error}</FormMessage>}

        {step === 'email' && (
          <>
            <TextField
              label="Correo electrónico"
              placeholder="tu@correo.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={sendCode}
            />
            <BrandButton
              title="Enviar código"
              icon={{ ios: 'envelope', android: 'mail', web: 'mail' }}
              onPress={sendCode}
              loading={submitting}
            />
          </>
        )}

        {step === 'code' && (
          <>
            <TextField
              label="Código de seguridad"
              placeholder="123456"
              value={code}
              onChangeText={(v) => setCode(v.replace(/\s/g, ''))}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={10}
            />
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
            <BrandButton title="Cambiar contraseña" onPress={reset} loading={submitting} />
            <TextLink label="Reenviar código" muted onPress={sendCode} />
          </>
        )}

        {step === 'done' && (
          <BrandButton title="Iniciar sesión" onPress={() => router.replace('/login')} />
        )}

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
