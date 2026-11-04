import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
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

import type { AlcoholPolicy } from '@/api/info';
import { formatMoney, formatPrice } from '@/domain/money';
import { BrandButton } from '@/components/brand/brand-button';
import { ImagePlaceholder } from '@/components/brand/image-placeholder';
import { AlcoholNotice } from '@/components/legal/alcohol-notice';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { isAlcoholicProduct } from '@/domain/checkout-rules';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useProductDetail } from '@/hooks/use-product-detail';
import type { Ingredient, MenuOption, OptionGroup, Product } from '@/types/product';
import {
  addOne,
  canAddMore,
  countOf,
  createSelection,
  groupRule,
  groupTotal,
  missingChoices,
  reminders,
  removeOne,
  selectVariant,
  toggle,
  unitPrice,
  type Selection,
} from '@/domain/menu-options';
import { menuImage } from '@/utils/image-source';

type ProductDetailSheetProps = {
  product: Product | null;
  onClose: () => void;
  /**
   * Present → ordering mode ("Arma tu pedido"): ingredient checklist, comments and
   * Cancelar / Agregar al pedido. Absent → read-only menu card.
   */
  onAdd?: (product: Product, excluded: Ingredient[], notes: string, quantity: number, selection: Selection) => void;
  /** Ordering mode: choices already made for this dish (e.g. editing a table's order). */
  initialExcluded?: Ingredient[];
  initialNotes?: string;
  /** Ordering mode: also pick how many (the waiter's order). */
  withQuantity?: boolean;
  initialQuantity?: number;
  /** Ordering mode, editing a dish already chosen: a button to take it out. */
  onRemove?: () => void;
  /** Ordering mode button text, "Agregar al pedido" by default. */
  confirmLabel?: string;
  /** Who the checklist speaks to, e.g. "Desmarca lo que el cliente no quiera." */
  ingredientsHint?: string;
  /** Customer menu: legend on drinks with alcohol, and no adding while sales are closed. */
  alcohol?: AlcoholPolicy;
};

const ingredientKey = (ingredient: Ingredient) => String(ingredient.id ?? ingredient.name);
const MAX_QUANTITY = 50;
const MAX_NOTES = 100;

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
            ? { backgroundColor: Brand.orangeFill, borderColor: Brand.orange }
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

