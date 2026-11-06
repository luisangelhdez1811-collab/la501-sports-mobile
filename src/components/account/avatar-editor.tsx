import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { BrandButton } from '@/components/brand/brand-button';
import { FormMessage } from '@/components/brand/form-message';
import { Brand, BrandFonts } from '@/constants/brand';
import { useAvatar } from '@/hooks/use-account-actions';
import { useBrandTheme } from '@/hooks/use-brand-theme';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

/**
 * Profile photo, the same one as on the website. Picked with the system photo picker
 * (Android Photo Picker), which needs no storage or camera permission: only the photo the
 * person chooses is sent.
 */
export function AvatarEditor() {
  const { colors } = useBrandTheme();
  const { user, busy, message, pick, remove } = useAvatar();

  if (!user) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {user.avatar ? (
          <Image
            source={{ uri: user.avatar }}
            style={styles.photo}
            contentFit="cover"
            accessibilityLabel="Tu foto de perfil"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View
            style={[styles.photo, styles.placeholder, { backgroundColor: Brand.orangeFill }]}
            accessible
            accessibilityLabel="Sin foto de perfil">
            <Text style={styles.initials}>{initials(user.name)}</Text>
          </View>
        )}
        <View style={styles.actions}>
          <BrandButton
            title="Cambiar foto"
            variant="secondary"
            icon={{ ios: 'photo', android: 'image', web: 'image' }}
            onPress={pick}
            loading={busy === 'upload'}
            disabled={busy !== null}
          />
          {!!user.avatar && (
            <BrandButton title="Quitar foto" variant="danger" onPress={remove} loading={busy === 'delete'} disabled={busy !== null} />
          )}
        </View>
      </View>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>Elige cualquier foto: la app la ajusta al tamaño de perfil antes de subirla.</Text>
      {!!message && <FormMessage type={message.type}>{message.text}</FormMessage>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  photo: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: Brand.white,
    fontFamily: BrandFonts.labelBold,
    fontSize: 28,
  },
  actions: {
    flex: 1,
    gap: 8,
  },
  hint: {
    fontFamily: BrandFonts.body,
    fontSize: 12,
  },
});
