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
import { SelectField } from '@/components/brand/select-field';
import { OrDivider, TextLink } from '@/components/brand/text-link';
import { TextField } from '@/components/brand/text-field';
import { Brand, BrandFonts } from '@/constants/brand';
import { useAuth } from '@/hooks/use-auth';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { isEmail, isPhone, isStrongPassword, normalizePhone } from '@/utils/validation';

// Same questions as the website's registration form (/registro).
const SECURITY_QUESTIONS = [
  '¿Cuál es el nombre de tu primera mascota?',
  '¿Cuál es tu platillo favorito de La 501?',
  '¿En qué ciudad se conocieron tus padres?',
] as const;

type Errors = Partial<Record<'name' | 'email' | 'phone' | 'question' | 'answer' | 'password' | 'confirm', string>>;

function FormSection({ children }: { children: string }) {
  const { colors } = useBrandTheme();
  return (
    <View style={[styles.section, { borderBottomColor: colors.border }]}>
      <Text style={[styles.sectionText, { color: colors.textSecondary }]}>{children}</Text>
    </View>
  );
}

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): Errors => {
    const next: Errors = {};
    if (name.trim().length < 3) next.name = 'Escribe tu nombre completo.';
    if (!isEmail(email)) next.email = 'Correo electrónico no válido.';
    if (!isPhone(phone)) next.phone = 'El teléfono debe tener 10 dígitos.';
    if (!question) next.question = 'Selecciona una pregunta.';
    if (answer.trim().length < 2) next.answer = 'Escribe tu respuesta.';
    if (!isStrongPassword(password)) next.password = 'La contraseña no cumple los requisitos.';
    if (confirm !== password) next.confirm = 'Las contraseñas no coinciden.';
    return next;
  };

  const submit = async () => {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return setFormError('Revisa los campos marcados.');
    if (!terms) return setFormError('Debes aceptar los términos y la política de privacidad.');

    setFormError(null);
    setSubmitting(true);
    try {
      const user = await signUp({
        name,
        email,
        phone: normalizePhone(phone),
        securityQuestion: question!,
        securityAnswer: answer,
        password,
        passwordConfirmation: confirm,
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

        <FormSection>Pregunta de seguridad</FormSection>
        <SelectField
          label="Pregunta"
          required
          placeholder="Selecciona una pregunta"
          options={SECURITY_QUESTIONS}
          value={question}
          onChange={setQuestion}
          error={errors.question}
        />
        <TextField
          label="Tu respuesta"
          required
          placeholder="Respuesta secreta"
          value={answer}
          onChangeText={setAnswer}
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.answer}
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

        <Checkbox checked={terms} onChange={setTerms} accessibilityLabel="Acepto los términos y la política de privacidad">
          Acepto los <Text style={styles.link}>términos y condiciones</Text> y la{' '}
          <Text style={styles.link}>política de privacidad</Text> de La 501 Sports Restaurant.
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
    color: Brand.orange,
    fontFamily: BrandFonts.bodyBold,
  },
});
