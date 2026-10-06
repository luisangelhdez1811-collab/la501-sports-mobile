import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getProductDetail, type ProductDetail } from '@/api/catalog';
import { formatMoney } from '@/components/account/orders-list';
import { BrandButton } from '@/components/brand/brand-button';
import { ImagePlaceholder } from '@/components/brand/image-placeholder';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import type { Ingredient, Product } from '@/types/product';
import { getCachedDetail, loadDetails, saveDetail } from '@/data/product-details';
import { menuImage } from '@/utils/image-source';

type ProductDetailSheetProps = {
  product: Product | null;
  onClose: () => void;
  /**
   * Present → ordering mode ("Arma tu pedido"): ingredient checklist, comments and
   * Cancelar / Agregar al pedido. Absent → read-only menu card.
   */
  onAdd?: (product: Product, excluded: Ingredient[], notes: string) => void;
};

const ingredientKey = (ingredient: Ingredient) => String(ingredient.id ?? ingredient.name);

function IngredientToggle({
  ingredient,
  included,
  onToggle,
}: {
  ingredient: Ingredient;
  included: boolean;
  onToggle: () => void;
}) {
  const { colors } = useBrandTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: included }}
      accessibilityLabel={ingredient.name}
      onPress={onToggle}
      style={[
        styles.ingredient,
        { backgroundColor: colors.background, borderColor: included ? colors.border : `${Brand.red}55` },
      ]}>
      <View
        style={[
          styles.box,
          included
            ? { backgroundColor: Brand.orange, borderColor: Brand.orange }
            : { borderColor: colors.textSecondary },
        ]}>
        {included && (
          <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={14} tintColor={Brand.white} />
        )}
      </View>
      <Text
        style={[
          styles.ingredientText,
          { color: included ? colors.text : colors.textSecondary },
          !included && styles.struck,
        ]}>
        {ingredient.name}
      </Text>
    </Pressable>
  );
}

