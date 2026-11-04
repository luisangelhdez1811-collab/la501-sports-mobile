import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { deleteAccount } from '@/api/account';
import { errorMessage } from '@/api/client';
import { arcoStyles } from '@/components/account/arco-ui';
import { BrandButton } from '@/components/brand/brand-button';
import { FormMessage } from '@/components/brand/form-message';
import { TextField } from '@/components/brand/text-field';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { notOnServer } from '@/hooks/use-my-data';

const CONFIRM_WORD = 'ELIMINAR';

/**
 * Cancelación (ARCO). Asks for the password and the word ELIMINAR, so it can't happen by
 * accident or from a borrowed, unlocked phone.
 */
export function DeleteAccountDialog({
  visible,
  onClose,
  onDeleted,
  onEmailFallback,
}: {
  visible: boolean;
  onClose: () => void;
  onDeleted: () => void;
  onEmailFallback: () => void;
}) {
  const { colors } = useBrandTheme();
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [word, setWord] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const ready = password.length > 0 && word.trim().toUpperCase() === CONFIRM_WORD;

  const close = () => {
    setPassword('');
    setWord('');
    setMessage(null);
    onClose();
  };

  const confirm = async () => {
    setDeleting(true);
    setMessage(null);
    try {
      await deleteAccount(password);
      setPassword('');
      setWord('');
      onDeleted();
    } catch (err) {
      if (notOnServer(err)) {
        close();
        Alert.alert(
          'Solicitud por correo',
          'Por ahora la eliminación de cuentas se atiende por correo en un máximo de 20 días hábiles. ¿Enviar la solicitud?',
          [
            { text: 'Ahora no', style: 'cancel' },
            { text: 'Enviar correo', onPress: onEmailFallback },
          ],
        );
      } else {
        setMessage(errorMessage(err));
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: `${Brand.red}66`, marginBottom: insets.bottom + 16 }]}>
          <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
            Eliminar mi cuenta
          </Text>
          <Text style={[arcoStyles.description, { color: colors.text }]}>
            Perderás tus puntos y tus logros: no se pueden recuperar ni cambiar por dinero.
          </Text>
          <Text style={[arcoStyles.description, { color: colors.textSecondary }]}>
            Confirma con tu contraseña y escribe <Text style={[styles.word, { color: colors.danger }]}>{CONFIRM_WORD}</Text> para
            continuar.
          </Text>
          <TextField label="Contraseña" value={password} onChangeText={setPassword} password autoComplete="current-password" />
          <TextField label={`Escribe ${CONFIRM_WORD}`} value={word} onChangeText={setWord} autoCapitalize="characters" autoCorrect={false} />
          {!!message && <FormMessage type="error">{message}</FormMessage>}
          <BrandButton title="Eliminar definitivamente" variant="danger" onPress={confirm} loading={deleting} disabled={!ready} />
          <BrandButton title="Cancelar" variant="secondary" onPress={close} disabled={deleting} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  dialog: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 18,
    gap: 12,
  },
  title: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 20,
  },
  word: {
    fontFamily: BrandFonts.bodyBold,
  },
});
