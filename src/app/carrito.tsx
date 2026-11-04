import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatMoney } from '@/domain/money';
import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { FormCard } from '@/components/brand/form-card';
import { FormMessage } from '@/components/brand/form-message';
import { OfflineBanner } from '@/components/brand/offline-banner';
import { PageHero } from '@/components/brand/page-hero';
import { SkewButton } from '@/components/brand/skew-button';
import { AlcoholNotice } from '@/components/legal/alcohol-notice';
import { CartLine } from '@/components/order/cart-line';
import { ProductDetailSheet } from '@/components/menu/product-detail-sheet';
import { BrandFonts, Radius } from '@/constants/brand';
import { isAlcoholic, requiresAdult } from '@/domain/checkout-rules';
import { useAuth } from '@/hooks/use-auth';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useCart } from '@/hooks/use-cart';
import { useRecommendations } from '@/hooks/use-content';
import { useIsOffline } from '@/hooks/use-connectivity';
import { useStorePolicy } from '@/hooks/use-store-policy';
import type { Product } from '@/types/product';
import { menuImage } from '@/utils/image-source';

function EmptyCart() {
  const { colors } = useBrandTheme();
  return (
    <FormCard>
      <View style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <SymbolView name={{ ios: 'cart', android: 'shopping_cart', web: 'shopping_cart' }} size={40} tintColor={colors.textSecondary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Carrito vacío</Text>
        <Text style={[styles.text, styles.center, { color: colors.textSecondary }]}>
          Aún no has agregado nada delicioso a tu pedido.
        </Text>
        <SkewButton title="Ver menú" onPress={() => router.navigate('/')} />
      </View>
    </FormCard>
  );
}

/** Suggestions (popular, or from the customer's past orders) — hidden if none. */
function Recommendations({ onPick }: { onPick: (product: Product) => void }) {
  const { colors } = useBrandTheme();
  const cart = useCart();
  const { items, personalized } = useRecommendations(
    cart.items.map((i) => i.product.id).filter((id): id is number => id !== null),
  );

  if (items.length === 0) return null;

  return (
    <FormCard accent="green-orange">
      <Text style={[styles.cardTitle, { color: colors.text }]}>
        {personalized ? 'Basado en tus pedidos anteriores' : 'Popular entre nuestros visitantes'}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recoList}>
        {items.map((product) => (
          <View key={product.key} style={[styles.reco, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {product.image && <Image source={menuImage(product.image)} style={styles.recoImage} contentFit="cover" />}
            <Text style={[styles.recoName, { color: colors.text }]} numberOfLines={1}>
              {product.name}
            </Text>
            <Text style={[styles.recoPrice, { color: colors.success }]}>{formatMoney(product.price)}</Text>
            <BrandButton title="Agregar" onPress={() => onPick(product)} style={styles.recoButton} />
          </View>
        ))}
      </ScrollView>
    </FormCard>
  );
}

export default function CartScreen() {
  const { colors } = useBrandTheme();
  const cart = useCart();
  const { status } = useAuth();
  const [customizing, setCustomizing] = useState<Product | null>(null);
  const policy = useStorePolicy();
  const withAlcohol = requiresAdult(cart.items);
  // Licence hours or dry law: drinks with alcohol can't be sent now (M-23).
  const alcoholClosed = withAlcohol && !policy.alcohol.salesOpen;
  const removeAlcohol = () => cart.items.filter(isAlcoholic).forEach((item) => cart.remove(item.lineId));
  // Checkout needs each item's server id; warn here instead of failing after the form.
  const notOrderable = cart.items.filter((item) => item.product.id === null);
  // The cart works offline (it's saved on the device); paying needs a connection.
  const offline = useIsOffline();

  return (
    <BrandScreen showBack contentStyle={styles.content}>
      <PageHero
        tag="La 501 Sports · Pedido"
        lead="Tu"
        accent="orden"
        description="Revisa tu pedido antes de proceder al pago"
      />
      <View style={styles.body}>
        <OfflineBanner />
        {cart.items.length === 0 ? (
          <EmptyCart />
        ) : (
          <FormCard>
            <View>
              {cart.items.map((item) => (
                <CartLine key={item.lineId} item={item} />
              ))}
            </View>

            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total de tus productos</Text>
              <Text style={[styles.total, { color: colors.text }]}>
                <Text style={{ color: colors.accent }}>$</Text>
                {formatMoney(cart.total).slice(1)}
              </Text>
            </View>
            <Text style={[styles.promoNote, { color: colors.text }]}>No incluye el envío: lo cobra el repartidor al entregar.</Text>
            {cart.items.some((item) => item.product.price === 0 && !!item.product.priceLabel) && (
              <Text style={[styles.promoNote, { color: colors.textSecondary }]}>
                + promociones: su precio se suma al confirmar tu pedido.
              </Text>
            )}

            {status !== 'authenticated' && (
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push('/login')}
                style={styles.pointsNotice}>
                <SymbolView name={{ ios: 'info.circle', android: 'info', web: 'info' }} size={18} tintColor={colors.warning} />
                <Text style={[styles.pointsText, { color: colors.warning }]}>
                  <Text style={styles.pointsLink}>Inicia sesión</Text> para acumular puntos con esta compra.
                </Text>
              </Pressable>
            )}

            {withAlcohol && <AlcoholNotice legend={policy.alcohol.legend} />}

            {alcoholClosed && (
              <View style={styles.closed}>
                <FormMessage type="info">{policy.alcohol.closedMessage}</FormMessage>
                <BrandButton title="Quitar bebidas con alcohol" variant="secondary" onPress={removeAlcohol} />
              </View>
            )}

            {notOrderable.length > 0 && (
              <FormMessage type="error">
                {`Por ahora no se puede pedir desde la app: ${notOrderable
                  .map((item) => item.product.name)
                  .join(', ')}. Quítalo o intenta más tarde.`}
              </FormMessage>
            )}

            <View style={styles.actions}>
              <BrandButton title="Vaciar" variant="secondary" onPress={cart.clear} style={styles.flex1} />
              <BrandButton
                title={offline ? 'Sin conexión' : 'Proceder al pago'}
                variant="action"
                icon={
                  offline
                    ? { ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' }
                    : { ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }
                }
                onPress={() => router.push('/checkout')}
                disabled={notOrderable.length > 0 || offline || alcoholClosed}
                style={styles.flex2}
              />
            </View>
          </FormCard>
        )}

        <Recommendations onPick={setCustomizing} />
      </View>

      <ProductDetailSheet
        product={customizing}
        onClose={() => setCustomizing(null)}
        alcohol={policy.alcohol}
        onAdd={(product, excluded, notes, _quantity, selection) => cart.add(product, { excluded, notes, selection })}
      />
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
  closed: {
    gap: 10,
  },
  content: {
    padding: 0,
    paddingTop: 0,
  },
  body: {
    padding: 16,
    gap: 20,
  },
  empty: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 24,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: Radius.lg + 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: BrandFonts.display,
    fontSize: 46,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  text: {
    fontFamily: BrandFonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  center: {
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoNote: {
    marginTop: -8,
    fontFamily: BrandFonts.body,
    fontSize: 13,
    textAlign: 'right',
  },
  totalLabel: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 15,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  total: {
    fontFamily: BrandFonts.display,
    fontSize: 44,
  },
  pointsNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#FACC1555',
    backgroundColor: '#FACC1514',
  },
  pointsText: {
    flex: 1,
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 14,
  },
  pointsLink: {
    fontFamily: BrandFonts.bodyBold,
    textDecorationLine: 'underline',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 2,
  },
  cardTitle: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 20,
  },
  recoList: {
    gap: 12,
  },
  reco: {
    width: 170,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 10,
    gap: 6,
  },
  recoImage: {
    width: '100%',
    aspectRatio: 1.4,
    borderRadius: Radius.sm,
  },
  recoName: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 15,
  },
  recoPrice: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 15,
  },
  recoButton: {
    minHeight: 40,
  },
});
