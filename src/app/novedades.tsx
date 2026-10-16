import { Image } from 'expo-image';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { getNews } from '@/api/catalog';
import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { OfflineBanner } from '@/components/brand/offline-banner';
import { ImagePlaceholder } from '@/components/brand/image-placeholder';
import { PageHero } from '@/components/brand/page-hero';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useCachedResource } from '@/hooks/use-cached-resource';
import type { NewsItem } from '@/types/product';

const dateFormat = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

function NewsCard({ item }: { item: NewsItem }) {
  const { colors } = useBrandTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.image} contentFit="cover" transition={200} />
      ) : (
        <ImagePlaceholder style={styles.image} />
      )}
      <View style={styles.cardBody}>
        {item.date && <Text style={styles.date}>{dateFormat.format(item.date)}</Text>}
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={3}>
          {item.title}
        </Text>
        {!!item.summary && (
          <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={4}>
            {item.summary}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function NewsScreen() {
  const { colors } = useBrandTheme();
  const { data: news, error, refreshing, stale, reload, refresh } = useCachedResource<NewsItem[]>(
    'news',
    getNews,
  );

  return (
    <BrandScreen showBack refreshing={refreshing} onRefresh={refresh} contentStyle={styles.content}>
      <PageHero
        align="center"
        size={58}
        tag="La 501 Sports Restaurant"
        lead="Novedades"
        accent="La 501"
        description="Entérate de lo último en deportes, avisos importantes y nuestros próximos eventos."
      />

      <View style={styles.body}>
        <OfflineBanner stale={stale} onRetry={reload} />
        {news === null && !error && <ActivityIndicator color={Brand.orange} size="large" />}

        {!!error && (
          <View style={styles.status}>
            <Text style={[styles.text, { color: colors.textSecondary }]}>{error}</Text>
            <BrandButton title="Reintentar" onPress={reload} />
          </View>
        )}

        {news?.length === 0 && (
          <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin novedades por ahora</Text>
            <Text style={[styles.text, { color: colors.textSecondary }]}>
              Estamos preparando contenido nuevo para ti. ¡Regresa pronto!
            </Text>
          </View>
        )}

        {!!news?.length && (
          <View style={styles.grid}>
            {news.map((item) => (
              <NewsCard key={item.key} item={item} />
            ))}
          </View>
        )}
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
    gap: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    aspectRatio: 1.2,
  },
  cardBody: {
    padding: 14,
    gap: 6,
  },
  date: {
    color: Brand.orange,
    fontFamily: BrandFonts.label,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 17,
    lineHeight: 22,
  },
  summary: {
    fontFamily: BrandFonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  status: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  text: {
    fontFamily: BrandFonts.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: Brand.orange,
    borderRadius: Radius.lg + 8,
  },
  emptyEmoji: {
    fontSize: 56,
  },
  emptyTitle: {
    fontFamily: BrandFonts.display,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
