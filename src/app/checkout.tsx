import { Redirect, router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatMoney } from '@/domain/money';
import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { Checkbox } from '@/components/brand/checkbox';
import { FormCard } from '@/components/brand/form-card';
import { FormMessage } from '@/components/brand/form-message';
import { OfflineBanner } from '@/components/brand/offline-banner';
import { PageHero } from '@/components/brand/page-hero';
import { TextLink } from '@/components/brand/text-link';
import { TextField } from '@/components/brand/text-field';
import { AlcoholNotice } from '@/components/legal/alcohol-notice';
import { ProviderCard } from '@/components/legal/provider-card';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useCheckout } from '@/hooks/use-checkout';
import { useIsOffline } from '@/hooks/use-connectivity';
import { normalizePhone } from '@/utils/validation';

function SectionTitle({ icon, children }: { icon: SymbolViewProps['name']; children: string }) {
  const { colors } = useBrandTheme();
  return (
    <View style={styles.sectionTitle}>
      <View style={[styles.sectionIcon, { borderColor: `${Brand.orange}55`, backgroundColor: `${Brand.orange}14` }]}>
        <SymbolView name={icon} size={18} tintColor={colors.accent} />
      </View>
      <Text style={[styles.sectionText, { color: colors.text }]}>{children}</Text>
    </View>
  );
}

function PaymentOption({
  emoji,
  title,
  subtitle,
  selected,
  disabled = false,
  onPress,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useBrandTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.payment,
        { backgroundColor: colors.background, borderColor: selected ? Brand.orange : colors.border },
        disabled && styles.disabled,
      ]}>
      <View style={[styles.paymentIcon, { backgroundColor: colors.surface }]}>
        <Text style={styles.paymentEmoji}>{emoji}</Text>
      </View>
      <View style={styles.paymentText}>
        <Text style={[styles.paymentTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.paymentSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
      <View style={[styles.radio, { borderColor: selected ? Brand.orange : colors.border }]}>
        {selected && <View style={styles.radioDot} />}
      </View>
    </Pressable>
  );
}

