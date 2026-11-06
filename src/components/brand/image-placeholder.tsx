import { Image } from 'expo-image';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Brand } from '@/constants/brand';

/** Shown where a dish or category has no photo: faded logo over the brand gradient. */
export function ImagePlaceholder({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.container, style]}>
      <Image
        source={require('@/assets/images/logo-501.png')}
        style={styles.logo}
        contentFit="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    experimental_backgroundImage: `linear-gradient(160deg, #2A1A0C, #3A2A1C 55%, ${Brand.orangeDark})`,
  },
  logo: {
    width: '58%',
    aspectRatio: 1224 / 624,
    opacity: 0.35,
  },
});