/** One option of a list (sauce, fries…); with repeats allowed, a − n + counter once picked. */
function OptionChoice({
  group,
  option,
  selection,
  onChange,
}: {
  group: OptionGroup;
  option: MenuOption;
  selection: Selection;
  onChange: (next: Selection) => void;
}) {
  const { colors } = useBrandTheme();
  const count = countOf(selection, option);
  const detail = [option.detail, option.price > 0 ? `+${formatPrice(option.price)}` : ''].filter(Boolean).join(' · ');
  const more = canAddMore(group, option, selection);

  return (
    <View
      style={[
        styles.ingredient,
        count > 0
          ? { backgroundColor: `${Brand.orange}1A`, borderColor: Brand.orange }
          : { backgroundColor: colors.background, borderColor: colors.border },
      ]}>
      <Pressable
        accessibilityRole={group.max === 1 ? 'radio' : 'checkbox'}
        accessibilityState={{ checked: count > 0 }}
        accessibilityLabel={[option.name, detail].filter(Boolean).join(', ')}
        onPress={() => onChange(toggle(group, option, selection))}
        style={styles.optionMain}>
        <Text style={[styles.ingredientText, { color: colors.text }]}>{option.name}</Text>
        {!!detail && <Text style={[styles.optionDetail, { color: colors.textSecondary }]}>{detail}</Text>}
      </Pressable>
      {group.maxPerOption > 1 && count > 0 && (
        <View style={styles.optionStepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Quitar una ${option.name}`}
            hitSlop={6}
            onPress={() => onChange(removeOne(option, selection))}
            style={[styles.optionStep, { borderColor: colors.border }]}>
            <Text style={[styles.optionStepText, { color: colors.text }]}>−</Text>
          </Pressable>
          <Text style={[styles.optionCount, { color: colors.text }]}>{count}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Agregar otra ${option.name}`}
            hitSlop={6}
            disabled={!more}
            onPress={() => onChange(addOne(group, option, selection))}
            style={[styles.optionStep, { borderColor: colors.border, opacity: more ? 1 : 0.35 }]}>
            <Text style={[styles.optionStepText, { color: colors.text }]}>+</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/** Dish card: full name, description, ingredients and price; optionally customize and add. */
export function ProductDetailSheet({
  product,
  onClose,
  onAdd,
  initialExcluded,
  initialNotes = '',
  confirmLabel = 'Agregar al pedido',
  ingredientsHint = 'Desmarca lo que no quieras en tu platillo.',
  withQuantity = false,
  initialQuantity = 1,
  onRemove,
  alcohol,
}: ProductDetailSheetProps) {
  const { colors } = useBrandTheme();
  const insets = useSafeAreaInsets();
  const { detail, loading: loadingDetail } = useProductDetail(product);
  // Starting choices are read when the sheet mounts; give it a `key` per dish to reset them.
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set((initialExcluded ?? []).map(ingredientKey)));
  const [notes, setNotes] = useState(initialNotes);
  const [quantity, setQuantity] = useState(initialQuantity);
  // Size and options picked; null = still the dish's starting choice.
  const [picked, setPicked] = useState<Selection | null>(null);
  const selection = picked ?? (product ? createSelection(product) : { variantId: null, counts: {} });

  const ordering = !!onAdd;


  const close = () => {
    setExcluded(new Set());
    setNotes('');
    setPicked(null);
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
    onAdd(product, removed, notes, withQuantity ? quantity : 1, selection);
    close();
  };

  const remove = () => {
    onRemove?.();
    close();
  };

  const meta = [product?.category, detail?.subcategory].filter(Boolean).join(' · ');
  const ingredients = detail?.ingredients ?? [];
  // Checkout needs the server id; unavailable dishes can't be ordered either.
  const withAlcohol = !!alcohol && !!product && isAlcoholicProduct(product);
  const alcoholClosed = withAlcohol && !alcohol.salesOpen;
  const canOrder = !!product && product.available && product.id !== null && !alcoholClosed;
  // Required lists block adding; included lists left empty are only reminded.
  const missing = product ? missingChoices(product, selection) : [];
  const forgotten = product ? reminders(product, selection) : [];
  const price = product ? unitPrice(product, selection) : 0;

  return (
    <Modal visible={!!product} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Cerrar" />
        {product && (
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              style={styles.scroll}
              contentContainerStyle={{ paddingBottom: ordering ? 8 : insets.bottom + 24 }}>
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
                  {!!meta && <Text style={[styles.meta, { color: colors.accent }]}>{meta}</Text>}
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
                    <Text style={[styles.availabilityText, { color: product.available ? colors.success : colors.danger }]}>
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

                {ordering && product.variants.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Presentación</Text>
                    <View style={styles.grid}>
                      {product.variants.map((variant) => {
                        const on = selection.variantId === variant.id;
                        return (
                          <Pressable
                            key={variant.id}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: on }}
                            accessibilityLabel={`${variant.name}, ${formatPrice(variant.price)}`}
                            onPress={() => setPicked(selectVariant(selection, variant.id))}
                            style={[
                              styles.ingredient,
                              styles.optionMain,
                              on
                                ? { backgroundColor: `${Brand.orange}1A`, borderColor: Brand.orange }
                                : { backgroundColor: colors.background, borderColor: colors.border },
                            ]}>
                            <Text style={[styles.ingredientText, { color: colors.text }]}>{variant.name}</Text>
                            <Text style={[styles.optionDetail, { color: colors.success }]}>{formatPrice(variant.price)}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}

                {ordering &&
                  product.optionGroups.map((group) => (
                    <View key={group.id} style={styles.section}>
                      <View style={styles.groupHead}>
                        <Text style={[styles.sectionTitle, styles.groupTitle, { color: colors.textSecondary }]}>{group.label}</Text>
                        <Text
                          style={[
                            styles.groupRule,
                            { color: groupTotal(group, selection) < group.min ? colors.danger : colors.textSecondary },
                          ]}>
                          {groupRule(group)}
                        </Text>
                      </View>
                      <View style={styles.grid}>
                        {group.options.map((option) => (
                          <OptionChoice key={option.id} group={group} option={option} selection={selection} onChange={setPicked} />
                        ))}
                      </View>
                    </View>
                  ))}

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
                      {ingredientsHint}
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
                      // Only things that cost nothing: paid extras are picked as options, with their price.
                      placeholder="Ej: sin sal, más picante, término de la carne…"
                      placeholderTextColor={colors.textSecondary}
                      selectionColor={Brand.orange}
                      multiline
                      maxLength={MAX_NOTES}
                      style={[
                        styles.notes,
                        { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
                      ]}
                      accessibilityLabel="Comentarios para la cocina"
                    />
                    <Text style={[styles.counter, { color: colors.textSecondary }]}>
                      {notes.length}/{MAX_NOTES}
                    </Text>
                  </View>
                )}

                <View style={[styles.priceRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Precio</Text>
                  <Text style={[styles.price, { color: colors.text }]}>
                    <Text style={{ color: colors.accent }}>$</Text>
                    {formatMoney(price).slice(1)}
                    <Text style={[styles.currency, { color: colors.textSecondary }]}> {product.currency}</Text>
                  </Text>
                </View>

                {withAlcohol && <AlcoholNotice legend={alcohol.legend} />}

              </View>
            </ScrollView>

            {/* Always in reach, without scrolling past the ingredients. */}
            {ordering && (
              <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
                {alcoholClosed ? (
                  <Text style={[styles.notice, { color: colors.warning }]} accessibilityLiveRegion="polite">
                    {alcohol.closedMessage}
                  </Text>
                ) : missing.length > 0 ? (
                  <Text style={[styles.notice, { color: colors.danger }]} accessibilityLiveRegion="polite">
                    {missing[0]}
                  </Text>
                ) : (
                  forgotten.length > 0 && (
                    <Text style={[styles.notice, { color: colors.warning }]}>Sin elegir: {forgotten.join(', ')}. Puedes agregarlo así.</Text>
                  )
                )}
                {withQuantity && canOrder && (
                  <View style={styles.stepper}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Uno menos"
                      disabled={quantity <= 1}
                      onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                      style={[styles.stepButton, { borderColor: colors.border, opacity: quantity <= 1 ? 0.4 : 1 }]}>
                      <Text style={[styles.stepText, { color: colors.text }]}>−</Text>
                    </Pressable>
                    <Text style={[styles.stepValue, { color: colors.text }]} accessibilityLiveRegion="polite">
                      {quantity}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Uno más"
                      disabled={quantity >= MAX_QUANTITY}
                      onPress={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
                      style={[styles.stepButton, { borderColor: colors.border }]}>
                      <Text style={[styles.stepText, { color: colors.text }]}>+</Text>
                    </Pressable>
                  </View>
                )}
                <View style={styles.actions}>
                  {onRemove ? (
                    <BrandButton title="Quitar" variant="danger" onPress={remove} style={styles.cancel} />
                  ) : (
                    !withQuantity && <BrandButton title="Cancelar" variant="secondary" onPress={close} style={styles.cancel} />
                  )}
                  <BrandButton
                    title={
                      !canOrder
                        ? 'No disponible'
                        : withQuantity
                          ? `${confirmLabel} · ${formatMoney(price * quantity)}`
                          : confirmLabel
                    }
                    variant="action"
                    icon={canOrder ? { ios: 'cart.badge.plus', android: 'add_shopping_cart', web: 'add_shopping_cart' } : undefined}
                    onPress={add}
                    disabled={!canOrder || loadingDetail || missing.length > 0}
                    style={styles.confirm}
                  />
                </View>
              </View>
            )}
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
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  footer: {
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 24,
  },
  stepValue: {
    minWidth: 40,
    textAlign: 'center',
    fontFamily: BrandFonts.bodyBold,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
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
  optionMain: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 2,
  },
  optionDetail: {
    fontFamily: BrandFonts.body,
    fontSize: 12,
  },
  optionStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionStep: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionStepText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 16,
    lineHeight: 18,
  },
  optionCount: {
    minWidth: 14,
    textAlign: 'center',
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  groupTitle: {
    flex: 1,
  },
  groupRule: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 12,
    paddingTop: 2,
  },
  counter: {
    alignSelf: 'flex-end',
    marginTop: -4,
    fontFamily: BrandFonts.body,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  notice: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 13,
    lineHeight: 18,
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
  },
  cancel: {
    flex: 1,
  },
  confirm: {
    flex: 2,
  },
});
