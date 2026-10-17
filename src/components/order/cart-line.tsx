import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatMoney } from '@/components/account/orders-list';
import { ImagePlaceholder } from '@/components/brand/image-placeholder';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useCart, type CartItem } from '@/hooks/use-cart';
import { menuImage } from '@/utils/image-source';

function StepButton({ symbol, label, filled, onPress }: { symbol: '−' | '+'; label: string; filled?: boolean; onPress: () => void }) {
  const { colors } = useBrandTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.step,
        filled
          ? { backgroundColor: pressed ? Brand.greenDark : Brand.green }
          : { backgroundColor: pressed ? `${Brand.red}33` : `${Brand.red}1A`, borderColor: `${Brand.red}55`, borderWidth: 1 },
      ]}>
      <Text style={[styles.stepText, { color: filled ? Brand.white : colors.text }]}>{symbol}</Text>
    </Pressable>
  );
}

/** Cart row: photo, name, customizations, unit price, − qty + and remove. */
export function CartLine({ item }: { item: CartItem }) {
  const { colors } = useBrandTheme();
  const cart = useCart();
  const { product } = item;

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      {product.image ? (
        <Image source={menuImage(product.image)} style={styles.thumb} contentFit="cover" />
      ) : (
        <ImagePlaceholder style={styles.thumb} />
      )}

      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[styles.unit, { color: colors.textSecondary }]}>
          {/* Offers like "2x$150" have no plain amount; the server prices them at checkout. */}
          {product.price > 0 || !product.priceLabel ? `${formatMoney(product.price)} c/u` : `Promoción ${product.priceLabel}`}
        </Text>
        {item.excluded.length > 0 && (
          <Text style={[styles.detail, { color: Brand.red }]} numberOfLines={2}>
            Sin {item.excluded.map((i) => i.name.toLowerCase()).join(', ')}
          </Text>
        )}
        {!!item.notes && (
          <Text style={[styles.detail, { color: colors.textSecondary }]} numberOfLines={2}>
            “{item.notes}”
          </Text>
        )}

        <View style={styles.controls}>
          <StepButton symbol="−" label={`Quitar uno de ${product.name}`} onPress={() => cart.decrement(item.lineId)} />
          <Text style={[styles.quantity, { color: colors.text }]} accessibilityLiveRegion="polite">
            {item.quantity}
          </Text>
          <StepButton symbol="+" filled label={`Agregar otro ${product.name}`} onPress={() => cart.increment(item.lineId)} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Eliminar ${product.name}`}
            onPress={() => cart.remove(item.lineId)}
            hitSlop={6}
            style={[styles.trash, { borderColor: colors.border }]}>
            <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={16} tintColor={colors.textSecondary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 76,
    height: 76,
    borderRadius: Radius.md,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 17,
  },
  unit: {
    fontFamily: BrandFonts.body,
    fontSize: 13,
  },
  detail: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  step: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 20,
    lineHeight: 22,
  },
  quantity: {
    minWidth: 24,
    textAlign: 'center',
    fontFamily: BrandFonts.bodyBold,
    fontSize: 17,
  },
  trash: {
    marginLeft: 'auto',
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
