import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatMoney } from '@/components/account/orders-list';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { BottomTabInset } from '@/constants/theme';
import { useCart } from '@/hooks/use-cart';

export const CART_BAR_HEIGHT = 64;

/** Floating "Ver tu orden" bar above the tab bar while the cart has items. */
export function CartBar() {
  const cart = useCart();
  if (cart.count === 0) return null;

  return (
    <View style={[styles.wrapper, { bottom: BottomTabInset + 12 }]} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ver tu orden, ${cart.count} productos, ${formatMoney(cart.total)}`}
        onPress={() => router.push('/carrito')}
        style={({ pressed }) => [styles.bar, { backgroundColor: pressed ? Brand.orangeDark : Brand.orange }]}>
        <View style={styles.count}>
          <Text style={styles.countText}>{cart.count}</Text>
        </View>
        <Text style={styles.label}>Ver tu orden</Text>
        <Text style={styles.total}>{formatMoney(cart.total)}</Text>
        <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={16} tintColor={Brand.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  bar: {
    height: CART_BAR_HEIGHT - 8,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    boxShadow: `0 8px 24px ${Brand.orange}66`,
  },
  count: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 6,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: Brand.white,
    fontFamily: BrandFonts.labelBold,
    fontSize: 14,
  },
  label: {
    flex: 1,
    color: Brand.white,
    fontFamily: BrandFonts.labelBold,
    fontSize: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  total: {
    color: Brand.white,
    fontFamily: BrandFonts.labelBold,
    fontSize: 17,
  },
});
