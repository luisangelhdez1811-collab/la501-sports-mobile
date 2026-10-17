import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { trackOrder, type OrderStatus } from '@/api/account';
import { errorMessage } from '@/api/client';
import { formatMoney } from '@/components/account/orders-list';
import { BrandScreen } from '@/components/brand/brand-screen';
import { FormCard } from '@/components/brand/form-card';
import { FormMessage } from '@/components/brand/form-message';
import { StatusBadge } from '@/components/brand/status-badge';
import { BrandTitle } from '@/components/brand/typography';
import { Brand, BrandFonts } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

const POLL_MS = 10000;

const STEPS: { status: OrderStatus; label: string; emoji: string }[] = [
  { status: 'pending', label: 'Recibido', emoji: '🧾' },
  { status: 'paid', label: 'Pagado', emoji: '💳' },
  { status: 'ready', label: 'Listo', emoji: '🍔' },
  { status: 'delivering', label: 'En camino', emoji: '🛵' },
  { status: 'delivered', label: 'Entregado', emoji: '✅' },
];

type Tracking = Awaited<ReturnType<typeof trackOrder>>;

export default function OrderTrackingScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { colors } = useBrandTheme();
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refreshes every few seconds until the order is delivered or cancelled.
  useEffect(() => {
    let controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = () => {
      controller = new AbortController();
      trackOrder(token, controller.signal)
        .then((data) => {
          setTracking(data);
          setError(null);
          if (data.status !== 'delivered' && data.status !== 'cancelled') {
            timer = setTimeout(load, POLL_MS);
          }
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
  }, [token]);

  const currentIndex = tracking ? STEPS.findIndex((s) => s.status === tracking.status) : -1;

  return (
    <BrandScreen showBack>
      <BrandTitle lead="Tu" accent="pedido" />
      {!!error && <FormMessage type="error">{error}</FormMessage>}
      {!tracking && !error && <ActivityIndicator color={Brand.orange} size="large" />}
      {tracking && (
        <FormCard>
          <View style={styles.summary}>
            <View>
              {!!tracking.folio && (
                <Text style={[styles.folio, { color: colors.text }]}>#{tracking.folio}</Text>
              )}
              {tracking.total > 0 && (
                <Text style={[styles.total, { color: colors.textSecondary }]}>
                  {formatMoney(tracking.total)}
                </Text>
              )}
            </View>
            <StatusBadge status={tracking.status} />
          </View>

          {tracking.status === 'cancelled' ? (
            <FormMessage type="error">Este pedido fue cancelado.</FormMessage>
          ) : (
            <View style={styles.steps}>
              {STEPS.map((step, index) => {
                const done = index <= currentIndex;
                return (
                  <View key={step.status} style={styles.step}>
                    <View
                      style={[
                        styles.dot,
                        done
                          ? { backgroundColor: Brand.orange, borderColor: Brand.orange }
                          : { borderColor: colors.border },
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
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Esta pantalla se actualiza sola.
          </Text>
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
