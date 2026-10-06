import { useNavigation } from 'expo-router';
import { useEffect } from 'react';

type TabState = { routes: { name: string; state?: { key?: string; index?: number } }[] };

/**
 * For a tab's nested stack layout: when the user switches to another tab, return this
 * tab to its first screen, so coming back starts from the beginning (e.g. the menu
 * categories instead of the last dish that was open).
 */
export function useResetTabOnBlur(tabName: string) {
  const navigation = useNavigation();

  useEffect(() => {
    return navigation.addListener('blur', () => {
      const tabs = navigation.getState() as TabState | undefined;
      const stack = tabs?.routes.find((route) => route.name === tabName)?.state;
      if (stack?.key && (stack.index ?? 0) > 0) {
        navigation.dispatch({ type: 'POP_TO_TOP', target: stack.key });
      }
    });
  }, [navigation, tabName]);
}
