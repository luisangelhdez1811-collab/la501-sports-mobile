import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { cancelOrder, trackOrder, type OrderStatus, type Tracking } from '@/api/account';
import { errorMessage } from '@/api/client';
import { formatMoney } from '@/components/account/orders-list';
import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { FormCard } from '@/components/brand/form-card';
import { FormMessage } from '@/components/brand/form-message';
import { StatusBadge } from '@/components/brand/status-badge';
import { BrandTitle } from '@/components/brand/typography';
import { Brand, BrandFonts } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useCart } from '@/hooks/use-cart';

const POLL_MS = 10000;

const STEPS: { status: OrderStatus; label: string; emoji: string }[] = [
  { status: 'pending', label: 'Pendiente', emoji: '🧾' },
  { status: 'paid', label: 'Confirmado', emoji: '✔️' },
  { status: 'preparing', label: 'En preparación', emoji: '👨‍🍳' },
  { status: 'ready', label: 'Listo', emoji: '🍔' },
  { status: 'delivering', label: 'En camino', emoji: '🛵' },
  { status: 'delivered', label: 'Entregado', emoji: '✅' },
];

// Nothing else will change once the order gets here.
const FINAL: OrderStatus[] = ['delivered', 'cancelled'];
// The restaurant has it: a card payment went through (or it's cash).
const CONFIRMED: OrderStatus[] = ['paid', 'preparing', 'ready', 'delivering', 'delivered'];

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
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const { paymentConfirmed } = useCart();
  const status = tracking?.status;

  // A card order keeps the cart until its payment is confirmed (then it can go).
  useEffect(() => {
    if (status && CONFIRMED.includes(status)) paymentConfirmed(token);
  }, [status, token, paymentConfirmed]);

  // Refreshes every few seconds until the order is delivered or cancelled; stops on leaving.
  useEffect(() => {
    let controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = () => {
      controller = new AbortController();
      trackOrder(token, controller.signal)
        .then((data) => {
          setTracking(data);
          setError(null);
          if (!FINAL.includes(data.status)) timer = setTimeout(load, POLL_MS);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setError(errorMessage(err));
          timer = setTimeout(load, POLL_MS * 3);
        });
    };
    load();

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [token, reloadKey]);

  const cancel = () => {
    Alert.alert(
      '¿Cancelar tu pedido?',
      tracking?.paymentMethod === 'tarjeta' ? 'Si pagaste con tarjeta te devolvemos el dinero.' : 'Tu pedido no se preparará.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              setTracking(await cancelOrder(token));
              setError(null);
            } catch (err) {
              setError(errorMessage(err));
            } finally {
              setCancelling(false);
              // The server's answer may be partial: read the order again.
              setReloadKey((k) => k + 1);
            }
          },
        },
      ],
    );
  };

  const currentIndex = tracking ? STEPS.findIndex((s) => s.status === tracking.status) : -1;
  const cardNotConfirmed =
    tracking?.paymentMethod === 'tarjeta' && (tracking.status === 'pending' || tracking.status === 'failed');
  const refund = tracking ? refundMessage(tracking) : null;

  return (
    <BrandScreen showBack>
      <BrandTitle lead="Tu" accent="pedido" />
      {!!error && <FormMessage type="error">{error}</FormMessage>}
      {!tracking && !error && <ActivityIndicator color={Brand.orange} size="large" />}
      {tracking && (
        <FormCard>
          <View style={styles.summary}>
            <View>
              {!!tracking.folio && <Text style={[styles.folio, { color: colors.text }]}>#{tracking.folio}</Text>}
              {tracking.total > 0 && (
                <Text style={[styles.total, { color: colors.textSecondary }]}>{formatMoney(tracking.total)}</Text>
              )}
            </View>
            <StatusBadge status={tracking.status} />
          </View>

          {cardNotConfirmed && (
            <FormMessage type={tracking.status === 'failed' ? 'error' : 'info'}>
              {tracking.status === 'failed' ? `Mercado Pago rechazó el pago. ${CARD_NOT_CONFIRMED}` : CARD_NOT_CONFIRMED}
            </FormMessage>
          )}

          {tracking.status === 'cancelled' ? (
            <>
              <FormMessage type="error">Este pedido fue cancelado.</FormMessage>
              {!!refund && <FormMessage type="info">{refund}</FormMessage>}
            </>
          ) : (
            <View style={styles.steps}>
              {STEPS.map((step, index) => {
                const done = index <= currentIndex;
                return (
                  <View key={step.status} style={styles.step}>
                    <View
                      style={[
                        styles.dot,
                        done ? { backgroundColor: Brand.orangeFill, borderColor: Brand.orange } : { borderColor: colors.border },
                      ]}>
                      <Text style={[styles.dotEmoji, !done && styles.dotPending]}>{step.emoji}</Text>
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        { color: done ? colors.text : colors.textSecondary },
                        index === currentIndex && { color: Brand.orange },
                      ]}>
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {tracking.canCancel && tracking.status !== 'cancelled' && (
            <BrandButton title="Cancelar pedido" variant="danger" onPress={cancel} loading={cancelling} />
          )}

          {!FINAL.includes(tracking.status) && (
            <Text style={[styles.hint, { color: colors.textSecondary }]}>Esta pantalla se actualiza sola.</Text>
          )}
        </FormCard>
      )}
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  folio: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 22,
  },
  total: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 15,
  },
  steps: {
    gap: 14,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotEmoji: {
    fontSize: 20,
  },
  dotPending: {
    opacity: 0.35,
  },
  stepLabel: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 17,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  hint: {
    fontFamily: BrandFonts.body,
    fontSize: 12,
    textAlign: 'center',
  },
});
