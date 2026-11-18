import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { TicketMaps } from '@/api/account';
import { BrandFonts } from '@/constants/brand';
import { QR_QUIET_ZONE, mapsQrCaption, qrRuns } from '@/domain/maps-qr';
import { useBrandTheme } from '@/hooks/use-brand-theme';

/** About the width of the website's QR (200 px). */
const SIDE = 200;

/**
 * The ticket's Maps QR, drawn with plain views: one per dark or light run of each row. It is
 * always black on white (dark mode included) so any camera reads it, and tapping it opens Maps.
 */
export function MapsQr({ maps }: { maps: TicketMaps }) {
  const { colors } = useBrandTheme();
  const cell = Math.max(2, Math.floor(SIDE / (maps.modules.length + QR_QUIET_ZONE * 2)));
  const caption = mapsQrCaption(maps.fromAddress);

  return (
    <View style={[styles.box, { borderColor: colors.border }]}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${caption}. Toca para abrir Maps.`}
        onPress={() => Linking.openURL(maps.url).catch(() => {})}
        style={[styles.code, { padding: QR_QUIET_ZONE * cell }]}
      >
        {maps.modules.map((row, y) => (
          <View key={y} style={styles.row}>
            {qrRuns(row).map((run, index) => (
              <View
                key={index}
                style={{ width: run.length * cell, height: cell, backgroundColor: run.dark ? QR_DARK : QR_LIGHT }}
              />
            ))}
          </View>
        ))}
      </Pressable>
      <Text style={[styles.caption, { color: colors.text }]}>{caption}</Text>
    </View>
  );
}

const QR_DARK = '#000000';
const QR_LIGHT = '#FFFFFF';

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 14,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  code: {
    backgroundColor: QR_LIGHT,
  },
  row: {
    flexDirection: 'row',
  },
  caption: {
    fontFamily: BrandFonts.body,
    fontSize: 12,
    textAlign: 'center',
  },
});
