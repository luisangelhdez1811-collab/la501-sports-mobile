import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Notice } from '@/domain/order-notices';

/**
 * Notifications the app creates itself, on the phone (no push server, no token, no data
 * leaves the phone). They show while the app is open or recently in the background.
 */

const CHANNEL = 'pedidos';
const supported = Platform.OS !== 'web';
let ready: Promise<void> | null = null;

/** Shows notifications even with the app open, on a high-importance channel (Android). */
export function setupNotifications() {
  if (!supported) return Promise.resolve();
  ready ??= (async () => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      // Android 13+ only shows the permission prompt once a channel exists.
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Avisos de pedidos',
        description: 'Cuando un pedido sale de cocina.',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 150, 250],
      });
    }
  })().catch(() => {});
  return ready;
}

/** Asks once, when it makes sense (after ordering, on the waiter's map). */
export async function askNotificationPermission(): Promise<boolean> {
  if (!supported) return false;
  try {
    await setupNotifications();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export async function notify(notice: Notice) {
  if (!supported) return;
  try {
    await setupNotifications();
    await Notifications.scheduleNotificationAsync({
      content: { title: notice.title, body: notice.body, data: { url: notice.url } },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
    });
  } catch {
    // Without permission the order still shows its status on screen.
  }
}

/** Where to go when a notification is tapped (its `url`), including the one that opened the app. */
export function onNotificationTap(listener: (url: unknown) => void) {
  if (!supported) return () => {};
  const opened = Notifications.getLastNotificationResponse();
  if (opened) {
    listener(opened.notification.request.content.data?.url);
    Notifications.clearLastNotificationResponse();
  }
  const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
    listener(response.notification.request.content.data?.url),
  );
  return () => subscription.remove();
}
