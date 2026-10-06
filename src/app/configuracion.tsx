import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getAccount, togglePromoSubscription, updatePassword } from '@/api/account';
import { errorMessage } from '@/api/client';
import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { FormCard } from '@/components/brand/form-card';
import { FormMessage } from '@/components/brand/form-message';
import { PasswordRules } from '@/components/brand/password-rules';
import { TextField } from '@/components/brand/text-field';
import { BrandFonts } from '@/constants/brand';
import { useAuth } from '@/hooks/use-auth';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { isStrongPassword } from '@/utils/validation';

type Message = { type: 'error' | 'success'; text: string } | null;

function CardHeader({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  const { colors } = useBrandTheme();
  return (
    <View style={styles.cardHeader}>
      <Text style={styles.cardEmoji}>{emoji}</Text>
      <View style={styles.cardHeaderText}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>{description}</Text>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { colors } = useBrandTheme();
  const { status } = useAuth();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<Message>(null);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [toggling, setToggling] = useState(false);
  const [promoMessage, setPromoMessage] = useState<Message>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const controller = new AbortController();
    getAccount(controller.signal)
      .then((account) => setSubscribed(account.promoSubscribed))
      .catch(() => {});
    return () => controller.abort();
  }, [status]);

  if (status === 'guest') return <Redirect href="/login" />;

  const savePassword = async () => {
    if (!current) return setPasswordMessage({ type: 'error', text: 'Escribe tu contraseña actual.' });
    if (!isStrongPassword(password))
      return setPasswordMessage({ type: 'error', text: 'La nueva contraseña no cumple los requisitos.' });
    if (password !== confirm)
      return setPasswordMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });

    setSavingPassword(true);
    setPasswordMessage(null);
    try {
      await updatePassword({ current, password, passwordConfirmation: confirm });
      setPasswordMessage({ type: 'success', text: 'Contraseña actualizada.' });
      setCurrent('');
      setPassword('');
      setConfirm('');
    } catch (err) {
      setPasswordMessage({ type: 'error', text: errorMessage(err) });
    } finally {
      setSavingPassword(false);
    }
  };

  const togglePromos = async () => {
    setToggling(true);
    setPromoMessage(null);
    try {
      const next = await togglePromoSubscription();
      setSubscribed((prev) => next ?? !prev);
    } catch (err) {
      setPromoMessage({ type: 'error', text: errorMessage(err) });
    } finally {
      setToggling(false);
    }
  };

  return (
    <BrandScreen showBack>
      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
          ⚙️ Configuración
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Administra la seguridad y preferencias de tu cuenta.
        </Text>
      </View>

      <FormCard>
        <CardHeader
          emoji="🔒"
          title="Cambiar contraseña"
          description="Usa una contraseña que no compartas con otras cuentas."
        />
        <TextField
          label="Contraseña actual"
          value={current}
          onChangeText={setCurrent}
          password
          autoComplete="current-password"
          textContentType="password"
        />
        <TextField
          label="Nueva contraseña"
          value={password}
          onChangeText={setPassword}
          password
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <PasswordRules value={password} />
        <TextField
          label="Confirmar nueva contraseña"
          value={confirm}
          onChangeText={setConfirm}
          password
          autoComplete="new-password"
          textContentType="newPassword"
        />
        {!!passwordMessage && <FormMessage type={passwordMessage.type}>{passwordMessage.text}</FormMessage>}
        <BrandButton title="Guardar contraseña" onPress={savePassword} loading={savingPassword} />
      </FormCard>

      <FormCard>
        <CardHeader
          emoji="✉️"
          title="Preferencias de correo"
          description="Elige si quieres enterarte de nuestras promociones."
        />
        <View style={styles.promoRow}>
          <View style={styles.promoText}>
            <Text style={[styles.promoTitle, { color: colors.text }]}>Promociones y ofertas</Text>
            <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
              Te avisamos por correo cuando haya una promoción nueva o cambie una existente.
            </Text>
          </View>
          <BrandButton
            title={subscribed ? 'Desactivar' : 'Activar'}
            variant={subscribed ? 'danger' : 'action'}
            onPress={togglePromos}
            loading={toggling}
            disabled={subscribed === null}
          />
        </View>
        {!!promoMessage && <FormMessage type={promoMessage.type}>{promoMessage.text}</FormMessage>}
      </FormCard>
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
  titleBlock: {
    gap: 4,
  },
  title: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 30,
  },
  subtitle: {
    fontFamily: BrandFonts.body,
    fontSize: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  cardEmoji: {
    fontSize: 26,
  },
  cardHeaderText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 19,
  },
  cardDescription: {
    fontFamily: BrandFonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  promoText: {
    flex: 1,
    gap: 4,
  },
  promoTitle: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 16,
  },
});
