import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { getMyOrders, requestOrderOtp, verifyOrderOtp, type OrderSummary } from '@/api/account';
import { errorMessage } from '@/api/client';
import { OrdersList } from '@/components/account/orders-list';
import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { OfflineBanner } from '@/components/brand/offline-banner';
import { FormCard } from '@/components/brand/form-card';
import { FormMessage } from '@/components/brand/form-message';
import { TextLink } from '@/components/brand/text-link';
import { TextField } from '@/components/brand/text-field';
import { BrandTitle } from '@/components/brand/typography';
import { Brand, BrandFonts } from '@/constants/brand';
import { useAuth } from '@/hooks/use-auth';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useCachedResource } from '@/hooks/use-cached-resource';
import { isPhone, normalizePhone } from '@/utils/validation';

/** Guests find their orders with the phone used at checkout plus a one-time code. */
function GuestLookup() {
  const { colors } = useBrandTheme();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code' | 'results'>('phone');
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    if (!isPhone(phone)) return setError('El teléfono debe tener 10 dígitos.');
    setError(null);
    setSubmitting(true);
    try {
      await requestOrderOtp(phone);
      setStep('code');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const verify = async () => {
    if (code.trim().length < 4) return setError('Escribe el código que te enviamos.');
    setError(null);
    setSubmitting(true);
    try {
      setOrders(await verifyOrderOtp(phone, code));
      setStep('results');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'results') {
    return (
      <FormCard accent="green-orange">
        <Text style={[styles.cardTitle, { color: colors.text }]}>Pedidos de {phone}</Text>
        {orders.length > 0 ? (
          <OrdersList orders={orders} />
        ) : (
          <Text style={[styles.text, { color: colors.textSecondary }]}>
            No encontramos pedidos con este teléfono.
          </Text>
        )}
        <TextLink
          label="Consultar otro teléfono"
          muted
          onPress={() => {
            setStep('phone');
            setCode('');
            setOrders([]);
          }}
        />
      </FormCard>
    );
  }

  return (
    <FormCard icon={{ ios: 'bag', android: 'receipt_long', web: 'receipt_long' }} title="Consulta tu pedido">
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        {step === 'phone'
          ? 'Escribe el teléfono con el que hiciste tu pedido y te enviaremos un código.'
          : `Escribe el código que enviamos al ${phone}.`}
      </Text>
      {!!error && <FormMessage type="error">{error}</FormMessage>}
      {step === 'phone' ? (
        <>
          <TextField
            label="Teléfono"
            placeholder="771 000 0000"
            value={phone}
            onChangeText={(v) => setPhone(normalizePhone(v))}
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={10}
          />
          <BrandButton title="Enviar código" onPress={sendCode} loading={submitting} />
        </>
      ) : (
        <>
          <TextField
            label="Código"
            placeholder="123456"
            value={code}
            onChangeText={(v) => setCode(v.replace(/\s/g, ''))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={10}
          />
          <BrandButton title="Ver mis pedidos" onPress={verify} loading={submitting} />
          <TextLink label="Cambiar teléfono" muted onPress={() => setStep('phone')} />
        </>
      )}
      <TextLink
        prefix="¿Tienes cuenta?"
        label="Inicia sesión"
        onPress={() => router.push('/login')}
      />
    </FormCard>
  );
}

export default function OrdersScreen() {
  const { colors } = useBrandTheme();
  const { status } = useAuth();
  const signedIn = status === 'authenticated';
  const {
    data: orders,
    error,
    refreshing,
    stale,
    reload,
    refresh,
  } = useCachedResource<OrderSummary[]>('my-orders', getMyOrders, { enabled: signedIn });

  return (
    <BrandScreen refreshing={refreshing} onRefresh={signedIn ? refresh : undefined}>
      <BrandTitle lead="Mis" accent="pedidos" />
      {signedIn && <OfflineBanner stale={stale} onRetry={reload} />}
      {status === 'loading' ? (
        <ActivityIndicator color={Brand.orange} size="large" />
      ) : !signedIn ? (
        <GuestLookup />
      ) : (
        <FormCard accent="green-orange">
          {!!error && <FormMessage type="error">{error}</FormMessage>}
          {orders === null && !error && <ActivityIndicator color={Brand.orange} />}
          {orders && orders.length > 0 && (
            <>
              <Text style={[styles.text, { color: colors.textSecondary }]}>
                Total: <Text style={{ color: Brand.orange }}>{orders.length}</Text> pedidos · toca uno
                para ver su estado
              </Text>
              <OrdersList orders={orders} />
            </>
          )}
          {orders && orders.length === 0 && (
            <>
              <Text style={[styles.text, { color: colors.textSecondary }]}>Aún no tienes pedidos.</Text>
              <BrandButton title="Ver el menú" onPress={() => router.navigate('/')} />
            </>
          )}
        </FormCard>
      )}
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
  cardTitle: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 20,
  },
  text: {
    fontFamily: BrandFonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
});
