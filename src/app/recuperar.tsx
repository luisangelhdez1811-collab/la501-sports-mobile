import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Segmented } from '@/components/admin/admin-ui';
import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { FormCard } from '@/components/brand/form-card';
import { FormMessage } from '@/components/brand/form-message';
import { PasswordRules } from '@/components/brand/password-rules';
import { TextLink } from '@/components/brand/text-link';
import { TextField } from '@/components/brand/text-field';
import { CodeField, ResendCode } from '@/components/verification/code-input';
import { BrandFonts } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { usePasswordRecovery } from '@/hooks/use-password-recovery';
import { normalizePhone } from '@/utils/validation';

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
  const {
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
    cooldownRemaining,
    where,
    byPhone,
    codeSent,
    sendCode,
    resend,
    verify,
    reset,
    startOver,
  } = usePasswordRecovery();

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
              onChange={chooseMode}
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

        {step === 'code' && codeSent && (
          <>
            <CodeField value={code} onChange={setCode} />
            <BrandButton
              title="Verificar código"
              icon={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }}
              onPress={verify}
              loading={submitting}
            />
            <ResendCode remaining={cooldownRemaining} phone={byPhone} onResend={resend} />
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
