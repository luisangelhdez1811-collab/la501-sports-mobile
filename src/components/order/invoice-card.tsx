import { Linking, StyleSheet, Text, View } from 'react-native';

import { BrandButton } from '@/components/brand/brand-button';
import { BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

type InvoiceCardProps = {
  folio: string;
  instructions: string;
  email: string;
};

/** "¿Necesitas factura?" on a delivered order (CFF art. 29, M-25). */
export function InvoiceCard({ folio, instructions, email }: InvoiceCardProps) {
  const { colors } = useBrandTheme();
  const write = () => {
    const subject = encodeURIComponent(`Factura del pedido #${folio}`);
    const body = encodeURIComponent(
      `Hola, quiero la factura de mi pedido #${folio}.\n\nRFC:\nRazón social:\nRégimen fiscal:\nCódigo postal:\nUso del CFDI:\n`,
    );
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`).catch(() => {});
  };
  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>¿Necesitas factura?</Text>
      <Text style={[styles.text, { color: colors.text }]}>{instructions}</Text>
      {/* Long-press copies the folio. */}
      <Text style={[styles.text, { color: colors.textSecondary }]} selectable>
        Folio: <Text style={[styles.folio, { color: colors.text }]}>#{folio}</Text> · Correo: {email}
      </Text>
      <BrandButton title="Pedir factura por correo" variant="secondary" onPress={write} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 14,
    gap: 8,
  },
  title: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  text: {
    fontFamily: BrandFonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  folio: {
    fontFamily: BrandFonts.bodyBold,
  },
});
