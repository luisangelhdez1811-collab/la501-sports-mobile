import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';

import {
  deleteAccount,
  deleteAvatar,
  getAccount,
  requestPhoneOtp,
  updatePassword,
  updatePhone,
  uploadAvatar,
  type Account,
} from '@/api/account';
import { errorMessage } from '@/api/client';
import { shrinkForAvatar } from '@/data/avatar-image';
import { useAuth } from '@/hooks/use-auth';
import { useCachedResource } from '@/hooks/use-cached-resource';
import { useCooldown } from '@/hooks/use-cooldown';
import { notOnServer, type Message } from '@/hooks/use-my-data';
import { isCompleteCode, isPhone, isStrongPassword } from '@/utils/validation';

/** ViewModels of the account screens: profile, phone, photo, password and deleting it. */

/** The signed-in person's profile (points, phone, orders) for the Cuenta tab. */
export function useAccount(enabled: boolean) {
  return useCachedResource<Account>('account', getAccount, { enabled });
}

type PhoneStep = 'idle' | 'phone' | 'code';

/**
 * "Cambiar teléfono": a code goes to the NEW number and the number is saved only once that
 * code is confirmed, so nobody can claim someone else's.
 */
export function usePhoneChange(current: string | null, onChanged: () => void) {
  const cooldown = useCooldown();
  const [step, setStep] = useState<PhoneStep>('idle');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const start = () => {
    setMessage(null);
    setStep('phone');
  };

  const sendCode = () => {
    if (!isPhone(phone)) return setMessage({ type: 'error', text: 'El teléfono debe tener 10 dígitos.' });
    if (phone === current) return setMessage({ type: 'error', text: 'Ese ya es tu teléfono actual.' });
    return run(async () => {
      await cooldown.track(() => requestPhoneOtp(phone));
      if (step === 'code') setMessage({ type: 'success', text: 'Te enviamos un código nuevo.' });
      setStep('code');
    });
  };

  const confirm = () => {
    if (!isCompleteCode(code)) return setMessage({ type: 'error', text: 'Escribe el código de 6 dígitos que te enviamos.' });
    return run(async () => {
      await updatePhone(phone, code);
      setStep('idle');
      setPhone('');
      setCode('');
      setMessage({ type: 'success', text: 'Teléfono actualizado.' });
      onChanged();
    });
  };

  const cancel = () => {
    setStep('idle');
    setPhone('');
    setCode('');
    setMessage(null);
  };

  return { step, phone, setPhone, code, setCode, busy, message, cooldownRemaining: cooldown.remaining, start, sendCode, confirm, cancel };
}

/**
 * Profile photo, the same one as on the website. Picked with the system photo picker
 * (Android Photo Picker), which needs no storage or camera permission: only the photo the
 * person chooses is sent.
 */
export function useAvatar() {
  const { user, setUser } = useAuth();
  const [busy, setBusy] = useState<'upload' | 'delete' | null>(null);
  const [message, setMessage] = useState<Message>(null);

  const pick = async () => {
    if (!user) return;
    setMessage(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    setBusy('upload');
    try {
      // A phone photo is several MB even cropped: it's sent at 512 px, which is all an
      // avatar needs, so it never goes over the server's 2 MB limit.
      let photo;
      try {
        photo = await shrinkForAvatar(asset);
      } catch {
        return setMessage({ type: 'error', text: 'No se pudo preparar esa foto. Elige otra.' });
      }
      const avatar = await uploadAvatar(photo);
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
    if (!user) return;
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

  return { user, busy, message, pick, remove };
}

/**
 * Cancelación (ARCO): deletes the account with the password. Returns 'deleted', 'by-email'
 * (the server doesn't offer it yet: the request goes by email) or null with a message.
 */
export function useDeleteAccount() {
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const remove = async (password: string): Promise<'deleted' | 'by-email' | null> => {
    setDeleting(true);
    setMessage(null);
    try {
      await deleteAccount(password);
      return 'deleted';
    } catch (err) {
      if (notOnServer(err)) return 'by-email';
      setMessage(errorMessage(err));
      return null;
    } finally {
      setDeleting(false);
    }
  };

  return { deleting, message, clearMessage: () => setMessage(null), remove };
}

/** "Cambiar contraseña": the current one, then the new one twice. */
export function useChangePassword() {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const save = async () => {
    if (!current) return setMessage({ type: 'error', text: 'Escribe tu contraseña actual.' });
    if (!isStrongPassword(password)) return setMessage({ type: 'error', text: 'La nueva contraseña no cumple los requisitos.' });
    if (password !== confirm) return setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
    setSaving(true);
    setMessage(null);
    try {
      await updatePassword({ current, password, passwordConfirmation: confirm });
      setMessage({ type: 'success', text: 'Contraseña actualizada.' });
      setCurrent('');
      setPassword('');
      setConfirm('');
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return { current, setCurrent, password, setPassword, confirm, setConfirm, saving, message, save };
}
