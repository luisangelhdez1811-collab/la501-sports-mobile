import { Redirect, router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError, errorMessage } from '@/api/client';
import { DEFAULT_POLICY, getCheckoutPolicy, type CheckoutPolicy } from '@/api/info';
import { checkout, type CheckoutResult, type PaymentMethod } from '@/api/orders';
import { formatMoney } from '@/components/account/orders-list';
import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { Checkbox } from '@/components/brand/checkbox';
import { FormCard } from '@/components/brand/form-card';
import { FormMessage } from '@/components/brand/form-message';
import { OfflineBanner } from '@/components/brand/offline-banner';
import { PageHero } from '@/components/brand/page-hero';
import { TextLink } from '@/components/brand/text-link';
import { TextField } from '@/components/brand/text-field';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { hasNotes, missingConsent, requiresAdult } from '@/domain/checkout-rules';
import { useAuth } from '@/hooks/use-auth';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useCart } from '@/hooks/use-cart';
import { useIsOffline } from '@/hooks/use-connectivity';
import { isEmail, isPhone, normalizePhone } from '@/utils/validation';

type Errors = Partial<Record<'name' | 'phone' | 'email' | 'address' | 'payment' | 'delivery', string>>;

function SectionTitle({ icon, children }: { icon: SymbolViewProps['name']; children: string }) {
  const { colors } = useBrandTheme();
  return (
    <View style={styles.sectionTitle}>
      <View style={[styles.sectionIcon, { borderColor: `${Brand.orange}55`, backgroundColor: `${Brand.orange}14` }]}>
        <SymbolView name={icon} size={18} tintColor={Brand.orange} />
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
  const cart = useCart();
  const { user } = useAuth();
  const offline = useIsOffline();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [address, setAddress] = useState('');
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [deliveryTerms, setDeliveryTerms] = useState(false);
  const [adult, setAdult] = useState(false);
  const [healthConsent, setHealthConsent] = useState(false);
  // The server found alcohol the app didn't (e.g. in a promotion): ask for 18+ anyway.
  const [serverWantsAdult, setServerWantsAdult] = useState(false);
  const [policy, setPolicy] = useState<CheckoutPolicy>(DEFAULT_POLICY);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // How delivery is charged and whether card payments are on come from the server.
  useEffect(() => {
    const controller = new AbortController();
    getCheckoutPolicy(controller.signal)
      .then(setPolicy)
      .catch(() => {}); // offline or older server: the defaults stay
    return () => controller.abort();
  }, []);

  // Nothing to pay for (e.g. back-navigation after the order was placed).
  if (cart.items.length === 0 && !submitting) return <Redirect href="/carrito" />;

  // Card payments paused after it was picked: it no longer counts as chosen.
  const method = payment === 'tarjeta' && !policy.cardPayments ? null : payment;
  const adultRequired = requiresAdult(cart.items) || serverWantsAdult;
  const notesWritten = hasNotes(cart.items);

  const validate = (): Errors => {
    const next: Errors = {};
    if (name.trim().length < 3) next.name = 'Escribe tu nombre completo.';
    if (!isPhone(phone)) next.phone = 'El teléfono debe tener 10 dígitos.';
    if (email.trim() && !isEmail(email)) next.email = 'Correo electrónico no válido.';
    if (address.trim().length < 10) next.address = 'Escribe calle, número, colonia y una referencia.';
    if (!method) next.payment = 'Elige cómo vas a pagar.';
    if (!deliveryTerms) next.delivery = 'Confirma que leíste cómo se cobra el envío.';
    return next;
  };

  const send = (clientRef: string) =>
    checkout({
      items: cart.items,
      name,
      phone,
      address,
      email,
      paymentMethod: method!,
      clientRef,
      deliveryTermsAccepted: deliveryTerms,
      adultConfirmed: adultRequired && adult,
      healthDataConsent: notesWritten && healthConsent,
    });

  const finish = async (result: CheckoutResult) => {
    const track = () => router.replace({ pathname: '/pedido/[token]', params: { token: result.trackingToken } });
    if (result.paymentMethod !== 'tarjeta') {
      // Cash: the order is placed as soon as the server answers.
      cart.clear();
      return track();
    }
    // Card: the cart stays until tracking sees the payment confirmed, so a rejected or
    // abandoned payment can be retried with the same reference (no second order).
    cart.holdForPayment(result.trackingToken);
    if (result.checkoutUrl && !result.duplicate) {
      // The bank's page opens in the system browser (Chrome Custom Tabs / Safari), never a
      // WebView: the customer sees the real address and the app can't read card data.
      await WebBrowser.openBrowserAsync(result.checkoutUrl, { dismissButtonStyle: 'close', showTitle: true });
    }
    track();
  };

  const submit = async () => {
    // Checkout needs the server id of every item.
    if (cart.items.some((item) => item.product.id === null)) {
      return setFormError('Algunos productos aún no se pueden pedir desde la app. Intenta más tarde o pide por teléfono.');
    }
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return setFormError(next.delivery && Object.keys(next).length === 1 ? next.delivery : 'Revisa los campos marcados.');
    const missing = missingConsent(
      cart.items,
      { deliveryTermsAccepted: deliveryTerms, adultConfirmed: adult, healthDataConsent: healthConsent },
      adultRequired,
    );
    if (missing) return setFormError(missing);

    setFormError(null);
    setSubmitting(true);
    try {
      let result: CheckoutResult;
      try {
        result = await send(cart.clientRef());
      } catch (err) {
        // The reference belongs to another account (very unlikely): a new one, once.
        if (!(err instanceof ApiError && err.code === 'duplicate_reference')) throw err;
        result = await send(cart.renewClientRef());
      }
      await finish(result);
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiError && err.code === 'confirmation_required' && /18/.test(err.message)) {
        setServerWantsAdult(true);
        return setFormError(err.message);
      }
      if (err instanceof ApiError && err.code === 'mercadopago_unavailable') {
        return setFormError('Mercado Pago no respondió. Intenta de nuevo en un momento o paga en efectivo.');
      }
      if (err instanceof ApiError && err.code === 'item_unavailable') {
        return Alert.alert('Revisa tu carrito', err.message, [{ text: 'Ir al carrito', onPress: () => router.back() }]);
      }
      setFormError(errorMessage(err));
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
          {!!formError && <FormMessage type="error">{formError}</FormMessage>}

          <SectionTitle icon={{ ios: 'person', android: 'person', web: 'person' }}>Datos de contacto</SectionTitle>
          <TextField
            label="Nombre completo"
            required
            placeholder="Juan Pérez"
            value={name}
            onChangeText={setName}
            autoComplete="name"
            textContentType="name"
            error={errors.name}
          />
          <TextField
            label="Teléfono"
            required
            placeholder="10 dígitos"
            value={phone}
            onChangeText={(v) => setPhone(normalizePhone(v))}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={10}
            error={errors.phone}
          />
          <TextField
            label="Correo (opcional)"
            placeholder="tucorreo@ejemplo.com"
            value={email}
            onChangeText={setEmail}
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
            value={address}
            onChangeText={setAddress}
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
              selected={method === 'efectivo'}
              onPress={() => setPayment('efectivo')}
            />
            <PaymentOption
              emoji="💳"
              title="Tarjeta"
              subtitle={
                policy.cardPayments ? 'Débito o crédito · pago seguro en Mercado Pago' : 'No disponible por ahora · paga en efectivo'
              }
              selected={method === 'tarjeta'}
              disabled={!policy.cardPayments}
              onPress={() => setPayment('tarjeta')}
            />
          </View>
          {!!errors.payment && <Text style={styles.error}>{errors.payment}</Text>}

          <View style={[styles.totalBox, { backgroundColor: colors.background }]}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total de tus productos</Text>
            <Text style={[styles.total, { color: colors.text }]}>
              <Text style={{ color: colors.accent }}>$</Text>
              {formatMoney(cart.total).slice(1)}
            </Text>
            <Text style={[styles.note, { color: colors.text }]}>{policy.feeNote}</Text>
          </View>

          <View style={styles.consents}>
            <Checkbox
              checked={deliveryTerms}
              onChange={(v) => {
                setDeliveryTerms(v);
                if (v) setErrors((e) => ({ ...e, delivery: undefined }));
              }}
              accessibilityLabel="Entiendo que el envío no está incluido en este total y que lo cobra el repartidor al entregar">
              Entiendo que el envío no está incluido en este total y que lo cobra el repartidor al entregar.
            </Checkbox>
            {!!errors.delivery && <Text style={styles.error}>{errors.delivery}</Text>}

            {adultRequired && (
              <Checkbox
                checked={adult}
                onChange={setAdult}
                accessibilityLabel="Confirmo que soy mayor de 18 años y que mostraré una identificación oficial al recibir">
                Mi pedido lleva bebidas con alcohol. Confirmo que soy mayor de 18 años y que mostraré una identificación
                oficial al recibirlo.
              </Checkbox>
            )}

            {notesWritten && (
              <Checkbox
                checked={healthConsent}
                onChange={setHealthConsent}
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
            loading={submitting}
            disabled={offline || submitting}
          />
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
    color: Brand.red,
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
