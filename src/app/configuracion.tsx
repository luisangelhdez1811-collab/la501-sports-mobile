import { Redirect, router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { updatePassword } from '@/api/account';
import { errorMessage } from '@/api/client';
import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { FormCard } from '@/components/brand/form-card';
import { FormMessage } from '@/components/brand/form-message';
import { PasswordRules } from '@/components/brand/password-rules';
import { TextField } from '@/components/brand/text-field';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useAuth } from '@/hooks/use-auth';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { isStrongPassword } from '@/utils/validation';

type Message = { type: 'error' | 'success'; text: string } | null;

function CardHeader({ icon, title, description }: { icon: SymbolViewProps['name']; title: string; description: string }) {
  const { colors } = useBrandTheme();
  return (
    <View style={styles.cardHeader}>
      <View style={[styles.cardIcon, { backgroundColor: `${Brand.orange}1F`, borderColor: `${Brand.orange}55` }]}>
        <SymbolView name={icon} size={20} tintColor={Brand.orange} />
      </View>
      <View style={styles.cardHeaderText}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>{description}</Text>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { colors } = useBrandTheme();
  const { status, user } = useAuth();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<Message>(null);

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

  return (
    <BrandScreen showBack>
      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
          Configuración
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Administra la seguridad y preferencias de tu cuenta.
        </Text>
      </View>

      <FormCard>
        <CardHeader
          icon={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
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

      {/* Customer rights screen: staff exercise theirs with the employer, not in the app. */}
      {user?.role === 'cliente' && (
        <FormCard>
          <CardHeader
            icon={{ ios: 'lock.shield', android: 'shield_person', web: 'shield_person' }}
            title="Privacidad y promociones"
            description="Consulta o corrige tus datos, elige si recibes promociones o elimina tu cuenta."
          />
          <BrandButton title="Mis datos y privacidad" variant="secondary" onPress={() => router.push('/mis-datos')} />
        </FormCard>
      )}
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
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
});
