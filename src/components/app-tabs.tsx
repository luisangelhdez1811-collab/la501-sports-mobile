import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Brand } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

// Native tabs can't be added or removed at runtime and Android allows at most 5, so
// these are the fixed customer sections; everything else lives in the ☰ panel.
export default function AppTabs() {
  const { colors } = useBrandTheme();

  return (
    <NativeTabs
      backgroundColor={colors.header}
      indicatorColor={colors.border}
      iconColor={{ default: colors.textSecondary, selected: Brand.orange }}
      labelStyle={{ default: { color: colors.textSecondary }, selected: { color: Brand.orange } }}>
      <NativeTabs.Trigger name="(menu)">
        <NativeTabs.Trigger.Label>Menú</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'fork.knife', selected: 'fork.knife' }} md="restaurant_menu" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="domicilio">
        <NativeTabs.Trigger.Label>Pedir</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bicycle', selected: 'bicycle' }} md="delivery_dining" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="promociones">
        <NativeTabs.Trigger.Label>Promos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'flame', selected: 'flame.fill' }} md="local_fire_department" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="pedidos">
        <NativeTabs.Trigger.Label>Pedidos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bag', selected: 'bag.fill' }} md="receipt_long" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="cuenta">
        <NativeTabs.Trigger.Label>Cuenta</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          md="account_circle"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
