import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewProps } from 'react-native-webview';

import { DEFAULT_ADDRESS, DEFAULT_MAP_QUERY, getRestaurantInfo } from '@/api/info';
import { BrandScreen } from '@/components/brand/brand-screen';
import { PageHero } from '@/components/brand/page-hero';
import { ScheduleCard } from '@/components/info/schedule-card';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useCachedResource } from '@/hooks/use-cached-resource';
import { useIsOffline } from '@/hooks/use-connectivity';
import { DEFAULT_HOURS } from '@/utils/opening-hours';

const MAP_HEIGHT = 300;

// Opens the phone's maps app (Apple Maps on iOS, Google Maps on Android).
function mapsUrl(query: string, directions: boolean) {
  const q = encodeURIComponent(query);
  if (Platform.OS === 'ios') return directions ? `http://maps.apple.com/?daddr=${q}` : `http://maps.apple.com/?q=${q}`;
  return directions
    ? `https://www.google.com/maps/dir/?api=1&destination=${q}`
    : `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function ActionButton({
  icon,
  label,
  onPress,
  filled,
}: {
  icon: SymbolViewProps['name'];
  label: string;
  onPress: () => void;
  filled?: boolean;
}) {
  const { colors } = useBrandTheme();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        filled
          ? { backgroundColor: pressed ? Brand.orangeDark : Brand.orange, borderColor: Brand.orange }
          : { backgroundColor: pressed ? colors.border : colors.background, borderColor: colors.border },
      ]}>
      <SymbolView name={icon} size={18} tintColor={filled ? Brand.white : Brand.orange} />
      <Text style={[styles.actionText, { color: filled ? Brand.white : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

/** "Encuéntranos aquí": map, address with directions, and opening hours. */
export default function LocationScreen() {
  const { colors } = useBrandTheme();
  const offline = useIsOffline();
  // Saved on the device: address and hours show even without internet.
  const { data: info } = useCachedResource('restaurant-info', getRestaurantInfo, { persist: true });

  const address = info?.address || DEFAULT_ADDRESS;
  const query = info?.mapQuery || DEFAULT_MAP_QUERY;
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  // "Av. Deportiva #501, Col. Centro, CP 43000, …" → street as the title, the rest below.
  const [street, ...rest] = address.split(',').map((part) => part.trim());
  const open = (directions: boolean) => Linking.openURL(mapsUrl(query, directions)).catch(() => {});

  // The map page stays inside the card; any link in it ("Ver mapa más grande") opens the
  // maps app instead of navigating away.
  const onNavigate: NonNullable<WebViewProps['onShouldStartLoadWithRequest']> = (request) => {
    if (request.url === embedUrl || request.isTopFrame === false) return true;
    if (request.url.startsWith('https://')) Linking.openURL(request.url).catch(() => {});
    return false;
  };

  return (
    <BrandScreen showBack contentStyle={styles.content}>
      <PageHero
        align="center"
        tag="La 501 Sports Restaurant"
        lead="Encuéntranos"
        accent="aquí"
        description="Ven a visitarnos y disfruta de la mejor experiencia deportiva y gastronómica de la ciudad."
      />

      <View style={styles.body}>
        <View style={[styles.mapCard, { borderColor: `${Brand.orange}88`, backgroundColor: colors.surface }]}>
          {offline ? (
            <View style={styles.mapOffline}>
              <SymbolView name={{ ios: 'map', android: 'map', web: 'map' }} size={40} tintColor={colors.textSecondary} />
              <Text style={[styles.mapOfflineText, { color: colors.textSecondary }]}>
                El mapa necesita conexión a internet. Abajo tienes la dirección.
              </Text>
            </View>
          ) : (
            <WebView
              source={{ uri: embedUrl }}
              style={styles.map}
              originWhitelist={['https://*']}
              onShouldStartLoadWithRequest={onNavigate}
              setSupportMultipleWindows={false}
              allowsLinkPreview={false}
              nestedScrollEnabled
              accessibilityLabel={`Mapa de ${query}`}
            />
          )}
          <Pressable
            accessibilityRole="link"
            onPress={() => open(false)}
            style={({ pressed }) => [styles.openMaps, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}>
            <Text style={[styles.openMapsText, { color: Brand.blue }]}>Abrir en Maps</Text>
            <SymbolView name={{ ios: 'arrow.up.right.square', android: 'open_in_new', web: 'open_in_new' }} size={16} tintColor={Brand.blue} />
          </Pressable>
        </View>

        <View style={[styles.addressCard, { backgroundColor: colors.surface, borderColor: `${Brand.orange}88` }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <SymbolView name={{ ios: 'mappin.circle.fill', android: 'location_on', web: 'location_on' }} size={22} tintColor={Brand.white} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Dirección</Text>
          </View>
          <Text style={styles.street} selectable>
            {street}
          </Text>
          {rest.map((line) => (
            <Text key={line} style={[styles.addressLine, { color: colors.textSecondary }]} selectable>
              {line}
            </Text>
          ))}
          <View style={styles.actions}>
            <ActionButton
              filled
              icon={{ ios: 'arrow.triangle.turn.up.right.circle.fill', android: 'directions', web: 'directions' }}
              label="Cómo llegar"
              onPress={() => open(true)}
            />
            <ActionButton icon={{ ios: 'map', android: 'map', web: 'map' }} label="Ver en Maps" onPress={() => open(false)} />
          </View>
        </View>

        <ScheduleCard hours={info?.hours ?? DEFAULT_HOURS} showIcon />
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
  mapCard: {
    height: MAP_HEIGHT,
    borderWidth: 2,
    borderRadius: Radius.lg + 4,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  mapOffline: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  mapOfflineText: {
    fontFamily: BrandFonts.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  openMaps: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
  },
  openMapsText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
  },
  addressCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 18,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    experimental_backgroundImage: `linear-gradient(135deg, ${Brand.orange}, ${Brand.orangeDark})`,
  },
  cardTitle: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 20,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  street: {
    color: Brand.orange,
    fontFamily: BrandFonts.display,
    fontSize: 32,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  addressLine: {
    fontFamily: BrandFonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  action: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  actionText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
  },
});
