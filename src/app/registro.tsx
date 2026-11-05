import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { Checkbox } from '@/components/brand/checkbox';
import { FormCard } from '@/components/brand/form-card';
import { FormMessage } from '@/components/brand/form-message';
import { PasswordRules } from '@/components/brand/password-rules';
import { OrDivider, TextLink } from '@/components/brand/text-link';
import { TextField } from '@/components/brand/text-field';
import { BrandFonts } from '@/constants/brand';
import { useAfterSignIn } from '@/hooks/use-after-sign-in';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useRegisterForm } from '@/hooks/use-session-forms';
import { normalizePhone } from '@/utils/validation';

function FormSection({ children }: { children: string }) {
  const { colors } = useBrandTheme();
  return (
    <View style={[styles.section, { borderBottomColor: colors.border }]}>
      <Text style={[styles.sectionText, { color: colors.textSecondary }]}>{children}</Text>
    </View>
  );
}

export default function RegisterScreen() {
  const { colors } = useBrandTheme();
  const {
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
    submit: register,
  } = useRegisterForm();
  const afterSignIn = useAfterSignIn();

  const submit = async () => {
    const outcome = await register();
    // Without an automatic session, send them to sign in with the new account.
    if (outcome === 'sign-in') router.replace({ pathname: '/login', params: afterSignIn.params });
    else if (outcome === 'signed-in') afterSignIn.goOn();
  };

  return (
    <BrandScreen showBack>
      <FormCard
        icon={{ ios: 'person', android: 'person', web: 'person' }}
        title="La 501 Centro"
        subtitle="Crea tu cuenta y acumula puntos"
        footer={`La 501 Sports Restaurant © ${new Date().getFullYear()} — Registro seguro`}>
        {!!formError && <FormMessage type="error">{formError}</FormMessage>}

        <FormSection>Datos personales</FormSection>
        <TextField
          label="Nombre completo"
          required
          placeholder="Tu nombre y apellidos"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          textContentType="name"
          error={errors.name}
        />
        <TextField
          label="Correo electrónico"
          required
          placeholder="tu@correo.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          error={errors.email}
        />
        <TextField
          label="Teléfono"
          required
          placeholder="771 000 0000"
          value={phone}
          onChangeText={(v) => setPhone(normalizePhone(v))}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          maxLength={10}
          error={errors.phone}
        />

        <FormSection>Contraseña</FormSection>
        <TextField
          label="Nueva contraseña"
          required
          placeholder="Mínimo 8 caracteres"
          value={password}
          onChangeText={setPassword}
          password
          autoComplete="new-password"
          textContentType="newPassword"
          error={errors.password}
        />
        <PasswordRules value={password} />
        <TextField
          label="Confirmar contraseña"
          required
          placeholder="Repite tu contraseña"
          value={confirm}
          onChangeText={setConfirm}
          password
          autoComplete="new-password"
          textContentType="newPassword"
          error={errors.confirm}
        />

        <FormSection>Privacidad</FormSection>
        <Checkbox checked={adult} onChange={setAdult} accessibilityLabel="Soy mayor de 18 años">
          Soy mayor de 18 años. <Text style={[styles.required, { color: colors.accent }]}>*</Text>
        </Checkbox>
        <Checkbox checked={terms} onChange={setTerms} accessibilityLabel="Acepto los términos y el aviso de privacidad">
          He leído y acepto los{' '}
          <Text style={[styles.link, { color: colors.accent }]} onPress={() => router.push('/terminos')} accessibilityRole="link">
            Términos y condiciones
          </Text>{' '}
          y el{' '}
          <Text style={[styles.link, { color: colors.accent }]} onPress={() => router.push('/aviso-privacidad')} accessibilityRole="link">
            Aviso de privacidad
          </Text>{' '}
          de La 501 Sports Restaurant. <Text style={[styles.required, { color: colors.accent }]}>*</Text>
        </Checkbox>
        <Checkbox
          checked={promoOptIn}
          onChange={setPromoOptIn}
          accessibilityLabel="Quiero recibir promociones por correo (opcional)">
          Quiero recibir promociones y ofertas por correo (opcional). Puedes cambiarlo cuando quieras en Mis datos y
          privacidad.
        </Checkbox>

        <BrandButton
          title="Crear mi cuenta"
          icon={{ ios: 'person.badge.plus', android: 'person_add', web: 'person_add' }}
          onPress={submit}
          loading={submitting}
        />
        <OrDivider />
        <TextLink prefix="¿Ya tienes cuenta?" label="Inicia sesión" onPress={() => router.replace({ pathname: '/login', params: afterSignIn.params })}
        />
      </FormCard>
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
  section: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 10,
    marginTop: 4,
  },
  sectionText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  link: {
    fontFamily: BrandFonts.bodyBold,
    textDecorationLine: 'underline',
  },
  required: {
  },
});
