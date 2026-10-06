import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { errorMessage } from '@/api/client';
import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { Checkbox } from '@/components/brand/checkbox';
import { FormCard } from '@/components/brand/form-card';
import { FormMessage } from '@/components/brand/form-message';
import { OrDivider, TextLink } from '@/components/brand/text-link';
import { TextField } from '@/components/brand/text-field';
import { useAuth } from '@/hooks/use-auth';
import { isEmail } from '@/utils/validation';

export default function LoginScreen() {
  const { signIn, user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Admins have their own sections; the customer screens behind this one are closed to
  // them, so go straight to the panel once the admin screens are available.
  useEffect(() => {
    if (isAdmin) router.replace('/admin');
  }, [isAdmin]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!isEmail(email)) return setError('Escribe un correo electrónico válido.');
    if (!password) return setError('Escribe tu contraseña.');

    setError(null);
    setSubmitting(true);
    try {
      const signedIn = await signIn(email, password, remember);
      if (signedIn.role === 'admin') return; // the effect above opens the panel
      // Back to wherever sign-in was opened from (Cuenta, Pedidos, the ☰ panel…).
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
      setPassword('');
    }
  };

  return (
    <BrandScreen showBack>
      <FormCard
        icon={{ ios: 'house', android: 'home', web: 'home' }}
        title="La 501 Centro"
        subtitle="Sports Restaurant"
        footer={`La 501 Sports Restaurant © ${new Date().getFullYear()} — Acceso seguro`}>
        {!!error && <FormMessage type="error">{error}</FormMessage>}
        <TextField
          label="Correo electrónico"
          placeholder="tu@correo.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <TextField
          label="Contraseña"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          password
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <Checkbox checked={remember} onChange={setRemember}>
          Mantener sesión iniciada
        </Checkbox>
        <BrandButton
          title="Entrar"
          icon={{ ios: 'arrow.right.circle', android: 'login', web: 'login' }}
          onPress={submit}
          loading={submitting}
        />
        <OrDivider />
        <TextLink label="¿Olvidaste tu contraseña?" muted onPress={() => router.push('/recuperar')} />
        <TextLink
          prefix="¿No tienes cuenta?"
          label="Regístrate"
          onPress={() => router.replace('/registro')}
        />
      </FormCard>
    </BrandScreen>
  );
}
