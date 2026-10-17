import { Redirect, router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Modal, Pressable, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { deleteAccount, getAccount, togglePromoSubscription, updateProfile } from '@/api/account';
import { ApiError, errorMessage } from '@/api/client';
import { PhoneChange } from '@/components/account/phone-change';
import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { FormMessage } from '@/components/brand/form-message';
import { OfflineBanner } from '@/components/brand/offline-banner';
import { PageHero } from '@/components/brand/page-hero';
import { TextField } from '@/components/brand/text-field';
import { Brand, BrandFonts, Radius } from '@/constants/brand';
import { PRIVACY_EMAIL } from '@/content/legal';
import { useAdminResource } from '@/hooks/use-admin-resource';
import { useAuth } from '@/hooks/use-auth';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { isEmail } from '@/utils/validation';

type Icon = SymbolViewProps['name'];
type Message = { type: 'error' | 'success'; text: string } | null;

const ROLE_LABEL = { cliente: 'Cliente', mesero: 'Mesero', admin: 'Administrador' } as const;
const longDate = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
const CONFIRM_WORD = 'ELIMINAR';

// The server doesn't offer this action yet: the request goes by email instead.
const notOnServer = (err: unknown) => err instanceof ApiError && (err.status === 404 || err.status === 405);

function emailRequest(subject: string, body: string) {
  const url = `mailto:${PRIVACY_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  Linking.openURL(url).catch(() => Alert.alert('Escríbenos a', PRIVACY_EMAIL));
}

/** Card with an ARCO letter badge (A, R, C, O), title and description. */
function RightCard({
  letter,
  title,
  description,
  color = Brand.orange,
  children,
}: {
  letter: string;
  title: string;
  description: string;
  color?: string;
  children: ReactNode;
}) {
  const { colors } = useBrandTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderTopColor: color }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.letter, { backgroundColor: `${color}1F`, borderColor: `${color}66` }]}>
          <Text style={[styles.letterText, { color }]}>{letter}</Text>
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={[styles.cardTitle, { color: colors.text }]} accessibilityRole="header">
            {title}
          </Text>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>{description}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  const { colors } = useBrandTheme();
  return (
    <View style={[styles.dataRow, { borderTopColor: colors.border }]}>
      <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.dataValue, { color: colors.text }]} selectable>
        {value || '—'}
      </Text>
    </View>
  );
}

function LinkRow({ icon, label, onPress }: { icon: Icon; label: string; onPress: () => void }) {
  const { colors } = useBrandTheme();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [styles.linkRow, { borderColor: colors.border, backgroundColor: pressed ? colors.border : colors.surface }]}>
      <SymbolView name={icon} size={18} tintColor={Brand.orange} />
      <Text style={[styles.linkText, { color: colors.text }]}>{label}</Text>
      <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={16} tintColor={colors.textSecondary} />
    </Pressable>
  );
}

/**
 * Derechos ARCO in one place: Acceso (see and download), Rectificación (correct),
 * Cancelación (delete the account) and Oposición (opt out of promotions). Personal data
 * is read live from the server and not kept on the device.
 */
export default function MyDataScreen() {
  const { colors } = useBrandTheme();
  const { status, user, setUser, signOut } = useAuth();
  const account = useAdminResource('my-data', getAccount);

  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<Message>(null);
  const [promoOverride, setPromoOverride] = useState<boolean | null>(null);
  const [toggling, setToggling] = useState(false);
  const [promoMessage, setPromoMessage] = useState<Message>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (status === 'guest') return <Redirect href="/login" />;
  if (!user) return null;
  // Customer rights screen: staff exercise theirs with the employer, not in the app.
  if (user.role !== 'cliente') return <Redirect href={user.role === 'admin' ? '/admin' : '/mesero'} />;

  const data = account.data;
  // Fields show the saved values until the person edits them.
  const nameValue = name ?? user.name;
  const emailValue = email ?? user.email;
  const changed = nameValue.trim() !== user.name || emailValue.trim().toLowerCase() !== user.email;
  const promoSubscribed = promoOverride ?? data?.promoSubscribed ?? false;

  const download = () => {
    const copy = {
      generado: new Date().toISOString(),
      responsable: 'La 501 Sports Restaurant',
      titular: {
        nombre: user.name,
        correo: user.email,
        telefono: data?.phone ?? null,
        tipo_de_cuenta: ROLE_LABEL[user.role],
        miembro_desde: data?.memberSince?.toISOString() ?? null,
      },
      actividad: {
        puntos: data?.points ?? user.points,
        logros: data?.achievements ?? 0,
        reservaciones: data?.reservations ?? 0,
        pedidos_recientes: (data?.recentOrders ?? []).map((order) => ({
          folio: order.folio,
          fecha: order.createdAt?.toISOString() ?? null,
          total: order.total,
          estado: order.status,
        })),
      },
      preferencias: { promociones_por_correo: promoSubscribed },
    };
    Share.share({ title: 'Mis datos — La 501 Sports', message: JSON.stringify(copy, null, 2) }).catch(() => {});
  };

  const saveProfile = async () => {
    const nextName = nameValue.trim();
    const nextEmail = emailValue.trim().toLowerCase();
    if (nextName.length < 3) return setProfileMessage({ type: 'error', text: 'Escribe tu nombre completo.' });
    if (!isEmail(nextEmail)) return setProfileMessage({ type: 'error', text: 'Correo electrónico no válido.' });

    setSaving(true);
    setProfileMessage(null);
    try {
      // The phone goes unchanged here; a new one is confirmed by code (PhoneChange below).
      await updateProfile({ name: nextName, email: nextEmail, phone: data?.phone ?? '' });
      setUser({ ...user, name: nextName, email: nextEmail });
      setName(null);
      setEmail(null);
      account.reload();
      setProfileMessage({ type: 'success', text: 'Tus datos se actualizaron.' });
    } catch (err) {
      if (notOnServer(err)) {
        setProfileMessage({
          type: 'error',
          text: `Por ahora la corrección de nombre o correo se atiende por correo (${PRIVACY_EMAIL}). Toca "Solicitar por correo".`,
        });
      } else {
        setProfileMessage({ type: 'error', text: errorMessage(err) });
      }
    } finally {
      setSaving(false);
    }
  };

  const togglePromos = async () => {
    setToggling(true);
    setPromoMessage(null);
    try {
      const next = await togglePromoSubscription();
      setPromoOverride(next ?? !promoSubscribed);
    } catch (err) {
      setPromoMessage({ type: 'error', text: errorMessage(err) });
    } finally {
      setToggling(false);
    }
  };

  return (
    <BrandScreen showBack contentStyle={styles.content}>
      <PageHero
        align="center"
        tag="Derechos ARCO"
        lead="Mis datos"
        accent="y privacidad"
        description="Consulta, corrige, elimina u oponte al uso de tus datos personales."
      />

      <View style={styles.body}>
        <OfflineBanner />
        {!!account.error && <FormMessage type="error">{account.error}</FormMessage>}

        {/* A — Acceso */}
        <RightCard letter="A" title="Acceso" description="Los datos personales que La 501 tiene de ti.">
          <View>
            <DataRow label="Nombre" value={user.name} />
            <DataRow label="Correo electrónico" value={user.email} />
            <DataRow label="Teléfono" value={data?.phone ?? (account.loading ? 'Cargando…' : '')} />
            <DataRow label="Tipo de cuenta" value={ROLE_LABEL[user.role]} />
            {!!data?.memberSince && <DataRow label="Miembro desde" value={longDate.format(data.memberSince)} />}
            {user.role === 'cliente' && <DataRow label="Puntos" value={String(data?.points ?? user.points)} />}
            <DataRow label="Promociones por correo" value={promoSubscribed ? 'Sí, autorizadas' : 'No'} />
          </View>
          <BrandButton
            title="Descargar una copia"
            variant="secondary"
            icon={{ ios: 'square.and.arrow.down', android: 'download', web: 'download' }}
            onPress={download}
            disabled={!data}
          />
        </RightCard>

        {/* R — Rectificación */}
        <RightCard letter="R" title="Rectificación" description="Corrige tus datos si son inexactos o están incompletos." color={Brand.blue}>
          <TextField label="Nombre completo" value={nameValue} onChangeText={setName} autoComplete="name" />
          <TextField
            label="Correo electrónico"
            value={emailValue}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          {!!profileMessage && <FormMessage type={profileMessage.type}>{profileMessage.text}</FormMessage>}
          <BrandButton title="Guardar correcciones" onPress={saveProfile} loading={saving} disabled={!changed || !data} />
          {!!data && <PhoneChange current={data.phone || null} onChanged={account.reload} />}
          <BrandButton
            title="Solicitar por correo"
            variant="secondary"
            onPress={() =>
              emailRequest(
                'Solicitud ARCO — Rectificación',
                `Hola, soy ${user.name} (${user.email}). Solicito corregir los siguientes datos:\n\n- Dato actual:\n- Dato correcto:\n`,
              )
            }
          />
        </RightCard>

        {/* O — Oposición */}
        <RightCard letter="O" title="Oposición" description="Decide si tus datos se usan para fines no necesarios." color={Brand.greenLight}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={[styles.switchTitle, { color: colors.text }]}>Promociones y ofertas por correo</Text>
              <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
                Finalidad secundaria. Apágalo para dejar de recibirlas.
              </Text>
            </View>
            <Switch
              value={promoSubscribed}
              onValueChange={togglePromos}
              disabled={toggling || !data}
              trackColor={{ false: colors.border, true: Brand.green }}
              thumbColor={Brand.white}
              accessibilityLabel="Recibir promociones por correo"
            />
          </View>
          {!!promoMessage && <FormMessage type={promoMessage.type}>{promoMessage.text}</FormMessage>}
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            Para oponerte a otro uso de tus datos o revocar tu consentimiento, escríbenos.
          </Text>
          <BrandButton
            title="Solicitar oposición por correo"
            variant="secondary"
            onPress={() =>
              emailRequest(
                'Solicitud ARCO — Oposición',
                `Hola, soy ${user.name} (${user.email}). Me opongo al uso de mis datos para la siguiente finalidad:\n\n`,
              )
            }
          />
        </RightCard>

        {/* C — Cancelación */}
        <RightCard letter="C" title="Cancelación" description="Elimina tu cuenta y tus datos personales." color={Brand.red}>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            Se borran tu cuenta, tus puntos y tus datos de contacto. Por ley se conservan los comprobantes
            fiscales de tus compras durante 5 años, sin usarlos para nada más. Esta acción no se puede deshacer.
          </Text>
          <BrandButton title="Eliminar mi cuenta" variant="danger" onPress={() => setDeleteOpen(true)} />
        </RightCard>

        <View style={styles.links}>
          <LinkRow
            icon={{ ios: 'lock.doc', android: 'privacy_tip', web: 'privacy_tip' }}
            label="Aviso de privacidad"
            onPress={() => router.push('/aviso-privacidad')}
          />
          <LinkRow
            icon={{ ios: 'doc.text', android: 'description', web: 'description' }}
            label="Términos y condiciones"
            onPress={() => router.push('/terminos')}
          />
        </View>
      </View>

      <DeleteAccountDialog
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={async () => {
          setDeleteOpen(false);
          await signOut();
          router.replace('/');
          Alert.alert('Cuenta eliminada', 'Tu cuenta y tus datos personales fueron eliminados.');
        }}
        onEmailFallback={() =>
          emailRequest(
            'Solicitud ARCO — Cancelación de cuenta',
            `Hola, soy ${user.name} (${user.email}). Solicito la cancelación de mi cuenta y la eliminación de mis datos personales.`,
          )
        }
      />
    </BrandScreen>
  );
}

/** Asks for the password and the word ELIMINAR before deleting, so it can't happen by accident. */
function DeleteAccountDialog({
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
          <Text style={[styles.dialogTitle, { color: colors.text }]} accessibilityRole="header">
            Eliminar mi cuenta
          </Text>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            Confirma con tu contraseña y escribe <Text style={styles.word}>{CONFIRM_WORD}</Text> para continuar.
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
  content: {
    padding: 0,
    paddingTop: 0,
  },
  body: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderTopWidth: 3,
    borderRadius: Radius.lg,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  letter: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    fontFamily: BrandFonts.display,
    fontSize: 24,
  },
  cardHeaderText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 19,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardDescription: {
    fontFamily: BrandFonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  dataRow: {
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  dataLabel: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  dataValue: {
    fontFamily: BrandFonts.bodyMedium,
    fontSize: 15,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  switchTitle: {
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
  },
  links: {
    gap: 10,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  linkText: {
    flex: 1,
    fontFamily: BrandFonts.bodyBold,
    fontSize: 15,
  },
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
  dialogTitle: {
    fontFamily: BrandFonts.labelBold,
    fontSize: 20,
  },
  word: {
    color: Brand.red,
    fontFamily: BrandFonts.bodyBold,
  },
});