/** Dish card: full name, description, ingredients and price; optionally customize and add. */
export function ProductDetailSheet({ product, onClose, onAdd }: ProductDetailSheetProps) {
  const { colors } = useBrandTheme();
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [detailFailed, setDetailFailed] = useState(false);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');

  const ordering = !!onAdd;
  // Only regular dishes have a detail endpoint (promotions don't).
  const productId = product?.kind === 'product' ? product.id : null;

  useEffect(() => {
    if (productId === null) return;
    const controller = new AbortController();

    (async () => {
      // Saved details show instantly (and are all there is offline).
      await loadDetails();
      if (controller.signal.aborted) return;
      const cached = getCachedDetail(productId);
      if (cached) {
        setDetail(cached);
        return;
      }
      try {
        const data = await getProductDetail(productId, controller.signal);
        saveDetail(productId, data);
        setDetail(data);
      } catch {
        if (!controller.signal.aborted) setDetailFailed(true);
      }
    })();

    return () => controller.abort();
  }, [productId]);

  const close = () => {
    setDetail(null);
    setDetailFailed(false);
    setExcluded(new Set());
    setNotes('');
    onClose();
  };

  const toggle = (ingredient: Ingredient) => {
    setExcluded((current) => {
      const next = new Set(current);
      const key = ingredientKey(ingredient);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const add = () => {
    if (!product || !onAdd) return;
    const removed = (detail?.ingredients ?? []).filter((i) => excluded.has(ingredientKey(i)));
    onAdd(product, removed, notes);
    close();
  };

  const loadingDetail = productId !== null && !detail && !detailFailed;
  const meta = [product?.category, detail?.subcategory].filter(Boolean).join(' · ');
  const ingredients = detail?.ingredients ?? [];
  // Checkout needs the server id; unavailable dishes can't be ordered either.
  const canOrder = !!product && product.available && product.id !== null;

  return (
    <Modal visible={!!product} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Cerrar" />
        {product && (
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
              <View style={styles.media}>
                {product.image ? (
                  <Image
                    source={menuImage(product.image)}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={200}
                    accessibilityIgnoresInvertColors
                  />
                ) : (
                  <ImagePlaceholder style={StyleSheet.absoluteFill} />
                )}
                <View style={styles.mediaShade} />
                <View style={styles.handle} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                  onPress={close}
                  hitSlop={8}
                  style={styles.close}>
                  <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={18} tintColor={Brand.white} />
                </Pressable>
              </View>

              <View style={styles.body}>
                <View style={styles.titleBlock}>
                  {!!meta && <Text style={styles.meta}>{meta}</Text>}
                  <Text style={[styles.name, { color: colors.text }]} accessibilityRole="header">
                    {product.name}
                  </Text>
                  <View
                    style={[
                      styles.availability,
                      {
                        borderColor: product.available ? Brand.green : Brand.red,
                        backgroundColor: `${product.available ? Brand.green : Brand.red}1A`,
                      },
                    ]}>
                    <View style={[styles.dot, { backgroundColor: product.available ? Brand.greenLight : Brand.red }]} />
                    <Text style={[styles.availabilityText, { color: product.available ? Brand.greenLight : Brand.red }]}>
                      {product.available ? 'Disponible' : 'Agotado por ahora'}
                    </Text>
                  </View>
                </View>

                {!!product.description && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Descripción</Text>
                    <Text style={[styles.description, { color: colors.text }]}>{product.description}</Text>
                  </View>
                )}

                {loadingDetail && <ActivityIndicator color={Brand.orange} style={styles.loader} />}

                {ingredients.length > 0 && !ordering && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                      Ingredientes ({ingredients.length})
                    </Text>
                    <View style={styles.chips}>
                      {ingredients.map((ingredient) => (
                        <View
                          key={ingredientKey(ingredient)}
                          style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.background }]}>
                          <Text style={[styles.chipText, { color: colors.text }]}>{ingredient.name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {ingredients.length > 0 && ordering && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Ingredientes a incluir</Text>
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>
                      Desmarca lo que no quieras en tu platillo.
                    </Text>
                    <View style={styles.grid}>
                      {ingredients.map((ingredient) => (
                        <IngredientToggle
                          key={ingredientKey(ingredient)}
                          ingredient={ingredient}
                          included={!excluded.has(ingredientKey(ingredient))}
                          onToggle={() => toggle(ingredient)}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {ordering && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Comentarios / extra</Text>
                    <TextInput
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Ej: papas extra, salsa extra, más picante, sin sal…"
                      placeholderTextColor={colors.textSecondary}
                      selectionColor={Brand.orange}
                      multiline
                      maxLength={300}
                      style={[
                        styles.notes,
                        { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
                      ]}
                      accessibilityLabel="Comentarios para la cocina"
                    />
                  </View>
                )}

                <View style={[styles.priceRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Precio</Text>
                  <Text style={[styles.price, { color: colors.text }]}>
                    <Text style={{ color: Brand.orange }}>$</Text>
                    {formatMoney(product.price).slice(1)}
                    <Text style={[styles.currency, { color: colors.textSecondary }]}> {product.currency}</Text>
                  </Text>
                </View>

                {ordering && (
                  <View style={styles.actions}>
                    <BrandButton title="Cancelar" variant="secondary" onPress={close} style={styles.cancel} />
                    <BrandButton
                      title={canOrder ? 'Agregar al pedido' : 'No disponible'}
                      variant="action"
                      icon={canOrder ? { ios: 'cart.badge.plus', android: 'add_shopping_cart', web: 'add_shopping_cart' } : undefined}
                      onPress={add}
                      disabled={!canOrder || loadingDetail}
                      style={styles.confirm}
                    />
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: Radius.lg + 8,
    borderTopRightRadius: Radius.lg + 8,
    overflow: 'hidden',
  },
  media: {
    aspectRatio: 1.35,
    justifyContent: 'flex-end',
  },
  mediaShade: {
    ...StyleSheet.absoluteFill,
    experimental_backgroundImage:
      'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.55) 100%)',
  },
  handle: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  close: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(15, 13, 10, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 22,
    gap: 22,
  },
  titleBlock: {
    gap: 8,
  },
  meta: {
    color: Brand.orange,
    fontFamily: BrandFonts.labelBold,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  name: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 28,
    lineHeight: 34,
  },
  availability: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  availabilityText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 14,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  hint: {
    fontFamily: BrandFonts.body,
    fontSize: 13,
    marginTop: -4,
  },
  description: {
    fontFamily: BrandFonts.body,
    fontSize: 16,
    lineHeight: 25,
  },
  loader: {
    alignSelf: 'flex-start',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ingredient: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingredientText: {
    flex: 1,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  notes: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 14,
    fontFamily: BrandFonts.body,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  priceLabel: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 14,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  price: {
    fontFamily: BrandFonts.display,
    fontSize: 38,
  },
  currency: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: -6,
  },
  cancel: {
    flex: 1,
  },
  confirm: {
    flex: 2,
  },
});
