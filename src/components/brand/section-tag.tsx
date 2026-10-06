import { StyleSheet, Text, View } from 'react-native';

import { Brand, BrandFonts } from '@/constants/brand';

/** Slanted orange label, e.g. "LA 501 SPORTS". */
export function SectionTag({ children }: { children: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: Brand.orange,
    paddingHorizontal: 16,
    paddingVertical: 5,
    transform: [{ skewX: '-14deg' }],
  },
  text: {
    color: Brand.white,
    fontFamily: BrandFonts.labelBold,
    fontSize: 13,
    letterSpacing: 3,
    textTransform: 'uppercase',
    transform: [{ skewX: '14deg' }],
  },
});
