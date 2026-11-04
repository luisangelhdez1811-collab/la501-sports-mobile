import { StyleSheet, Text, View } from 'react-native';

import { BrandButton } from '@/components/brand/brand-button';
import { FormMessage } from '@/components/brand/form-message';
import { TextField } from '@/components/brand/text-field';
import { TextLink } from '@/components/brand/text-link';
import { CodeField, ResendCode } from '@/components/verification/code-input';
import { BrandFonts } from '@/constants/brand';
import { usePhoneChange } from '@/hooks/use-account-actions';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { normalizePhone } from '@/utils/validation';

/**
 * The account's phone, with "Cambiar teléfono": a code goes to the NEW number and the
 * number is saved only once that code is confirmed, so nobody can claim someone else's.
 */
export function PhoneChange({ current, onChanged }: { current: string | null; onChanged: () => void }) {
  const { colors } = useBrandTheme();
  const { step, phone, setPhone, code, setCode, busy, message, cooldownRemaining, start, sendCode, confirm, cancel } = usePhoneChange(
    current,
    onChanged,
  );

  return (
    <View style={styles.container}>
      <TextField label="Teléfono" value={current ?? ''} placeholder="Sin teléfono" editable={false} />
      {!!message && <FormMessage type={message.type}>{message.text}</FormMessage>}

      {step === 'idle' && (
        <BrandButton
          title={current ? 'Cambiar teléfono' : 'Agregar teléfono'}
          variant="secondary"
          icon={{ ios: 'phone', android: 'call', web: 'call' }}
          onPress={start}
        />
      )}

      {step === 'phone' && (
        <>
          <TextField
            label="Teléfono nuevo"
            placeholder="771 000 0000"
            value={phone}
            onChangeText={(v) => setPhone(normalizePhone(v))}
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={10}
            hint="Te enviaremos un código a este número para confirmar que es tuyo."
          />
          <BrandButton title="Enviar código por SMS" onPress={sendCode} loading={busy} />
          <TextLink label="Cancelar" muted onPress={cancel} />
        </>
      )}

      {step === 'code' && (
        <>
          <Text style={[styles.lead, { color: colors.textSecondary }]}>
            {`Escribe el código que enviamos por SMS al ${phone}.`}
          </Text>
          <CodeField value={code} onChange={setCode} />
          <BrandButton title="Confirmar teléfono" onPress={confirm} loading={busy} />
          <ResendCode remaining={cooldownRemaining} onResend={sendCode} />
          <TextLink label="Cancelar" muted onPress={cancel} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  lead: {
    fontFamily: BrandFonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
});
