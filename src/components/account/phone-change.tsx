import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { requestPhoneOtp, updatePhone } from '@/api/account';
import { errorMessage } from '@/api/client';
import { BrandButton } from '@/components/brand/brand-button';
import { FormMessage } from '@/components/brand/form-message';
import { TextField } from '@/components/brand/text-field';
import { TextLink } from '@/components/brand/text-link';
import { CodeField, isCompleteCode, ResendCode } from '@/components/verification/code-input';
import { BrandFonts } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useCooldown } from '@/hooks/use-cooldown';
import { isPhone, normalizePhone } from '@/utils/validation';

type Step = 'idle' | 'phone' | 'code';
type Message = { type: 'error' | 'success'; text: string } | null;

/**
 * The account's phone, with "Cambiar teléfono": a code goes to the NEW number and the
 * number is saved only once that code is confirmed, so nobody can claim someone else's.
 */
export function PhoneChange({ current, onChanged }: { current: string | null; onChanged: () => void }) {
  const { colors } = useBrandTheme();
  const cooldown = useCooldown();
  const [step, setStep] = useState<Step>('idle');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const sendCode = async () => {
    if (!isPhone(phone)) return setMessage({ type: 'error', text: 'El teléfono debe tener 10 dígitos.' });
    if (phone === current) return setMessage({ type: 'error', text: 'Ese ya es tu teléfono actual.' });
    setBusy(true);
    setMessage(null);
    try {
      await cooldown.track(() => requestPhoneOtp(phone));
      if (step === 'code') setMessage({ type: 'success', text: 'Te enviamos un código nuevo.' });
      setStep('code');
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!isCompleteCode(code)) return setMessage({ type: 'error', text: 'Escribe el código de 6 dígitos que te enviamos.' });
    setBusy(true);
    setMessage(null);
    try {
      await updatePhone(phone, code);
      setStep('idle');
      setPhone('');
      setCode('');
      setMessage({ type: 'success', text: 'Teléfono actualizado.' });
      onChanged();
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setStep('idle');
    setPhone('');
    setCode('');
    setMessage(null);
  };

  return (
    <View style={styles.container}>
      <TextField label="Teléfono" value={current ?? ''} placeholder="Sin teléfono" editable={false} />
      {!!message && <FormMessage type={message.type}>{message.text}</FormMessage>}

      {step === 'idle' && (
        <BrandButton
          title={current ? 'Cambiar teléfono' : 'Agregar teléfono'}
          variant="secondary"
          icon={{ ios: 'phone', android: 'call', web: 'call' }}
          onPress={() => {
            setMessage(null);
            setStep('phone');
          }}
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
          <ResendCode remaining={cooldown.remaining} onResend={sendCode} />
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
