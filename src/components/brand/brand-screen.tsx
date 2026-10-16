import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/brand/app-header';
import { Brand } from '@/constants/brand';
import { BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { useBrandTheme } from '@/hooks/use-brand-theme';

type BrandScreenProps = {
  children: ReactNode;
  /** Pushed screens (login, configuración…) show a back button instead of sitting in a tab. */
  showBack?: boolean;
  contentStyle?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
};

/** Header + keyboard-aware scroll content, used by every non-list screen. */
export function BrandScreen({
  children,
  showBack = false,
  contentStyle,
  refreshing,
  onRefresh,
}: BrandScreenProps) {
  const { colors } = useBrandTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppHeader showBack={showBack} />
      <KeyboardAvoidingView style={styles.screen} behavior="padding">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={Brand.orange}
                colors={[Brand.orange]}
                progressBackgroundColor={colors.surface}
              />
            ) : undefined
          }
          contentContainerStyle={[
            styles.content,
            { paddingBottom: (showBack ? insets.bottom : BottomTabInset) + 32 },
            contentStyle,
          ]}>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: 16,
    paddingTop: 24,
    gap: 20,
  },
});
