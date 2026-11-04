import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { Oswald_500Medium, Oswald_600SemiBold } from '@expo-google-fonts/oswald';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { NavDrawer } from '@/components/brand/nav-drawer';
import { LegalUpdateSheet } from '@/components/legal/legal-update-sheet';
import { CustomerAlerts, WaiterAlerts } from '@/components/notifications/order-alerts';
import { SplashOverlay } from '@/components/splash-overlay';
import { OutboxSync } from '@/components/waiter/outbox-sync';
import { BrandPalettes } from '@/constants/brand';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { BrandThemeProvider, useBrandTheme } from '@/hooks/use-brand-theme';
import { CartProvider } from '@/hooks/use-cart';
import { useCacheCleanup } from '@/hooks/use-cached-resource';
import { preloadPromotions } from '@/hooks/use-content';
import { DrawerProvider } from '@/hooks/use-drawer';
import { LegalUpdateProvider } from '@/hooks/use-legal-update';
import { preloadMenu } from '@/hooks/use-menu';
import { useNotificationTaps } from '@/hooks/use-order-alerts';
import { preloadRestaurantInfo } from '@/hooks/use-restaurant';
import { preloadStorePolicy } from '@/hooks/use-store-policy';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <BrandThemeProvider>
      <AuthProvider>
        <CartProvider>
          <LegalUpdateProvider>
            <DrawerProvider>
              <RootNavigator />
            </DrawerProvider>
          </LegalUpdateProvider>
        </CartProvider>
      </AuthProvider>
    </BrandThemeProvider>
  );
}

function RootNavigator() {
  const { scheme } = useBrandTheme();
  useNotificationTaps();
  const { status, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isWaiter = user?.role === 'mesero';
  const isCustomer = !isAdmin && !isWaiter;
  const [fontsLoaded, fontError] = useFonts({
    BebasNeue_400Regular,
    Oswald_500Medium,
    Oswald_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  useCacheCleanup();

  // While the splash is showing, download what the first screens of this role use, so
  // they open with fresh data. Admin data is never preloaded: it's fetched on its screen.
  useEffect(() => {
    if (status === 'loading' || isAdmin) return;
    preloadMenu();
    if (isWaiter) return;
    preloadPromotions();
    preloadRestaurantInfo();
    preloadStorePolicy();
  }, [status, isAdmin, isWaiter]);

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: { ...base.colors, background: BrandPalettes[scheme].background },
  };

  // Screens mount only once the brand fonts are ready: text measured with the fallback
  // font keeps that (much taller) layout after Bebas Neue loads, leaving big empty gaps.
  // The splash covers this moment, so nothing visible is lost.
  const fontsReady = fontsLoaded || !!fontError;
  // Also wait to know who is signed in, so an admin never sees the customer screens first.
  const ready = fontsReady && status !== 'loading';

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {ready && (
        <>
          {/* Every screen draws its own brand header. Each role only reaches its own
              sections; switching role (sign in / out) moves to the other set by itself.
              This is navigation only: the server checks the role on every admin request. */}
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={isCustomer}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="carrito" />
              <Stack.Screen name="checkout" />
              <Stack.Screen name="pedido/[token]" />
            </Stack.Protected>
            <Stack.Protected guard={isAdmin}>
              <Stack.Screen name="admin" />
            </Stack.Protected>
            <Stack.Protected guard={isWaiter}>
              <Stack.Screen name="mesero" />
              <Stack.Screen name="mesa/[id]" />
            </Stack.Protected>
          </Stack>
          <NavDrawer />
          {/* Sends the waiter's orders saved without a connection. */}
          {isWaiter && <OutboxSync />}
          {/* Notifications on the phone: dishes ready (waiter), order on its way (customer). */}
          {isWaiter && <WaiterAlerts />}
          {isCustomer && <CustomerAlerts />}
          {/* New Aviso or Terms: the customer accepts them before going on. */}
          {isCustomer && <LegalUpdateSheet />}
        </>
      )}
      {/* Rendered last so it sits above the native tabs. */}
      <SplashOverlay ready={ready} />
    </ThemeProvider>
  );
}
