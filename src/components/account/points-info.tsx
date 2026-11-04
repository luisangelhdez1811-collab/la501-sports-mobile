import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, Text, View } from 'react-native';

import { TextLink } from '@/components/brand/text-link';
import { BrandFonts } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useStorePolicy } from '@/hooks/use-store-policy';

/**
 * What the points are worth, next to the balance (M-19): never a money equivalence, a note
 * while they can't be redeemed, and the published rules when there are any.
 */
export function PointsInfo() {
  const { colors } = useBrandTheme();
  const { loyalty } = useStorePolicy();
  const rulesUrl = loyalty.rulesUrl;
  return (
    <View style={styles.box}>
      {!loyalty.redeemable && (
        <Text style={[styles.text, { color: colors.textSecondary }]}>Por ahora los puntos no se pueden canjear.</Text>
      )}
      {!!rulesUrl && (
        <TextLink
          label="¿Cómo funcionan mis puntos?"
          onPress={() => WebBrowser.openBrowserAsync(rulesUrl, { dismissButtonStyle: 'close', showTitle: true })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: 6,
  },
  text: {
    fontFamily: BrandFonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
});
