import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { discardRejectedOrder, loadOutbox, retryEntry, syncOutbox, useOutbox } from '@/data/waiter-outbox';
import { useAuth } from '@/hooks/use-auth';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useIsOffline } from '@/hooks/use-connectivity';
import { formatMoney } from '@/components/account/orders-list';

const RETRY_MS = 30_000;
const AMBER = '#F59E0B';

/**
 * Sends the waiter's saved orders in the background: right away, when the
 * connection comes back, when the app returns to the foreground and every 30 s while
 * anything is pending. Renders nothing; mounted once in the waiter's layout.
 */
export function OutboxSync() {
  const { user } = useAuth();
  const offline = useIsOffline();
  const { entries } = useOutbox();
  const owner = user?.email ?? null;
  const pending = entries.some((e) => e.owner === owner && !e.error);

  useEffect(() => {
    loadOutbox();
  }, []);

  useEffect(() => {
    if (!offline && pending) syncOutbox(owner);
  }, [offline, pending, owner]);

  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => syncOutbox(owner), RETRY_MS);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') syncOutbox(owner);
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [pending, owner]);

  return null;
}

/**
 * Orders waiting to reach the server, visible on the waiter's screens while there are any,
 * so the waiter knows to tell the kitchen in person.
 */
export function OutboxBanner({ tableId }: { tableId?: number }) {
  const { colors } = useBrandTheme();
  const { user } = useAuth();
  const offline = useIsOffline();
  const { entries, syncing } = useOutbox();
  const mine = entries.filter((e) => e.owner === user?.email && (tableId === undefined || e.tableId === tableId));
  const rejected = mine.filter((e) => e.error);
  const waiting = mine.length - rejected.length;

  if (mine.length === 0) return null;

  return (
    <View style={styles.stack}>
      {waiting > 0 && (
        <View
          accessibilityRole="alert"
          style={[styles.banner, { borderColor: `${AMBER}66`, backgroundColor: `${AMBER}14` }]}>
          {syncing ? (
            <ActivityIndicator color={AMBER} size="small" />
          ) : (
            <SymbolView name={{ ios: 'tray.and.arrow.up', android: 'cloud_upload', web: 'cloud_upload' }} size={18} tintColor={AMBER} />
          )}
          <Text style={[styles.text, { color: colors.text }]}>
            <Text style={styles.strong}>
              {waiting} {waiting === 1 ? 'pedido guardado' : 'pedidos guardados'} en el teléfono.{' '}
            </Text>
            {syncing
              ? 'Enviando al sistema…'
              : offline
                ? 'Se envían solos al volver el internet.'
                : 'Reintentando el envío…'}
          </Text>
        </View>
      )}

      {rejected.map((entry) => (
        <View key={entry.ref} style={[styles.banner, styles.column, { borderColor: `${Brand.red}66`, backgroundColor: `${Brand.red}12` }]}>
          <Text style={[styles.text, { color: colors.text }]}>
            <Text style={styles.strong}>
              Pedido de mesa {entry.tableNumber} ({entry.label},{' '}
              {formatMoney(entry.total)}) no se registró:{' '}
            </Text>
            {entry.error}
          </Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={() => retryEntry(entry.ref)} hitSlop={6}>
              <Text style={[styles.action, { color: Brand.blue }]}>Reintentar</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => discardRejectedOrder(entry.ref)} hitSlop={6}>
              <Text style={[styles.action, { color: Brand.red }]}>Descartar pedido</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 8,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  column: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  text: {
    flex: 1,
    fontFamily: BrandFonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  strong: {
    fontFamily: BrandFonts.bodyBold,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 18,
  },
  action: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
