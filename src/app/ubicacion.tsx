import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewProps } from 'react-native-webview';

import { BrandScreen } from '@/components/brand/brand-screen';
import { PageHero } from '@/components/brand/page-hero';
import { ScheduleCard } from '@/components/info/schedule-card';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useRestaurantInfo } from '@/hooks/use-restaurant';
import { useIsOffline } from '@/hooks/use-connectivity';

const MAP_HEIGHT = 300;

// Opens the phone's maps app (Apple Maps on iOS, Google Maps on Android).
function mapsUrl(query: string, directions: boolean) {
  const q = encodeURIComponent(query);
  if (Platform.OS === 'ios') return directions ? `https://maps.apple.com/?daddr=${q}` : `https://maps.apple.com/?q=${q}`;
  return directions
    ? `https://www.google.com/maps/dir/?api=1&destination=${q}`
    : `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/**
 * Android: a geo: link opens the maps app the person uses (never the browser). Without
 * one installed, the Google Maps web link is the fallback.
 */
function openPlace(query: string) {
  const web = mapsUrl(query, false);
  if (Platform.OS !== 'android') return Linking.openURL(web).catch(() => {});
  return Linking.openURL(`geo:0,0?q=${encodeURIComponent(query)}`).catch(() => Linking.openURL(web).catch(() => {}));
}

// Same as the website: Google only draws its embedded map inside an iframe. Loaded as the
// page itself, it redirects to a URL that says "must be used in an iframe".
const MAP_PAGE_ORIGIN = 'https://maps.google.com/';

function mapPage(embedUrl: string) {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{margin:0;height:100%;background:#111}iframe{border:0;width:100%;height:100%}</style></head>
<body><iframe src="${embedUrl}" loading="eager" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></body></html>`;
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
          ? { backgroundColor: pressed ? Brand.orangeFillPressed : Brand.orangeFill, borderColor: Brand.orange }
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
  const info = useRestaurantInfo();

  const { address, mapQuery: query } = info;
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  // embedUrl only carries the encoded query: nothing in it can close the iframe's quotes.
  const page = mapPage(embedUrl);
  // "Plaza de la Revolución Mexicana #16, Col. Centro, …" → street as the title, the rest below.
  const [street, ...rest] = address.split(',').map((part) => part.trim());
  const open = (directions: boolean) =>
    directions ? Linking.openURL(mapsUrl(query, true)).catch(() => {}) : openPlace(query);

  // The map and its redirects stay inside the iframe. A link that would replace the whole
  // card ("Abrir en Maps", "Cómo llegar" inside the map) opens the maps app instead.
  const onNavigate: NonNullable<WebViewProps['onShouldStartLoadWithRequest']> = (request) => {
    if (request.isTopFrame === false) return true;
    if (request.url === MAP_PAGE_ORIGIN || request.url === 'about:blank') return true;
    if (request.url.startsWith('https://')) openPlace(query);
    return false;
  };

  return (
    <BrandScreen showBack contentStyle={styles.content}>
      <PageHero
        align="center"
        tag="La 501 Sports Restaurant"
        lead="Encuéntranos"
        accent="aquí"
        description="Ven a visitarnos a disfrutar del deporte y la buena comida."
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
              source={{ html: page, baseUrl: MAP_PAGE_ORIGIN }}
              style={styles.map}
              originWhitelist={['https://*', 'about:*']}
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
          <Text style={[styles.street, { color: colors.accent }]} selectable>
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

        <ScheduleCard hours={info.hours} showIcon />
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
