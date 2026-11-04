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

import { BrandButton } from '@/components/brand/brand-button';
import { ImagePlaceholder } from '@/components/brand/image-placeholder';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { formatPrice } from '@/domain/money';
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
import type { DishChoice } from '@/domain/waiter-order';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useProductDetail } from '@/hooks/use-product-detail';
import type { Ingredient, MenuOption, OptionGroup, Product } from '@/types/product';
import { menuImage } from '@/utils/image-source';

export type { DishChoice } from '@/domain/waiter-order';

type CustomizeSheetProps = {
  product: Product | null;
  onClose: () => void;
  onAdd: (product: Product, choice: DishChoice) => void;
  /** Choices already made (editing a dish of the waiter's order). */
  initial?: Partial<DishChoice>;
  /** Also pick how many (the waiter's order). */
  withQuantity?: boolean;
  /** Editing a dish already chosen: a button to take it out. */
  onRemove?: () => void;
  /** Button text before the price, "Agregar" by default. */
  confirmLabel?: string;
  /** Said after an included list left empty: "Puedes agregarlo así." for the customer. */
  reminderNote?: string;
};

const ingredientKey = (ingredient: Ingredient) => String(ingredient.id ?? ingredient.name);
const MAX_QUANTITY = 50;
const MAX_NOTES = 100;
const AMBER = '#D97706';

function IngredientToggle({ ingredient, included, onToggle }: { ingredient: Ingredient; included: boolean; onToggle: () => void }) {
  const { colors } = useBrandTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: included }}
      accessibilityLabel={ingredient.name}
      onPress={onToggle}
      style={[styles.tile, styles.ingredient, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View
        style={[
          styles.box,
          included ? { backgroundColor: Brand.orangeFill, borderColor: Brand.orange } : { borderColor: colors.textSecondary },
        ]}>
        {included && <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={14} tintColor={Brand.white} />}
      </View>
      <Text style={[styles.tileName, { color: included ? colors.text : colors.textSecondary }, !included && styles.struck]}>
        {ingredient.name}
      </Text>
    </Pressable>
  );
}

