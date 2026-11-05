import { router } from 'expo-router';
import { useEffect } from 'react';

import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { Checkbox } from '@/components/brand/checkbox';
import { FormCard } from '@/components/brand/form-card';
import { FormMessage } from '@/components/brand/form-message';
import { OrDivider, TextLink } from '@/components/brand/text-link';
import { TextField } from '@/components/brand/text-field';
import { useAfterSignIn } from '@/hooks/use-after-sign-in';
import { useAuth } from '@/hooks/use-auth';
import { useLoginForm } from '@/hooks/use-session-forms';

export default function LoginScreen() {
  const { user } = useAuth();
  const role = user?.role;
  const afterSignIn = useAfterSignIn();

  // Staff have their own sections; the customer screens behind this one are closed to
  // them, so go straight to theirs once those screens are available.
  useEffect(() => {
    if (role === 'admin') router.replace('/admin');
    else if (role === 'mesero') router.replace('/mesero');
  }, [role]);
  const { email, setEmail, password, setPassword, remember, setRemember, submitting, error, submit: signInWithForm } = useLoginForm();

  const submit = async () => {
    const signedIn = await signInWithForm();
    if (!signedIn || signedIn.role !== 'cliente') return; // staff: the effect above opens their section
    afterSignIn.goOn();
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
          onPress={() => router.replace({ pathname: '/registro', params: afterSignIn.params })}
        />
      </FormCard>
    </BrandScreen>
  );
}
