import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useAuth } from '@/hooks/use-auth';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useDrawer } from '@/hooks/use-drawer';

type NavItem = { label: string; href: Href; signedInOnly?: boolean };

// Same order as the website menu.
const ITEMS: NavItem[] = [
  { label: 'A domicilio', href: '/domicilio' },
  { label: 'Mis pedidos', href: '/pedidos' },
  { label: 'Menú', href: '/' },
  { label: 'Quiénes somos', href: '/quienes-somos' },
  { label: 'Reservaciones', href: '/reservar' },
  { label: 'Promociones', href: '/promociones' },
  { label: 'Novedades', href: '/novedades' },
  { label: 'Configuración', href: '/configuracion', signedInOnly: true },
];

// Admin panel sections (the website's admin menu), plus the public pages.
const ADMIN_ITEMS: NavItem[] = [
  { label: 'Panel de ventas', href: '/admin' },
  { label: 'Gestión de reservaciones', href: '/admin/reservaciones' },
  { label: 'Bandeja de mensajes', href: '/admin/mensajes' },
  { label: 'Desempeño de meseros', href: '/admin/meseros' },
  { label: 'Quiénes somos', href: '/quienes-somos' },
  { label: 'Novedades', href: '/novedades' },
  { label: 'Configuración', href: '/configuracion' },
];

const ROLE_LABEL = { cliente: 'Cliente', mesero: 'Mesero', admin: 'Administrador' } as const;

/** Full-screen ☰ panel with the secondary sections, styled like the website menu. */
export function NavDrawer() {
  const { isOpen, close } = useDrawer();
  const { colors } = useBrandTheme();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const go = (href: Href) => {
    close();
    router.navigate(href);
  };

  return (
    <Modal visible={isOpen} animationType="fade" transparent onRequestClose={close} statusBarTranslucent>
      <View style={[styles.panel, { backgroundColor: colors.header, paddingTop: insets.top + 8 }]}>
        <View style={styles.top}>
          <Image
            source={require('@/assets/images/logo-501.png')}
            style={styles.logo}
            contentFit="contain"
            accessibilityLabel="La 501 Sports Restaurant"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar menú"
            onPress={close}
            style={[styles.close, { borderColor: Brand.orange, backgroundColor: colors.surface }]}>
            <SymbolView
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              size={20}
              tintColor={colors.text}
            />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}>
          {user && (
            <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {user.name}
              </Text>
              <Text style={[styles.userMeta, { color: colors.textSecondary }]}>
                {ROLE_LABEL[user.role]}
                {user.role === 'cliente' && <Text style={{ color: Brand.orange }}> · {user.points} puntos</Text>}
              </Text>
            </View>
          )}

          {(user?.role === 'admin' ? ADMIN_ITEMS : ITEMS).filter((item) => !item.signedInOnly || user).map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="link"
              onPress={() => go(item.href)}
              style={({ pressed }) => [
                styles.item,
                { backgroundColor: pressed ? colors.border : colors.surface },
              ]}>
              <Text style={[styles.itemText, { color: colors.text }]}>{item.label}</Text>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                size={16}
                tintColor={colors.textSecondary}
              />
            </Pressable>
          ))}

          {user ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                close();
                signOut();
              }}
              style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.7 }]}>
              <Text style={styles.signOutText}>Cerrar sesión</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => go('/login')}
              style={({ pressed }) => [
                styles.signIn,
                { backgroundColor: pressed ? Brand.orangeDark : Brand.orange },
              ]}>
              <Text style={styles.signInText}>Iniciar sesión</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  logo: {
    height: 44,
    aspectRatio: 1224 / 624,
  },
  close: {
    width: 42,
    height: 42,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
    gap: 10,
  },
  userCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 16,
    gap: 4,
    marginBottom: 6,
  },
  userName: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 18,
  },
  userMeta: {
    fontFamily: BrandFonts.body,
    fontSize: 14,
  },
  item: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderRadius: Radius.md,
  },
  itemText: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 16,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  signIn: {
    marginTop: 14,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ skewX: '-12deg' }],
  },
  signInText: {
    color: Brand.white,
    fontFamily: BrandFonts.labelBold,
    fontSize: 16,
    letterSpacing: 3,
    textTransform: 'uppercase',
    transform: [{ skewX: '12deg' }],
  },
  signOut: {
    marginTop: 14,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: `${Brand.red}66`,
    backgroundColor: `${Brand.red}1A`,
  },
  signOutText: {
    color: Brand.red,
    fontFamily: BrandFonts.labelBold,
    fontSize: 16,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
