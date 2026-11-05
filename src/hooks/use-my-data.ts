import { useState } from 'react';

import { exportMyData, getAccount, togglePromoSubscription, updatePrivacy, updateProfile, type Privacy } from '@/api/account';
import { ApiError, errorMessage } from '@/api/client';
import { PRIVACY_EMAIL } from '@/content/legal';
import { shareDataCopy } from '@/data/data-export';
import { useAdminResource } from '@/hooks/use-admin-resource';
import { useAuth } from '@/hooks/use-auth';
import { isEmail } from '@/utils/validation';

export type Message = { type: 'error' | 'success'; text: string } | null;

// The server doesn't offer this action yet: the request goes by email instead.
export const notOnServer = (err: unknown) => err instanceof ApiError && (err.status === 404 || err.status === 405);

/**
 * "Mis datos y privacidad" ViewModel (derechos ARCO): the data the server keeps (Acceso),
 * corrections (Rectificación) and preferences (Oposición). Personal data is read live from
 * the server and not kept on the device.
 */
export function useMyData() {
  const { user, setUser } = useAuth();
  const account = useAdminResource('my-data', getAccount);
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<Message>(null);
  const [promoOverride, setPromoOverride] = useState<boolean | null>(null);
  const [privacyOverride, setPrivacyOverride] = useState<Privacy | null>(null);
  const [toggling, setToggling] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState<Message>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState<Message>(null);

  const data = account.data;
  // Fields show the saved values until the person edits them.
  const nameValue = name ?? user?.name ?? '';
  const emailValue = email ?? user?.email ?? '';
  const changed = !!user && (nameValue.trim() !== user.name || emailValue.trim().toLowerCase() !== user.email);
  // null: the server doesn't offer the preferences yet; only promotions by email then.
  const privacy = privacyOverride ?? data?.privacy ?? null;
  const promoSubscribed = privacy?.promoEmail ?? promoOverride ?? data?.promoSubscribed ?? false;

  // Acceso: the COMPLETE copy, built by the server (only it has everything).
  const download = async () => {
    setDownloading(true);
    setDownloadMessage(null);
    try {
      await shareDataCopy(await exportMyData());
      setDownloadMessage({ type: 'success', text: 'Tu copia está lista. Guárdala en un lugar seguro: contiene tus datos personales.' });
    } catch (err) {
      setDownloadMessage({ type: 'error', text: errorMessage(err) });
    } finally {
      setDownloading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    const nextName = nameValue.trim();
    const nextEmail = emailValue.trim().toLowerCase();
    if (nextName.length < 3) return setProfileMessage({ type: 'error', text: 'Escribe tu nombre completo.' });
    if (!isEmail(nextEmail)) return setProfileMessage({ type: 'error', text: 'Correo electrónico no válido.' });

    setSaving(true);
    setProfileMessage(null);
    try {
      // The phone goes unchanged here; a new one is confirmed by code (PhoneChange).
      await updateProfile({ name: nextName, email: nextEmail, phone: data?.phone ?? '' });
      setUser({ ...user, name: nextName, email: nextEmail });
      setName(null);
      setEmail(null);
      account.reload();
      setProfileMessage({ type: 'success', text: 'Tus datos se actualizaron.' });
    } catch (err) {
      setProfileMessage({
        type: 'error',
        text: notOnServer(err)
          ? `Por ahora la corrección de nombre o correo se atiende por correo (${PRIVACY_EMAIL}). Toca "Solicitar por correo".`
          : errorMessage(err),
      });
    } finally {
      setSaving(false);
    }
  };

  const setPreference = async (key: keyof Privacy, value: boolean) => {
    setToggling(true);
    setPrivacyMessage(null);
    try {
      if (privacy) {
        setPrivacyOverride(await updatePrivacy({ [key]: value }));
      } else {
        // Server before the privacy preferences: promotions by email still toggle.
        const next = await togglePromoSubscription();
        setPromoOverride(next ?? !promoSubscribed);
      }
    } catch (err) {
      setPrivacyMessage({ type: 'error', text: errorMessage(err) });
    } finally {
      setToggling(false);
    }
  };

  return {
    account,
    profile: { name: nameValue, setName, email: emailValue, setEmail, changed, saving, message: profileMessage, save: saveProfile },
    privacy: { preferences: privacy, promoSubscribed, toggling, message: privacyMessage, set: setPreference },
    copy: { downloading, message: downloadMessage, download },
  };
}
