import { router } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Provider } from '@/api/info';
import { TextLink } from '@/components/brand/text-link';
import { BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

function Row({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  const { colors } = useBrandTheme();
  const text = <Text style={[styles.value, { color: onPress ? colors.accent : colors.text }]}>{value}</Text>;
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      {onPress ? (
        <Pressable accessibilityRole="link" accessibilityLabel={`${label}: ${value}`} onPress={onPress} hitSlop={8}>
          {text}
        </Pressable>
      ) : (
        text
      )}
    </View>
  );
}

/**
 * Who sells, where, and how to complain, before paying and on the order ticket
 * (LFPC art. 76 Bis III, NMX-COE-001-SCFI-2018).
 */
export function ProviderCard({ provider }: { provider: Provider }) {
  const { colors } = useBrandTheme();
  const digits = provider.phone.replace(/\D/g, '');
  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Quién te vende</Text>
      <Row label="Nombre comercial" value={provider.name} />
      <Row label="Titular" value={provider.owner} />
      {!!provider.rfc && <Row label="RFC" value={provider.rfc} />}
      <Row label="Domicilio" value={provider.address} />
      {!!digits && <Row label="Teléfono" value={provider.phone} onPress={() => Linking.openURL(`tel:${digits}`)} />}
      <Row label="Correo" value={provider.email} onPress={() => Linking.openURL(`mailto:${provider.email}`)} />
      <Row label="Quejas y aclaraciones" value={provider.complaintsHours} />
      <View style={styles.links}>
        <TextLink label="Términos y Condiciones" onPress={() => router.push('/terminos')} />
        <TextLink label="Aviso de Privacidad" onPress={() => router.push('/aviso-privacidad')} />
      </View>
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
  row: {
    gap: 1,
  },
  label: {
    fontFamily: BrandFonts.body,
    fontSize: 12,
  },
  value: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 4,
  },
});
