import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { getAccount, updatePhone, type Account } from '@/api/account';
import { errorMessage } from '@/api/client';
import { OrdersList } from '@/components/account/orders-list';
import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { OfflineBanner } from '@/components/brand/offline-banner';
import { FormCard } from '@/components/brand/form-card';
import { FormMessage } from '@/components/brand/form-message';
import { TextField } from '@/components/brand/text-field';
import { BrandTitle } from '@/components/brand/typography';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useAuth } from '@/hooks/use-auth';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useCachedResource } from '@/hooks/use-cached-resource';
import { isPhone, normalizePhone } from '@/utils/validation';

const monthYear = new Intl.DateTimeFormat('es-MX', { month: 'short', year: 'numeric' });

const BENEFITS = [
  { emoji: '🏆', text: 'Acumula puntos La 501 en cada pedido' },
  { emoji: '🎖️', text: 'Desbloquea logros y recompensas' },
  { emoji: '🧾', text: 'Consulta tus pedidos y reservaciones' },
];

function GuestAccount() {
  const { colors } = useBrandTheme();

  return (
    <>
      <BrandTitle lead="Tu" accent="cuenta" />
      <Text style={[styles.lead, { color: colors.textSecondary }]}>
        No necesitas cuenta para pedir o reservar. Regístrate solo si quieres sumar puntos.
      </Text>
      <FormCard icon={{ ios: 'star.fill', android: 'star', web: 'star' }} title="Únete a La 501">
        {BENEFITS.map((benefit) => (
          <View key={benefit.text} style={styles.benefit}>
            <Text style={styles.benefitEmoji}>{benefit.emoji}</Text>
            <Text style={[styles.benefitText, { color: colors.text }]}>{benefit.text}</Text>
          </View>
        ))}
        <BrandButton title="Iniciar sesión" onPress={() => router.push('/login')} />
        <BrandButton title="Crear cuenta" variant="secondary" onPress={() => router.push('/registro')} />
      </FormCard>
    </>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  const { colors } = useBrandTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export default function AccountScreen() {
  const { colors } = useBrandTheme();
  const { status, user, signOut } = useAuth();
  const [phoneDraft, setPhoneDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const signedIn = status === 'authenticated';
  const {
    data: account,
    error: loadError,
    refreshing,
    stale,
    reload,
    refresh,
  } = useCachedResource<Account>('account', getAccount, { enabled: signedIn });

  // The field shows the saved phone until the customer starts editing it.
  const phone = phoneDraft ?? account?.phone ?? '';
  const setPhone = (value: string) => setPhoneDraft(value);

  if (status === 'loading') {
    return (
      <BrandScreen>
        <ActivityIndicator color={Brand.orange} size="large" style={styles.loader} />
      </BrandScreen>
    );
  }

  if (!signedIn || !user) {
    return (
      <BrandScreen>
        <GuestAccount />
      </BrandScreen>
    );
  }

  const savePhone = async () => {
    if (!isPhone(phone)) return setMessage({ type: 'error', text: 'El teléfono debe tener 10 dígitos.' });
    setSaving(true);
    setMessage(null);
    try {
      await updatePhone(normalizePhone(phone));
      setMessage({ type: 'success', text: 'Teléfono actualizado.' });
      setPhoneDraft(null);
      reload();
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <BrandScreen refreshing={refreshing} onRefresh={refresh}>
      <OfflineBanner stale={stale} onRetry={reload} />
      <FormCard>
        <View style={styles.profile}>
          <View style={styles.avatarRing}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarLetter}>{user.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
          {account?.memberSince && (
            <Text style={[styles.memberSince, { color: colors.textSecondary }]}>
              Miembro desde {monthYear.format(account.memberSince)}
            </Text>
          )}
          {user.role !== 'cliente' && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user.role === 'admin' ? 'Administrador' : 'Mesero'}</Text>
            </View>
          )}
        </View>
        <View style={[styles.stats, { borderTopColor: colors.border }]}>
          <Stat value={account?.points ?? user.points} label="Puntos" color={Brand.orange} />
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <Stat value={account?.achievements ?? 0} label="Logros" color={Brand.greenLight} />
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <Stat value={account?.reservations ?? 0} label="Reservas" color={colors.text} />
        </View>
      </FormCard>

      {!!loadError && <FormMessage type="error">{loadError}</FormMessage>}

      <FormCard accent="green">
        <Text style={[styles.cardTitle, { color: colors.text }]}>Información de contacto</Text>
        <TextField
          label="Correo electrónico"
          value={user.email}
          editable={false}
          hint="Dato de seguridad (no editable)"
        />
        <TextField
          label="Teléfono"
          value={phone}
          onChangeText={(v) => setPhone(normalizePhone(v))}
          keyboardType="phone-pad"
          maxLength={10}
          placeholder="771 000 0000"
        />
        {!!message && <FormMessage type={message.type}>{message.text}</FormMessage>}
        <BrandButton
          title="Guardar cambios"
          icon={{ ios: 'checkmark', android: 'check', web: 'check' }}
          onPress={savePhone}
          loading={saving}
          disabled={!account || phone === account.phone}
        />
      </FormCard>

      <FormCard accent="green-orange">
        <Text style={[styles.cardTitle, { color: colors.text }]}>Mis pedidos recientes</Text>
        {account && account.recentOrders.length > 0 ? (
          <OrdersList orders={account.recentOrders.slice(0, 5)} />
        ) : (
          <Text style={[styles.lead, { color: colors.textSecondary }]}>
            {account ? 'Aún no tienes pedidos.' : 'Cargando…'}
          </Text>
        )}
        <BrandButton title="Ver todos" variant="secondary" onPress={() => router.navigate('/pedidos')} />
      </FormCard>

      <BrandButton
        title="Configuración"
        variant="secondary"
        icon={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
        onPress={() => router.push('/configuracion')}
      />
      <BrandButton title="Cerrar sesión" variant="danger" onPress={signOut} />
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 80,
  },
  lead: {
    fontFamily: BrandFonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitEmoji: {
    fontSize: 22,
  },
  benefitText: {
    flex: 1,
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 15,
  },
  profile: {
    alignItems: 'center',
    gap: 6,
  },
  avatarRing: {
    padding: 4,
    borderRadius: 64,
    borderWidth: 3,
    borderColor: Brand.orange,
    marginBottom: 8,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  avatarFallback: {
    backgroundColor: Brand.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: Brand.white,
    fontFamily: BrandFonts.display,
    fontSize: 52,
  },
  name: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 24,
    textAlign: 'center',
  },
  memberSince: {
    fontFamily: BrandFonts.body,
    fontSize: 14,
  },
  roleBadge: {
    marginTop: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Brand.blue,
    backgroundColor: `${Brand.blue}1A`,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  roleText: {
    color: Brand.blue,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  stats: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 24,
  },
  statLabel: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
  },
  cardTitle: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 20,
  },
});
