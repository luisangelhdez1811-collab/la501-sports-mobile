import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { OrdersList } from '@/components/account/orders-list';
import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { OfflineBanner } from '@/components/brand/offline-banner';
import { FormCard } from '@/components/brand/form-card';
import { FormMessage } from '@/components/brand/form-message';
import { TextLink } from '@/components/brand/text-link';
import { TextField } from '@/components/brand/text-field';
import { BrandTitle } from '@/components/brand/typography';
import { CodeField, ResendCode } from '@/components/verification/code-input';
import { Brand, BrandFonts } from '@/constants/brand';
import { useAuth } from '@/hooks/use-auth';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useGuestOrderLookup, useMyOrders } from '@/hooks/use-orders';
import { normalizePhone } from '@/utils/validation';

/** Guests find their orders with the phone used at checkout plus a one-time code. */
function GuestLookup() {
  const { colors } = useBrandTheme();
  const lookup = useGuestOrderLookup();
  const { phone, step } = lookup;

  if (step === 'results') {
    return (
      <FormCard accent="green-orange">
        <Text style={[styles.cardTitle, { color: colors.text }]}>Pedidos de {phone}</Text>
        {lookup.orders.length > 0 ? (
          <OrdersList orders={lookup.orders} />
        ) : (
          <Text style={[styles.text, { color: colors.textSecondary }]}>
            No encontramos pedidos con este teléfono.
          </Text>
        )}
        <TextLink
          label="Consultar otro teléfono"
          muted
          onPress={lookup.changePhone}
        />
      </FormCard>
    );
  }

  return (
    <FormCard icon={{ ios: 'bag', android: 'receipt_long', web: 'receipt_long' }} title="Consulta tu pedido">
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        {step === 'phone'
          ? 'Escribe el teléfono con el que hiciste tu pedido y te enviaremos un código.'
          : `Escribe el código que enviamos por SMS al ${phone}.`}
      </Text>
      {!!lookup.error && <FormMessage type="error">{lookup.error}</FormMessage>}
      {!!lookup.notice && <FormMessage type="success">{lookup.notice}</FormMessage>}
      {step === 'phone' ? (
        <>
          <TextField
            label="Teléfono"
            placeholder="771 000 0000"
            value={phone}
            onChangeText={(v) => lookup.setPhone(normalizePhone(v))}
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={10}
          />
          <BrandButton title="Enviar código por SMS" onPress={lookup.sendCode} loading={lookup.submitting} />
        </>
      ) : (
        <>
          <CodeField value={lookup.code} onChange={lookup.setCode} />
          <BrandButton title="Ver mis pedidos" onPress={lookup.verify} loading={lookup.submitting} />
          <ResendCode remaining={lookup.cooldownRemaining} onResend={lookup.sendCode} />
          <TextLink
            label="Cambiar teléfono"
            muted
            onPress={lookup.changePhone}
          />
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
  } = useMyOrders(signedIn);

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
                Total: <Text style={{ color: colors.accent }}>{orders.length}</Text> pedidos · toca uno
                para ver su estado
              </Text>
              <OrdersList orders={orders} />
            </>
          )}
          {orders && orders.length === 0 && (
            <>
              <Text style={[styles.text, { color: colors.textSecondary }]}>Aún no tienes pedidos.</Text>
              <BrandButton title="Hacer un pedido" onPress={() => router.navigate('/')} />
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