export default function CheckoutScreen() {
  const { colors } = useBrandTheme();
  const offline = useIsOffline();
  const checkout = useCheckout();
  const { form, consents, errors, policy } = checkout;

  // Nothing to pay for (e.g. back-navigation after the order was placed).
  if (checkout.items.length === 0 && !checkout.submitting) return <Redirect href="/carrito" />;

  const submit = async () => {
    const outcome = await checkout.submit();
    if (outcome.kind === 'item_unavailable') {
      Alert.alert('Revisa tu carrito', outcome.message, [{ text: 'Ir al carrito', onPress: () => router.back() }]);
    } else if (outcome.kind === 'alcohol_closed') {
      Alert.alert('Venta de alcohol cerrada', outcome.message, [
        { text: 'Volver', style: 'cancel' },
        { text: 'Quitar bebidas con alcohol', onPress: checkout.removeAlcohol },
      ]);
    }
  };

  return (
    <BrandScreen showBack contentStyle={styles.content}>
      <PageHero
        tag="La 501 Sports · Checkout"
        lead="Finalizar"
        accent="pedido"
        description="Ingresa tus datos para la entrega a domicilio"
      />
      <View style={styles.body}>
        <TextLink label="‹ Volver al carrito" muted onPress={() => router.back()} />
        <OfflineBanner />

        <FormCard>
          {!!checkout.formError && <FormMessage type="error">{checkout.formError}</FormMessage>}

          <SectionTitle icon={{ ios: 'person', android: 'person', web: 'person' }}>Datos de contacto</SectionTitle>
          <TextField
            label="Nombre completo"
            required
            placeholder="Juan Pérez"
            value={form.name}
            onChangeText={form.setName}
            autoComplete="name"
            textContentType="name"
            error={errors.name}
          />
          <TextField
            label="Teléfono"
            required
            placeholder="10 dígitos"
            value={form.phone}
            onChangeText={(v) => form.setPhone(normalizePhone(v))}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={10}
            error={errors.phone}
          />
          <TextField
            label="Correo (opcional)"
            placeholder="tucorreo@ejemplo.com"
            value={form.email}
            onChangeText={form.setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            hint="Te avisamos por aquí cuando tu pedido esté listo y vaya en camino."
            error={errors.email}
          />

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SectionTitle icon={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }}>
            Dirección de entrega
          </SectionTitle>
          <TextField
            label="Calle, número, colonia y referencia"
            required
            placeholder="Ej: Av. Principal 123, Col. Centro. Casa blanca con portón negro."
            value={form.address}
            onChangeText={form.setAddress}
            multiline
            maxLength={300}
            autoComplete="street-address"
            textContentType="fullStreetAddress"
            error={errors.address}
          />

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SectionTitle icon={{ ios: 'creditcard', android: 'credit_card', web: 'credit_card' }}>Método de pago</SectionTitle>
          <View style={styles.payments} accessibilityRole="radiogroup">
            <PaymentOption
              emoji="💵"
              title="Efectivo"
              subtitle="Al recibir"
              selected={checkout.method === 'efectivo'}
              onPress={() => checkout.choosePayment('efectivo')}
            />
            <PaymentOption
              emoji="💳"
              title="Tarjeta"
              subtitle={
                policy.cardPayments ? 'Débito o crédito · pago seguro en Mercado Pago' : 'No disponible por ahora · paga en efectivo'
              }
              selected={checkout.method === 'tarjeta'}
              disabled={!policy.cardPayments}
              onPress={() => checkout.choosePayment('tarjeta')}
            />
          </View>
          {!!errors.payment && <Text style={[styles.error, { color: colors.danger }]}>{errors.payment}</Text>}

          <View style={[styles.totalBox, { backgroundColor: colors.background }]}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total de tus productos</Text>
            <Text style={[styles.total, { color: colors.text }]}>
              <Text style={{ color: colors.accent }}>$</Text>
              {formatMoney(checkout.total).slice(1)}
            </Text>
            <Text style={[styles.note, { color: colors.text }]}>{policy.feeNote}</Text>
          </View>

          {checkout.withAlcohol && <AlcoholNotice legend={policy.alcohol.legend} />}

          <View style={styles.consents}>
            <Checkbox
              checked={consents.deliveryTerms}
              onChange={consents.setDeliveryTerms}
              accessibilityLabel="Entiendo que el envío no está incluido en este total y que lo cobra el repartidor al entregar">
              Entiendo que el envío no está incluido en este total y que lo cobra el repartidor al entregar.
            </Checkbox>
            {!!errors.delivery && <Text style={[styles.error, { color: colors.danger }]}>{errors.delivery}</Text>}

            {checkout.adultRequired && (
              <Checkbox
                checked={consents.adult}
                onChange={consents.setAdult}
                accessibilityLabel="Confirmo que soy mayor de 18 años y que mostraré una identificación oficial al recibir">
                Mi pedido lleva bebidas con alcohol. Confirmo que soy mayor de 18 años y que mostraré una identificación
                oficial al recibirlo.
              </Checkbox>
            )}

            {checkout.notesWritten && (
              <Checkbox
                checked={consents.healthConsent}
                onChange={consents.setHealthConsent}
                accessibilityLabel="Autorizo que mis notas se usen solo para preparar mi pedido">
                Si mis notas incluyen alergias u otra información de salud, autorizo que se usen solo para preparar mi
                pedido.
              </Checkbox>
            )}
          </View>

          <BrandButton
            title={offline ? 'Sin conexión' : 'Confirmar pedido'}
            variant="action"
            icon={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }}
            onPress={submit}
            loading={checkout.submitting}
            disabled={offline || checkout.submitting}
          />

          {/* Before paying: who sells and how to complain (LFPC art. 76 Bis III). */}
          <ProviderCard provider={policy.provider} />
        </FormCard>
      </View>
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 0,
    paddingTop: 0,
  },
  body: {
    padding: 16,
    gap: 16,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionText: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 18,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  payments: {
    gap: 12,
  },
  payment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderWidth: 1.5,
    borderRadius: Radius.md,
  },
  disabled: {
    opacity: 0.5,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentEmoji: {
    fontSize: 24,
  },
  paymentText: {
    flex: 1,
    gap: 2,
  },
  paymentTitle: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 17,
  },
  paymentSubtitle: {
    fontFamily: BrandFonts.body,
    fontSize: 13,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Brand.orangeFill,
  },
  error: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 13,
  },
  note: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  totalBox: {
    borderRadius: Radius.md,
    padding: 18,
    gap: 2,
  },
  totalLabel: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 14,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  total: {
    fontFamily: BrandFonts.display,
    fontSize: 48,
  },
  consents: {
    gap: 14,
  },
});
