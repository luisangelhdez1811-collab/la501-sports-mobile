import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AVATAR_MAX_BYTES, deleteAvatar, uploadAvatar } from '@/api/account';
import { errorMessage } from '@/api/client';
import { BrandButton } from '@/components/brand/brand-button';
import { FormMessage } from '@/components/brand/form-message';
import { Brand, BrandFonts } from '@/constants/brand';
import { useAuth } from '@/hooks/use-auth';
import { useBrandTheme } from '@/hooks/use-brand-theme';

type Message = { type: 'success' | 'error'; text: string } | null;

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
  const { user, setUser } = useAuth();
  const [busy, setBusy] = useState<'upload' | 'delete' | null>(null);
  const [message, setMessage] = useState<Message>(null);

  if (!user) return null;

  const pick = async () => {
    setMessage(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    if (asset.fileSize && asset.fileSize > AVATAR_MAX_BYTES) {
      return setMessage({ type: 'error', text: 'La foto pesa más de 2 MB. Elige otra o recórtala más.' });
    }

    setBusy('upload');
    try {
      const avatar = await uploadAvatar(asset);
      if (avatar) {
        setUser({ ...user, avatar });
        setMessage({ type: 'success', text: 'Tu foto se actualizó; también se ve en la página web.' });
      } else {
        setMessage({ type: 'error', text: 'El servidor no confirmó la foto. Intenta de nuevo.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setMessage(null);
    setBusy('delete');
    try {
      await deleteAvatar();
      setUser({ ...user, avatar: null });
      setMessage({ type: 'success', text: 'Quitamos tu foto de perfil.' });
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

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
      <Text style={[styles.hint, { color: colors.textSecondary }]}>JPG, PNG o WebP de máximo 2 MB.</Text>
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
