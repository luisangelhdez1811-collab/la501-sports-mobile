import { StyleSheet, Text, View } from 'react-native';

import { FormMessage } from '@/components/brand/form-message';
import { SkewButton } from '@/components/brand/skew-button';
import { TextField } from '@/components/brand/text-field';
import { BrandTitle } from '@/components/brand/typography';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useNewsletter } from '@/hooks/use-content';

/** "¿No quieres perderte ninguna oferta?" email signup. */
export function NewsletterCard() {
  const { colors } = useBrandTheme();
  const { email, setEmail, submitting, message, submit } = useNewsletter();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <BrandTitle lead="¿No quieres perderte" accent="ninguna oferta?" size={34} />
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        Suscríbete para recibir nuestras ofertas flash directamente en tu correo.
      </Text>
      <TextField
        label="Correo electrónico"
        placeholder="tu@correo.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      {!!message && <FormMessage type={message.type}>{message.text}</FormMessage>}
      <SkewButton title="Unirme →" color="green" onPress={submit} loading={submitting} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderTopWidth: 3,
    borderTopColor: Brand.green,
    borderRadius: Radius.lg + 8,
    padding: 22,
    gap: 14,
  },
  text: {
    fontFamily: BrandFonts.body,
    fontSize: 15,
    lineHeight: 23,
  },
  button: {
    alignSelf: 'flex-start',
    marginLeft: 6,
  },
});
