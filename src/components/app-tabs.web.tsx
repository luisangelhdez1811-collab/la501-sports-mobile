import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, BrandFonts } from '@/constants/brand';
import { useBrandTheme } from '@/hooks/use-brand-theme';

type TabButtonProps = TabTriggerSlotProps & {
  icon: SymbolViewProps['name'];
  label: string;
};

function TabButton({ icon, label, isFocused, ...props }: TabButtonProps) {
  const { colors } = useBrandTheme();
  const color = isFocused ? Brand.orange : colors.textSecondary;

  return (
    <Pressable {...props} style={styles.button}>
      <SymbolView name={icon} size={22} tintColor={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

// Same five sections as the native tab bar.
export default function AppTabs() {
  const { colors } = useBrandTheme();

  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <View style={[styles.bar, { backgroundColor: colors.header, borderTopColor: colors.border }]}>
          <TabTrigger name="(menu)" href="/" asChild>
            <TabButton icon={{ web: 'restaurant_menu' }} label="Menú" />
          </TabTrigger>
          <TabTrigger name="domicilio" href="/domicilio" asChild>
            <TabButton icon={{ web: 'delivery_dining' }} label="Pedir" />
          </TabTrigger>
          <TabTrigger name="promociones" href="/promociones" asChild>
            <TabButton icon={{ web: 'local_fire_department' }} label="Promos" />
          </TabTrigger>
          <TabTrigger name="pedidos" href="/pedidos" asChild>
            <TabButton icon={{ web: 'receipt_long' }} label="Pedidos" />
          </TabTrigger>
          <TabTrigger name="cuenta" href="/cuenta" asChild>
            <TabButton icon={{ web: 'account_circle' }} label="Cuenta" />
          </TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  label: {
    fontFamily: BrandFonts.label,
    fontSize: 12,
    letterSpacing: 1,
  },
});
