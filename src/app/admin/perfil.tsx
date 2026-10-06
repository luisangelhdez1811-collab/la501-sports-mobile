import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AdminTitle } from '@/components/admin/admin-ui';
import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useAuth } from '@/hooks/use-auth';
import { useBrandTheme } from '@/hooks/use-brand-theme';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/** Admin account: who is signed in, settings and sign out. */
export default function AdminProfileScreen() {
  const { colors } = useBrandTheme();
  const { user, signOut } = useAuth();
  if (!user) return null;

  return (
    <BrandScreen>
      <AdminTitle title="Mi cuenta" subtitle="Sesión del panel de administración." />

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {user.avatar ? (
          <Image source={{ uri: user.avatar }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>{initials(user.name)}</Text>
          </View>
        )}
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {user.name}
        </Text>
        <Text style={[styles.email, { color: colors.textSecondary }]} numberOfLines={1}>
          {user.email}
        </Text>
        <View style={styles.role}>
          <Text style={styles.roleText}>Administrador</Text>
        </View>
      </View>

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
  card: {
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: Brand.orange,
    marginBottom: 6,
  },
  avatarFallback: {
    backgroundColor: Brand.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Brand.white,
    fontFamily: BrandFonts.labelBold,
    fontSize: 26,
  },
  name: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 20,
  },
  email: {
    fontFamily: BrandFonts.body,
    fontSize: 14,
  },
  role: {
    marginTop: 6,
    backgroundColor: `${Brand.orange}1F`,
    borderColor: `${Brand.orange}66`,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  roleText: {
    color: Brand.orange,
    fontFamily: BrandFonts.labelBold,
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
