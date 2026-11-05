import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { OfflineBanner } from '@/components/brand/offline-banner';
import { PageHero } from '@/components/brand/page-hero';
import { DividerLabel } from '@/components/brand/typography';
import { NewsletterCard } from '@/components/promo/newsletter-card';
import { PromoCarousel } from '@/components/promo/promo-carousel';
import { Brand, BrandFonts } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { usePromotions } from '@/hooks/use-content';
import { useCart } from '@/hooks/use-cart';
import { useStorePolicy } from '@/hooks/use-store-policy';

export default function PromotionsScreen() {
  const { colors } = useBrandTheme();
  const cart = useCart();
  const policy = useStorePolicy();
  const { data: promotions, error, refreshing, stale, reload, refresh } = usePromotions();

  return (
    <BrandScreen refreshing={refreshing} onRefresh={refresh} contentStyle={styles.content}>
      <PageHero
        align="center"
        size={46}
        tag="La 501 Sports Restaurant"
        lead="Promociones"
        accent="especiales"
        description="Ofertas vigentes del restaurante. Revisa la vigencia y las condiciones de cada una antes de pedir."
      />

      <View style={styles.body}>
        <OfflineBanner stale={stale} onRetry={reload} />
        <DividerLabel>Ofertas activas</DividerLabel>

        {promotions === null && !error && <ActivityIndicator color={Brand.orange} size="large" />}

        {!!error && (
          <View style={styles.status}>
            <Text style={[styles.statusTitle, { color: colors.text }]}>Ups…</Text>
            <Text style={[styles.text, { color: colors.textSecondary }]}>{error}</Text>
            <BrandButton title="Reintentar" onPress={reload} />
          </View>
        )}

        {promotions?.length === 0 && (
          <Text style={[styles.text, styles.status, { color: colors.textSecondary }]}>
            Por ahora no hay promociones activas. ¡Vuelve pronto! 🔥
          </Text>
        )}

        {!!promotions?.length && <PromoCarousel promotions={promotions} alcohol={policy.alcohol} onAdd={(promo) => cart.add(promo)} />}

        <NewsletterCard />
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
    paddingTop: 28,
    gap: 24,
  },
  text: {
    fontFamily: BrandFonts.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  status: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  statusTitle: {
    fontFamily: BrandFonts.display,
    fontSize: 36,
    letterSpacing: 2,
  },
});
