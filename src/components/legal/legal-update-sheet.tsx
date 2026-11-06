import * as WebBrowser from 'expo-web-browser';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandButton } from '@/components/brand/brand-button';
import { FormMessage } from '@/components/brand/form-message';
import { TextLink } from '@/components/brand/text-link';
import { BrandFonts, Radius } from '@/constants/brand';
import { PRIVACY_NOTICE, TERMS } from '@/content/legal';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useLegalUpdate } from '@/hooks/use-legal-update';
import { useStorePolicy } from '@/hooks/use-store-policy';

const open = (url: string) => WebBrowser.openBrowserAsync(url, { dismissButtonStyle: 'close', showTitle: true });

/**
 * New Aviso de Privacidad or Terms: a screen that can't be skipped until the customer
 * accepts them (M-22). The full texts open in the browser, as published on the website.
 */
export function LegalUpdateSheet() {
  const { colors } = useBrandTheme();
  const insets = useSafeAreaInsets();
  const policy = useStorePolicy();
  const { required, accepting, error, accept } = useLegalUpdate();

  return (
    // Android's back button must not dismiss it: there's no way around accepting.
    <Modal visible={required} transparent animationType="fade" onRequestClose={() => {}} statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: colors.scrim }]}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: insets.bottom + 16 }]}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
              Actualizamos nuestros textos legales
            </Text>
            <Text style={[styles.text, { color: colors.text }]}>
              Cambiamos el Aviso de Privacidad o los Términos y Condiciones desde la última vez que los aceptaste. Para
              seguir usando tu cuenta, revísalos y acéptalos.
            </Text>
            <Text style={[styles.text, { color: colors.textSecondary }]}>
              Aviso de Privacidad: {PRIVACY_NOTICE.updated}
              {policy.privacyVersion ? ` (versión ${policy.privacyVersion})` : ''}
              {'\n'}
              Términos y Condiciones: {TERMS.updated}
              {policy.termsVersion ? ` (versión ${policy.termsVersion})` : ''}
            </Text>
            <View style={styles.links}>
              <TextLink label="Leer el Aviso de Privacidad" onPress={() => open(policy.privacyUrl)} />
              <TextLink label="Leer los Términos y Condiciones" onPress={() => open(policy.termsUrl)} />
            </View>
            {!!error && <FormMessage type="error">{error}</FormMessage>}
            <BrandButton title="Acepto" variant="action" onPress={accept} loading={accepting} disabled={accepting} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  sheet: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    maxHeight: '85%',
  },
  content: {
    padding: 20,
    gap: 14,
  },
  title: {
    fontFamily: BrandFonts.display,
    fontSize: 30,
    letterSpacing: 1,
  },
  text: {
    fontFamily: BrandFonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  links: {
    gap: 10,
  },
});
