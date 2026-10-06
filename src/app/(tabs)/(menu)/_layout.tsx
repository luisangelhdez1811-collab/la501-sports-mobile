import { Stack } from 'expo-router';

import { useResetTabOnBlur } from '@/hooks/use-reset-tab-on-blur';

// Stack inside the Menú tab so opening a category keeps the tab bar visible.
export default function MenuLayout() {
  // Leaving the tab sends it back to its start (categories), not the last open screen.
  useResetTabOnBlur('(menu)');
  return <Stack screenOptions={{ headerShown: false }} />;
}
