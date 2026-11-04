import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { formatMoney } from '@/domain/money';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useMyOutbox, useOutboxSync } from '@/hooks/use-outbox';


/** Sends the waiter's saved orders in the background. Renders nothing; mounted once in the layout. */
export function OutboxSync() {
  useOutboxSync();
  return null;
}

/**
 * Orders waiting to reach the server, visible on the waiter's screens while there are any,
 * so the waiter knows to tell the kitchen in person.
 */
export function OutboxBanner({ tableId }: { tableId?: number }) {
  const { colors } = useBrandTheme();
  const { offline, syncing, waiting, rejected, retry, discard } = useMyOutbox(tableId);

  if (waiting === 0 && rejected.length === 0) return null;

  return (
    <View style={styles.stack}>
      {waiting > 0 && (
        <View
          accessibilityRole="alert"
          style={[styles.banner, { borderColor: colors.warning, backgroundColor: `${colors.warning}14` }]}>
          {syncing ? (
            <ActivityIndicator color={colors.warning} size="small" />
          ) : (
            <SymbolView name={{ ios: 'tray.and.arrow.up', android: 'cloud_upload', web: 'cloud_upload' }} size={18} tintColor={colors.warning} />
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
            <Pressable accessibilityRole="button" onPress={() => retry(entry.ref)} hitSlop={6}>
              <Text style={[styles.action, { color: Brand.blue }]}>Reintentar</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => discard(entry.ref)} hitSlop={6}>
              <Text style={[styles.action, { color: colors.danger }]}>Descartar pedido</Text>
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
