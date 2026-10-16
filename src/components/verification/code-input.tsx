import { StyleSheet, Text } from 'react-native';

import { formatWait } from '@/api/client';
import { TextField } from '@/components/brand/text-field';
import { TextLink } from '@/components/brand/text-link';
import { BrandFonts } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

export const CODE_LENGTH = 6;

/** Codes are digits only: anything else typed or pasted is dropped. */
export function CodeField({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  return (
    <TextField
      label="Código de verificación"
      placeholder="123456"
      value={value}
      onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, CODE_LENGTH))}
      keyboardType="number-pad"
      autoComplete="one-time-code"
      textContentType="oneTimeCode"
      maxLength={CODE_LENGTH}
      hint="Llega en unos segundos. Es válido por 10 minutos."
    />
  );
}

export function isCompleteCode(code: string) {
  return code.length === CODE_LENGTH;
}

/** "Reenviar SMS" (or "Reenviar código" for email) once the wait is over. */
export function ResendCode({
  remaining,
  onResend,
  phone = true,
}: {
  remaining: number;
  onResend: () => void;
  phone?: boolean;
}) {
  const { colors } = useBrandTheme();

  if (remaining > 0) {
    return (
      <Text style={[styles.wait, { color: colors.textSecondary }]}>
        ¿No te llegó? Podrás pedir otro en {formatWait(remaining)}.
      </Text>
    );
  }
  return <TextLink prefix="¿No te llegó?" label={phone ? 'Reenviar SMS' : 'Reenviar código'} onPress={onResend} />;
}

const styles = StyleSheet.create({
  wait: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 14,
    textAlign: 'center',
  },
});
