import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { Checkbox } from '@/components/brand/checkbox';
import { FormCard } from '@/components/brand/form-card';
import { FormMessage } from '@/components/brand/form-message';
import { PasswordRules } from '@/components/brand/password-rules';
import { OrDivider, TextLink } from '@/components/brand/text-link';
import { TextField } from '@/components/brand/text-field';
import { BrandFonts } from '@/constants/brand';
import { useAuth } from '@/hooks/use-auth';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useStorePolicy } from '@/hooks/use-store-policy';
import { isEmail, isPhone, isStrongPassword, normalizePhone } from '@/utils/validation';

type Errors = Partial<Record<'name' | 'email' | 'phone' | 'password' | 'confirm', string>>;

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
  const { signUp } = useAuth();
  // The versions of the texts the person accepts with the checkbox (M-22).
  const policy = useStorePolicy();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  // Consent checkboxes always start unchecked (explicit opt-in).
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

  const submit = async () => {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return setFormError('Revisa los campos marcados.');
    if (!adult) return setFormError('Para crear tu cuenta debes ser mayor de 18 años.');
    if (!terms) return setFormError('Para crear tu cuenta debes aceptar los Términos y el Aviso de privacidad.');

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
      // Without an automatic session, send them to sign in with the new account.
      if (user) {
        if (router.canGoBack()) router.back();
        else router.replace('/');
      } else router.replace('/login');
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
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
        <TextLink prefix="¿Ya tienes cuenta?" label="Inicia sesión" onPress={() => router.replace('/login')} />
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
