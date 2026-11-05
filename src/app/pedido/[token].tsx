import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import type { Tracking } from '@/api/account';
import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { FormCard } from '@/components/brand/form-card';
import { FormMessage } from '@/components/brand/form-message';
import { TextLink } from '@/components/brand/text-link';
import { ProviderCard } from '@/components/legal/provider-card';
import { HoursNotice } from '@/components/order/hours-notice';
import { InvoiceCard } from '@/components/order/invoice-card';
import { OrderTicket } from '@/components/order/order-ticket';
import { Brand, BrandFonts } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { FINAL_STATUSES, useOrderTracking } from '@/hooks/use-order-tracking';
import { useStorePolicy } from '@/hooks/use-store-policy';

const CARD_NOT_CONFIRMED =
  'Tu pago con tarjeta no se ha confirmado, así que tu pedido todavía no se envía a cocina. ' +
  'Si ya pagaste, espera unos minutos; no vuelvas a pagar.';

function refundMessage(tracking: Tracking) {
  if (tracking.refundStatus === 'refunded') {
    return 'Te devolvimos el pago a tu tarjeta; según tu banco puede tardar de 5 a 10 días hábiles en verse.';
  }
  if (tracking.refundStatus === 'manual') {
    return 'Haremos la devolución en máximo 5 días hábiles; si no la ves, contáctanos.';
  }
  return null;
}

export default function OrderTrackingScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { colors } = useBrandTheme();
  const policy = useStorePolicy();
  const { tracking, error, cancelling, cancel: cancelOrder, print } = useOrderTracking(token);

  const cancel = () => {
    Alert.alert(
      '¿Cancelar tu pedido?',
      tracking?.paymentMethod === 'tarjeta' ? 'Si pagaste con tarjeta te devolvemos el dinero.' : 'Tu pedido no se preparará.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: cancelOrder,
        },
      ],
    );
  };

  const cardNotConfirmed =
    tracking?.paymentMethod === 'tarjeta' && (tracking.status === 'pending' || tracking.status === 'failed');
  const refund = tracking ? refundMessage(tracking) : null;
  const waitingToStart = tracking?.status === 'pending' || tracking?.status === 'paid';

  return (
    <BrandScreen showBack>
      {!!error && <FormMessage type="error">{error}</FormMessage>}
      {!tracking && !error && <ActivityIndicator color={Brand.orange} size="large" />}
      {tracking && (
        <FormCard>
          {cardNotConfirmed && (
            <FormMessage type={tracking.status === 'failed' ? 'error' : 'info'}>
              {tracking.status === 'failed' ? `Mercado Pago rechazó el pago. ${CARD_NOT_CONFIRMED}` : CARD_NOT_CONFIRMED}
            </FormMessage>
          )}
          {tracking.status === 'cancelled' && (
            <>
              <FormMessage type="error">Este pedido fue cancelado.</FormMessage>
              {!!refund && <FormMessage type="info">{refund}</FormMessage>}
            </>
          )}

          <OrderTicket tracking={tracking} />

          {waitingToStart && <HoursNotice context="order" />}

          {tracking.canCancel && tracking.status !== 'cancelled' && (
            <BrandButton title="Cancelar pedido" variant="danger" onPress={cancel} loading={cancelling} />
          )}

          {!FINAL_STATUSES.includes(tracking.status) && (
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Esta pantalla se actualiza sola. Te avisamos con una notificación cuando tu pedido salga de cocina y
              vaya en camino.
            </Text>
          )}

          <View style={styles.actions}>
            <BrandButton title="Imprimir ticket" variant="secondary" onPress={print} style={styles.action} />
            <BrandButton title="Volver al menú" onPress={() => router.navigate('/')} style={styles.action} />
          </View>
          <View style={styles.center}>
            <TextLink label="Ver mis pedidos anteriores" onPress={() => router.navigate('/pedidos')} />
          </View>

          {tracking.status === 'delivered' && !!tracking.folio && (
            <InvoiceCard folio={tracking.folio} instructions={policy.invoice.instructions} email={policy.invoice.email} />
          )}
          <ProviderCard provider={policy.provider} />
        </FormCard>
      )}
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
  },
  hint: {
    fontFamily: BrandFonts.body,
    fontSize: 12,
    textAlign: 'center',
  },
});
