import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Brand } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

/** Admin sections, like the website's admin panel. Panel de ventas opens by default. */
export default function AdminTabsLayout() {
  const { colors } = useBrandTheme();

  return (
    <NativeTabs
      backgroundColor={colors.header}
      indicatorColor={colors.border}
      iconColor={{ default: colors.textSecondary, selected: Brand.orange }}
      labelStyle={{ default: { color: colors.textSecondary }, selected: { color: Brand.orange } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Ventas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} md="bar_chart" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="reservaciones">
        <NativeTabs.Trigger.Label>Reservas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'calendar', selected: 'calendar' }} md="event" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="mensajes">
        <NativeTabs.Trigger.Label>Mensajes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bubble.left', selected: 'bubble.left.fill' }} md="chat" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="meseros">
        <NativeTabs.Trigger.Label>Meseros</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} md="groups" />
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
