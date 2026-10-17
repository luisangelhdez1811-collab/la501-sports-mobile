import { StyleSheet, Text, View } from 'react-native';

import { BrandScreen } from '@/components/brand/brand-screen';
import { PageHero } from '@/components/brand/page-hero';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import type { LegalBlock, LegalDocument } from '@/content/legal';
import { useBrandTheme } from '@/hooks/use-brand-theme';

function Block({ block }: { block: LegalBlock }) {
  const { colors } = useBrandTheme();

  switch (block.type) {
    case 'h2':
      return (
        <Text style={[styles.h2, { borderBottomColor: `${Brand.orange}26` }]} accessibilityRole="header">
          {block.text}
        </Text>
      );
    case 'h3':
      return <Text style={[styles.h3, { color: colors.text }]}>{block.text}</Text>;
    case 'p':
      return (
        <Text style={[styles.p, { color: colors.textSecondary }]}>
          {!!block.strong && <Text style={[styles.strong, { color: colors.text }]}>{block.strong}</Text>}
          {block.text}
        </Text>
      );
    case 'list':
      return (
        <View style={styles.list}>
          {block.items.map((item) => (
            <View key={item} style={styles.listItem}>
              <View style={styles.bullet} />
              <Text style={[styles.p, styles.listText, { color: colors.textSecondary }]}>{item}</Text>
            </View>
          ))}
        </View>
      );
    case 'table':
      // Label above value: a two-column table doesn't fit a phone.
      return (
        <View style={[styles.table, { borderColor: colors.border }]}>
          {block.rows.map(([label, value], i) => (
            <View
              key={label}
              style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
            </View>
          ))}
        </View>
      );
  }
}

/** Full legal text (privacy notice, terms) with the website's look. Works offline. */
export function LegalDocumentScreen({ document }: { document: LegalDocument }) {
  const { colors } = useBrandTheme();
  return (
    <BrandScreen showBack contentStyle={styles.content}>
      <PageHero align="center" tag="La 501 Sports" lead={document.lead} accent={document.accent} description={document.description} />
      <View style={styles.body}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.updated, { color: colors.textSecondary }]}>Última actualización: {document.updated}</Text>
          {document.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </View>
      </View>
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 0,
    paddingTop: 0,
  },
  body: {
    padding: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg + 4,
    paddingHorizontal: 18,
    paddingVertical: 20,
    gap: 10,
  },
  updated: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 12,
  },
  h2: {
    color: Brand.orange,
    fontFamily: BrandFonts.labelBold,
    fontSize: 19,
    marginTop: 14,
    paddingBottom: 6,
    borderBottomWidth: 1,
  },
  h3: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 16,
    marginTop: 6,
  },
  p: {
    fontFamily: BrandFonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  strong: {
    fontFamily: BrandFonts.bodyBold,
  },
  list: {
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    gap: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Brand.orange,
    marginTop: 8,
  },
  listText: {
    flex: 1,
  },
  table: {
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  rowLabel: {
    color: Brand.orange,
    fontFamily: BrandFonts.labelBold,
    fontSize: 13,
  },
  rowValue: {
    fontFamily: BrandFonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
});
