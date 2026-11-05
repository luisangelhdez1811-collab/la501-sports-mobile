import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';

import { DataRow, LinkRow, PrivacySwitch, RightCard, arcoStyles } from '@/components/account/arco-ui';
import { AvatarEditor } from '@/components/account/avatar-editor';
import { DeleteAccountDialog } from '@/components/account/delete-account-dialog';
import { PhoneChange } from '@/components/account/phone-change';
import { PointsInfo } from '@/components/account/points-info';
import { BrandButton } from '@/components/brand/brand-button';
import { BrandScreen } from '@/components/brand/brand-screen';
import { FormMessage } from '@/components/brand/form-message';
import { OfflineBanner } from '@/components/brand/offline-banner';
import { PageHero } from '@/components/brand/page-hero';
import { TextField } from '@/components/brand/text-field';
import { Brand } from '@/constants/brand';
import { PRIVACY_EMAIL } from '@/content/legal';
import { useAuth } from '@/hooks/use-auth';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useMyData } from '@/hooks/use-my-data';

const ROLE_LABEL = { cliente: 'Cliente', mesero: 'Mesero', admin: 'Administrador' } as const;
const longDate = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

function emailRequest(subject: string, body: string) {
  const url = `mailto:${PRIVACY_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  Linking.openURL(url).catch(() => Alert.alert('Escríbenos a', PRIVACY_EMAIL));
}

/**
 * Derechos ARCO in one place: Acceso (see and download), Rectificación (correct),
 * Cancelación (delete the account) and Oposición (switch off promotions by email and
 * recommendations based on past orders). The logic lives in useMyData.
 */
export default function MyDataScreen() {
  const { colors } = useBrandTheme();
  const { status, user, signOut } = useAuth();
  const { account, profile, privacy, copy } = useMyData();
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (status === 'guest') return <Redirect href="/login" />;
  if (!user) return null;
  // Customer rights screen: staff exercise theirs with the employer, not in the app.
  if (user.role !== 'cliente') return <Redirect href={user.role === 'admin' ? '/admin' : '/mesero'} />;

  const data = account.data;
  const preferences = privacy.preferences;

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
          <AvatarEditor />
          <View>
            <DataRow label="Nombre" value={user.name} />
            <DataRow label="Correo electrónico" value={user.email} />
            <DataRow label="Teléfono" value={data?.phone ?? (account.loading ? 'Cargando…' : '')} />
            <DataRow label="Tipo de cuenta" value={ROLE_LABEL[user.role]} />
            {!!data?.memberSince && <DataRow label="Miembro desde" value={longDate.format(data.memberSince)} />}
            <DataRow label="Puntos" value={String(data?.points ?? user.points)} />
            {!!data && <DataRow label="Logros" value={String(data.achievements)} />}
            {!!data && <DataRow label="Reservaciones" value={String(data.reservations)} />}
            <DataRow label="Promociones por correo" value={privacy.promoSubscribed ? 'Sí, autorizadas' : 'No'} />
            {!!preferences && (
              <DataRow
                label="Recomendaciones según mis pedidos"
                value={preferences.personalizedRecommendations ? 'Sí' : 'No, me opuse'}
              />
            )}
          </View>
          <PointsInfo />
          <BrandButton
            title="Descargar una copia completa"
            variant="secondary"
            icon={{ ios: 'square.and.arrow.down', android: 'download', web: 'download' }}
            onPress={copy.download}
            loading={copy.downloading}
          />
          {!!copy.message && <FormMessage type={copy.message.type}>{copy.message.text}</FormMessage>}
        </RightCard>

        {/* R — Rectificación */}
        <RightCard letter="R" title="Rectificación" description="Corrige tus datos si son inexactos o están incompletos." color={Brand.blue}>
          <TextField label="Nombre completo" value={profile.name} onChangeText={profile.setName} autoComplete="name" />
          <TextField
            label="Correo electrónico"
            value={profile.email}
            onChangeText={profile.setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          {!!profile.message && <FormMessage type={profile.message.type}>{profile.message.text}</FormMessage>}
          <BrandButton title="Guardar correcciones" onPress={profile.save} loading={profile.saving} disabled={!profile.changed || !data} />
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
          <PrivacySwitch
            title="Promociones y ofertas por correo"
            description="Finalidad secundaria. Apágalo para dejar de recibirlas."
            value={privacy.promoSubscribed}
            onChange={(value) => privacy.set('promoEmail', value)}
            disabled={privacy.toggling || !data}
          />
          {!!preferences && (
            <PrivacySwitch
              title="Recomendaciones según mis pedidos"
              description="Usamos tus pedidos anteriores para sugerirte platillos en el carrito. Apágalo y verás sugerencias generales."
              value={preferences.personalizedRecommendations}
              onChange={(value) => privacy.set('personalizedRecommendations', value)}
              disabled={privacy.toggling}
            />
          )}
          {!!privacy.message && <FormMessage type={privacy.message.type}>{privacy.message.text}</FormMessage>}
          <Text style={[arcoStyles.description, { color: colors.textSecondary }]}>
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
          <Text style={[arcoStyles.description, { color: colors.textSecondary }]}>
            Se borran tu cuenta, tus puntos, tus logros y tus datos de contacto. Por ley se conservan los comprobantes
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
          // Signing out also wipes everything personal left on the phone (M-26).
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

const styles = StyleSheet.create({
  content: {
    padding: 0,
    paddingTop: 0,
  },
  body: {
    padding: 16,
    gap: 16,
  },
  links: {
    gap: 10,
  },
});
