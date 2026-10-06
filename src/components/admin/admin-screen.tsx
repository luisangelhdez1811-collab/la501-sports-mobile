import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AdminTitle } from '@/components/admin/admin-ui';
import { BrandScreen } from '@/components/brand/brand-screen';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useIsOffline } from '@/hooks/use-connectivity';

type AdminScreenProps = {
  title: string;
  subtitle: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: ReactNode;
};

/**
 * Frame for every admin section. Panel data is sensitive and lives only on the server:
 * a permanent note says so, and without internet the content isn't rendered at all
 * (whatever was on screen is dropped, and it loads fresh when the connection returns).
 */
export function AdminScreen({ title, subtitle, refreshing, onRefresh, children }: AdminScreenProps) {
  const offline = useIsOffline();

  return (
    <BrandScreen refreshing={offline ? undefined : refreshing} onRefresh={offline ? undefined : onRefresh}>
      <AdminTitle title={title} subtitle={subtitle} />
      <LiveDataNotice />
      {offline ? <OfflineCard /> : children}
    </BrandScreen>
  );
}

/** Always visible, so it's clear from the first time the panel opens. */
function LiveDataNotice() {
  const { colors } = useBrandTheme();
  return (
    <View style={[styles.notice, { borderColor: `${Brand.blue}55`, backgroundColor: `${Brand.blue}12` }]}>
      <SymbolView name={{ ios: 'lock.shield.fill', android: 'shield_lock', web: 'shield_lock' }} size={18} tintColor={Brand.blue} />
      <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
        <Text style={[styles.noticeStrong, { color: colors.text }]}>Datos protegidos: </Text>
        la información del panel se consulta en vivo del servidor y solo se puede ver con conexión a
        internet. No se guarda en este teléfono.
      </Text>
    </View>
  );
}

function OfflineCard() {
  const { colors } = useBrandTheme();
  return (
    <View
      accessibilityRole="alert"
      style={[styles.offline, { backgroundColor: colors.surface, borderColor: `${Brand.red}66` }]}>
      <View style={[styles.offlineIcon, { backgroundColor: `${Brand.red}1F` }]}>
        <SymbolView name={{ ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' }} size={28} tintColor={Brand.red} />
      </View>
      <Text style={[styles.offlineTitle, { color: colors.text }]}>Sin conexión</Text>
      <Text style={[styles.offlineText, { color: colors.textSecondary }]}>
        Por seguridad, los datos del panel solo se pueden ver con internet. Conéctate a una red y
        se cargarán automáticamente.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 12,
  },
  noticeText: {
    flex: 1,
    fontFamily: BrandFonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  noticeStrong: {
    fontFamily: BrandFonts.bodyBold,
  },
  offline: {
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  offlineIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  offlineTitle: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 20,
  },
  offlineText: {
    fontFamily: BrandFonts.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
