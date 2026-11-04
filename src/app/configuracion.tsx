import { Redirect, router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { FormCard } from '@/components/brand/form-card';
import { FormMessage } from '@/components/brand/form-message';
import { PasswordRules } from '@/components/brand/password-rules';
import { TextField } from '@/components/brand/text-field';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useChangePassword } from '@/hooks/use-account-actions';
import { useAuth } from '@/hooks/use-auth';
import { useBrandTheme } from '@/hooks/use-brand-theme';

function CardHeader({ icon, title, description }: { icon: SymbolViewProps['name']; title: string; description: string }) {
  const { colors } = useBrandTheme();
  return (
    <View style={styles.cardHeader}>
      <View style={[styles.cardIcon, { backgroundColor: `${Brand.orange}1F`, borderColor: `${Brand.orange}55` }]}>
        <SymbolView name={icon} size={20} tintColor={colors.accent} />
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
  const { current, setCurrent, password, setPassword, confirm, setConfirm, saving, message, save } = useChangePassword();

  if (status === 'guest') return <Redirect href="/login" />;

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
        {!!message && <FormMessage type={message.type}>{message.text}</FormMessage>}
        <BrandButton title="Guardar contraseña" onPress={save} loading={saving} />
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
