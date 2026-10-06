import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useAuth } from '@/hooks/use-auth';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useCart } from '@/hooks/use-cart';
import { useDrawer } from '@/hooks/use-drawer';

const LOGO_HEIGHT = 44;
const SUN_YELLOW = '#FACC15';

type HeaderButtonProps = {
  icon?: SymbolViewProps['name'];
  tintColor?: string;
  label: string;
  badge?: number;
  onPress?: () => void;
  children?: ReactNode;
};

function HeaderButton({ icon, tintColor, label, badge, onPress, children }: HeaderButtonProps) {
  const { colors } = useBrandTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? colors.border : colors.surface, borderColor: colors.border },
      ]}>
      {children ?? (icon && <SymbolView name={icon} size={22} tintColor={tintColor ?? colors.text} />)}
      {!!badge && (
        <View style={[styles.badge, { borderColor: colors.header }]}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/** Shared top bar: logo (or back), mode toggle, account, cart and ☰. */
export function AppHeader({ showBack = false }: { showBack?: boolean }) {
  const insets = useSafeAreaInsets();
  const { scheme, colors, toggleScheme } = useBrandTheme();
  const { user } = useAuth();
  const cart = useCart();
  const drawer = useDrawer();
  const isDark = scheme === 'dark';
  const isAdmin = user?.role === 'admin';

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 8, backgroundColor: colors.header, borderBottomColor: colors.border },
      ]}>
      <View style={styles.leading}>
        {showBack && (
          <HeaderButton
            icon={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            label="Regresar"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
        )}
        <Image
          source={require('@/assets/images/logo-501.png')}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="La 501 Sports Restaurant"
        />
      </View>

      <View style={styles.actions}>
        {/* Shows the mode you switch to: sun in dark mode, moon in light mode. */}
        <HeaderButton
          icon={
            isDark
              ? { ios: 'sun.max.fill', android: 'light_mode', web: 'light_mode' }
              : { ios: 'moon.fill', android: 'dark_mode', web: 'dark_mode' }
          }
          tintColor={isDark ? SUN_YELLOW : colors.text}
          label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          onPress={toggleScheme}
        />
        {user && (
          <HeaderButton label={`Mi cuenta, ${user.name}`} onPress={() => router.navigate(isAdmin ? '/admin/perfil' : '/cuenta')}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{initials(user.name)}</Text>
              </View>
            )}
          </HeaderButton>
        )}
        {/* The admin panel has no cart. */}
        {!isAdmin && (
          <HeaderButton
            icon={{ ios: 'cart.fill', android: 'shopping_cart', web: 'shopping_cart' }}
            label={`Carrito, ${cart.count} productos`}
            badge={cart.count}
            onPress={() => router.push('/carrito')}
          />
        )}
        <HeaderButton
          icon={{ ios: 'line.3.horizontal', android: 'menu', web: 'menu' }}
          label="Abrir menú de navegación"
          onPress={drawer.open}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  logo: {
    height: LOGO_HEIGHT,
    aspectRatio: 1224 / 624,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Brand.orange,
  },
  avatarFallback: {
    backgroundColor: Brand.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Brand.white,
    fontFamily: BrandFonts.labelBold,
    fontSize: 12,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: Radius.pill,
    backgroundColor: Brand.orange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  badgeText: {
    color: Brand.white,
    fontFamily: BrandFonts.labelBold,
    fontSize: 11,
    lineHeight: 14,
  },
});
