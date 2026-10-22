import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Brand } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

/** Waiter sections: the tables map (default) and the account. */
export default function WaiterTabsLayout() {
  const { colors } = useBrandTheme();

  return (
    <NativeTabs
      backgroundColor={colors.header}
      indicatorColor={colors.border}
      iconColor={{ default: colors.textSecondary, selected: Brand.orange }}
      labelStyle={{ default: { color: colors.textSecondary }, selected: { color: Brand.orange } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Mesas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} md="table_restaurant" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="perfil">
        <NativeTabs.Trigger.Label>Cuenta</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          md="account_circle"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