/** One option of a list; with repeats allowed, a − n + counter once it's picked. */
function OptionTile({
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

  return (
    <View
      style={[
        styles.tile,
        count > 0
          ? { borderColor: Brand.orange, backgroundColor: `${Brand.orange}1A` }
          : { borderColor: colors.border, backgroundColor: colors.background },
      ]}>
      <Pressable
        accessibilityRole={group.max === 1 ? 'radio' : 'checkbox'}
        accessibilityState={{ checked: count > 0 }}
        accessibilityLabel={[option.name, detail].filter(Boolean).join(', ')}
        onPress={() => onChange(toggle(group, option, selection))}
        style={styles.tileMain}>
        <Text style={[styles.tileName, { color: colors.text }]}>{option.name}</Text>
        {!!detail && <Text style={[styles.tileDetail, { color: colors.textSecondary }]}>{detail}</Text>}
      </Pressable>
      {group.maxPerOption > 1 && count > 0 && (
        <View style={styles.miniStepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Quitar una ${option.name}`}
            hitSlop={6}
            onPress={() => onChange(removeOne(option, selection))}
            style={[styles.miniStep, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.miniStepText, { color: colors.text }]}>−</Text>
          </Pressable>
          <Text style={[styles.miniCount, { color: colors.text }]}>{count}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Agregar otra ${option.name}`}
            hitSlop={6}
            disabled={!canAddMore(group, option, selection)}
            onPress={() => onChange(addOne(group, option, selection))}
            style={[
              styles.miniStep,
              { borderColor: colors.border, backgroundColor: colors.surface },
              !canAddMore(group, option, selection) && styles.disabled,
            ]}>
            <Text style={[styles.miniStepText, { color: colors.text }]}>+</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/**
 * "Personalizar …", the same card as the website's: size, option lists (sauce, fries,
 * extras) with their rules, ingredients to keep, comments, and the price as it adds up.
 * Required lists block adding; included lists left empty are only reminded.
 * Starting choices are read when the sheet mounts: give it a `key` per dish to reset them.
 */
export function CustomizeSheet({
  product,
  onClose,
  onAdd,
  initial,
  withQuantity = false,
  onRemove,
  confirmLabel = 'Agregar',
  reminderNote = 'Puedes agregarlo así.',
}: CustomizeSheetProps) {
  const { colors } = useBrandTheme();
  const insets = useSafeAreaInsets();
  const { detail, loading: loadingDetail } = useProductDetail(product);
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set((initial?.excluded ?? []).map(ingredientKey)));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [quantity, setQuantity] = useState(initial?.quantity ?? 1);
  const [selection, setSelection] = useState<Selection>(
    () => initial?.selection ?? (product ? createSelection(product) : { variantId: null, counts: {} }),
  );



  const toggleIngredient = (ingredient: Ingredient) => {
    setExcluded((current) => {
      const next = new Set(current);
      const key = ingredientKey(ingredient);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (!product) return <Modal visible={false} transparent />;

  const ingredients = detail?.ingredients ?? [];
  const missing = missingChoices(product, selection);
  const forgotten = reminders(product, selection);
  // Checkout needs the server id; unavailable dishes can't be ordered either.
  const canOrder = product.available && product.id !== null;
  const price = unitPrice(product, selection) * (withQuantity ? quantity : 1);

  const add = () => {
    if (!canOrder || missing.length > 0) return;
    onAdd(product, {
      excluded: ingredients.filter((i) => excluded.has(ingredientKey(i))),
      notes: notes.trim(),
      quantity: withQuantity ? quantity : 1,
      selection,
    });
    onClose();
  };

  const remove = () => {
    onRemove?.();
    onClose();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
              Personalizar {product.name}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} hitSlop={10} style={styles.close}>
              <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={20} tintColor={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" style={styles.scroll} contentContainerStyle={styles.body}>
            <View style={styles.info}>
              {product.image ? (
                <Image
                  source={menuImage(product.image)}
                  style={styles.thumb}
                  contentFit="cover"
                  transition={200}
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <ImagePlaceholder style={styles.thumb} />
              )}
              <View style={styles.infoText}>
                {!!product.presentation && <Text style={[styles.presentation, { color: colors.accent }]}>{product.presentation}</Text>}
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                  {product.description || 'Personaliza tu platillo antes de agregarlo.'}
                </Text>
                {!product.available && <Text style={[styles.soldOut, { color: colors.danger }]}>Agotado por ahora</Text>}
              </View>
            </View>

            {product.variants.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Presentación</Text>
                <View style={styles.grid}>
                  {product.variants.map((variant) => {
                    const on = selection.variantId === variant.id;
                    return (
                      <Pressable
                        key={variant.id}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={`${variant.name}, ${formatPrice(variant.price)}`}
                        onPress={() => setSelection((s) => selectVariant(s, variant.id))}
                        style={[
                          styles.tile,
                          styles.tileMain,
                          on
                            ? { borderColor: Brand.orange, backgroundColor: `${Brand.orange}1A` }
                            : { borderColor: colors.border, backgroundColor: colors.background },
                        ]}>
                        <Text style={[styles.tileName, { color: colors.text }]}>{variant.name}</Text>
                        <Text style={[styles.variantPrice, { color: colors.success }]}>{formatPrice(variant.price)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {product.optionGroups.map((group) => {
              const short = groupTotal(group, selection) < group.min;
              return (
                <View key={group.id} style={styles.section}>
                  <View style={styles.groupHead}>
                    <Text style={[styles.sectionTitle, styles.groupTitle, { color: colors.text }]}>{group.label}</Text>
                    <Text style={[styles.rule, { color: short ? colors.danger : colors.textSecondary }]}>{groupRule(group)}</Text>
                  </View>
                  <View style={styles.grid}>
                    {group.options.map((option) => (
                      <OptionTile key={option.id} group={group} option={option} selection={selection} onChange={setSelection} />
                    ))}
                  </View>
                </View>
              );
            })}

            {loadingDetail && <ActivityIndicator color={Brand.orange} style={styles.loader} />}

            {ingredients.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Ingredientes a incluir:</Text>
                <View style={styles.grid}>
                  {ingredients.map((ingredient) => (
                    <IngredientToggle
                      key={ingredientKey(ingredient)}
                      ingredient={ingredient}
                      included={!excluded.has(ingredientKey(ingredient))}
                      onToggle={() => toggleIngredient(ingredient)}
                    />
                  ))}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Comentarios / Extra:</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Ej: sin sal, más picante, término de la carne…"
                placeholderTextColor={colors.textSecondary}
                selectionColor={Brand.orange}
                multiline
                maxLength={MAX_NOTES}
                style={[styles.notes, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                accessibilityLabel="Comentarios para la cocina"
              />
              <Text style={[styles.help, { color: colors.textSecondary }]}>
                Cualquier instrucción especial para la cocina. {notes.length}/{MAX_NOTES}
              </Text>
            </View>
          </ScrollView>

          <View
            style={[
              styles.footer,
              { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + 14 },
            ]}>
            {missing.length > 0 ? (
              <Text style={[styles.notice, { color: colors.danger }]} accessibilityLiveRegion="polite">
                {missing[0]}
              </Text>
            ) : (
              forgotten.length > 0 && (
                <Text style={[styles.notice, { color: AMBER }]}>
                  Sin elegir: {forgotten.join(', ')}. {reminderNote}
                </Text>
              )
            )}

            {withQuantity && canOrder && (
              <View style={styles.stepper}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Uno menos"
                  disabled={quantity <= 1}
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  style={[styles.stepButton, { borderColor: colors.border }, quantity <= 1 && styles.disabled]}>
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
                <BrandButton title="Cancelar" variant="secondary" onPress={onClose} style={styles.cancel} />
              )}
              <BrandButton
                title={canOrder ? `${confirmLabel} · ${formatPrice(price)}` : 'No disponible'}
                variant="action"
                onPress={add}
                disabled={!canOrder || missing.length > 0 || loadingDetail}
                style={styles.confirm}
              />
            </View>
          </View>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    flex: 1,
    fontFamily: BrandFonts.labelBold,
    fontSize: 24,
    lineHeight: 30,
  },
  close: {
    paddingTop: 4,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  body: {
    padding: 24,
    gap: 24,
  },
  info: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: Radius.md,
  },
  infoText: {
    flex: 1,
    gap: 4,
  },
  presentation: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 13,
  },
  description: {
    fontFamily: BrandFonts.body,
    fontSize: 15,
    lineHeight: 23,
  },
  soldOut: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 13,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 15,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
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
  rule: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 12,
    paddingTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    flexBasis: '46%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderWidth: 1.5,
    borderRadius: Radius.md,
  },
  tileMain: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 2,
  },
  tileName: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
  },
  tileDetail: {
    fontFamily: BrandFonts.body,
    fontSize: 12,
  },
  variantPrice: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
  },
  miniStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 10,
  },
  miniStep: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniStepText: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 16,
    lineHeight: 18,
  },
  miniCount: {
    minWidth: 14,
    textAlign: 'center',
    fontFamily: BrandFonts.bodyBold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  ingredient: {
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  loader: {
    alignSelf: 'flex-start',
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
  help: {
    fontFamily: BrandFonts.body,
    fontSize: 13,
    marginTop: -4,
  },
  footer: {
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  notice: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 13,
    lineHeight: 18,
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
  disabled: {
    opacity: 0.35,
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
