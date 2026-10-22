import { Redirect, router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { checkout, type PaymentMethod } from '@/api/orders';
import { formatMoney } from '@/components/account/orders-list';
import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { FormCard } from '@/components/brand/form-card';
import { FormMessage } from '@/components/brand/form-message';
import { OfflineBanner } from '@/components/brand/offline-banner';
import { PageHero } from '@/components/brand/page-hero';
import { TextLink } from '@/components/brand/text-link';
import { TextField } from '@/components/brand/text-field';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useAuth } from '@/hooks/use-auth';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useCart } from '@/hooks/use-cart';
import { useIsOffline } from '@/hooks/use-connectivity';
import { isEmail, isPhone, normalizePhone } from '@/utils/validation';

type Errors = Partial<Record<'name' | 'phone' | 'email' | 'address' | 'payment', string>>;

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
  onPress,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useBrandTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.payment,
        { backgroundColor: colors.background, borderColor: selected ? Brand.orange : colors.border },
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
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Nothing to pay for (e.g. back-navigation after the order was placed).
  if (cart.items.length === 0 && !submitting) return <Redirect href="/carrito" />;

  const validate = (): Errors => {
    const next: Errors = {};
    if (name.trim().length < 3) next.name = 'Escribe tu nombre completo.';
    if (!isPhone(phone)) next.phone = 'El teléfono debe tener 10 dígitos.';
    if (email.trim() && !isEmail(email)) next.email = 'Correo electrónico no válido.';
    if (address.trim().length < 10) next.address = 'Escribe calle, número, colonia y una referencia.';
    if (!payment) next.payment = 'Elige cómo vas a pagar.';
    return next;
  };

  const submit = async () => {
    // Checkout needs the server id of every item; /public/products doesn't send it yet.
    if (cart.items.some((item) => item.product.id === null)) {
      return setFormError(
        'Algunos productos aún no se pueden pedir desde la app. Intenta más tarde o pide por teléfono.',
      );
    }
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return setFormError('Revisa los campos marcados.');

    setFormError(null);
    setSubmitting(true);
    try {
      const result = await checkout({
        items: cart.items,
        name,
        phone,
        address,
        email,
        paymentMethod: payment!,
      });
      cart.clear();

      // The order already exists at this point, so any outcome continues to tracking.
      if (result.paymentMethod === 'tarjeta' && result.checkoutUrl) {
        // The bank's page opens in the system browser (Safari / Chrome Custom Tabs), not
        // in a WebView: the customer sees the real URL and the app can't read card data.
        await WebBrowser.openBrowserAsync(result.checkoutUrl, {
          dismissButtonStyle: 'close',
          showTitle: true,
        });
      }
      // Tracking polls the server, so it reflects the payment once the bank confirms it.
      router.replace({ pathname: '/pedido/[token]', params: { token: result.trackingToken } });
    } catch (err) {
      setFormError(errorMessage(err));
      setSubmitting(false);
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
          <SectionTitle icon={{ ios: 'creditcard', android: 'credit_card', web: 'credit_card' }}>
            Método de pago
          </SectionTitle>
          <View style={styles.payments} accessibilityRole="radiogroup">
            <PaymentOption
              emoji="💵"
              title="Efectivo"
              subtitle="Al recibir"
              selected={payment === 'efectivo'}
              onPress={() => setPayment('efectivo')}
            />
            <PaymentOption
              emoji="💳"
              title="Tarjeta"
              subtitle="Débito o crédito · pago seguro en línea"
              selected={payment === 'tarjeta'}
              onPress={() => setPayment('tarjeta')}
            />
          </View>
          {!!errors.payment && <Text style={styles.error}>{errors.payment}</Text>}

          <Text style={[styles.note, { color: colors.textSecondary }]}>
            Este total es solo del platillo. El costo del envío lo cobra el repartidor por separado al
            entregar tu pedido.
          </Text>

          <View style={[styles.totalBox, { backgroundColor: colors.background }]}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total a pagar</Text>
            <Text style={[styles.total, { color: colors.text }]}>
              <Text style={{ color: Brand.orange }}>$</Text>
              {formatMoney(cart.total).slice(1)}
            </Text>
            <Text style={[styles.note, styles.left, { color: colors.textSecondary }]}>
              El restaurante confirma el total final al recibir tu pedido.
            </Text>
          </View>

          <BrandButton
            title={offline ? 'Sin conexión' : 'Confirmar pedido'}
            variant="action"
            icon={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }}
            onPress={submit}
            loading={submitting}
            disabled={offline}
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
    backgroundColor: Brand.orange,
  },
  error: {
    color: Brand.red,
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 13,
  },
  note: {
    fontFamily: BrandFonts.body,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  left: {
    textAlign: 'left',
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
});
