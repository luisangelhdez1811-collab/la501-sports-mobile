import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { trackOrder } from '@/api/account';
import { getTables } from '@/api/waiter';
import { followedOrders, forgetFollowedOrders, markAnnounced, unfollowOrder } from '@/data/followed-orders';
import { askNotificationPermission, notify, onNotificationTap, setupNotifications } from '@/data/local-notifications';
import { writeCache } from '@/data/offline-cache';
import { customerNotice, isNoticeUrl, readyNotices, toServeByTable } from '@/domain/order-notices';
import { onSignedOut } from '@/hooks/use-auth';
import { useIsOffline } from '@/hooks/use-connectivity';

const WAITER_CHECK_MS = 20_000;
const CUSTOMER_CHECK_MS = 30_000;
const FINAL = ['delivered', 'cancelled'];

/** Tapping a notification opens the table or the order it talks about. */
export function useNotificationTaps() {
  useEffect(() => {
    setupNotifications();
    return onNotificationTap((url) => {
      if (isNoticeUrl(url)) router.push(url as never);
    });
  }, []);
}

/**
 * Waiter: every few seconds while online, checks the tables; when the kitchen or the bar
 * finishes dishes of a table, a notification says which one. Each answer also refreshes the
 * map saved on the phone for working offline.
 */
export function useWaiterReadyAlerts() {
  const offline = useIsOffline();
  const previous = useRef<Map<number, number> | null>(null);

  // Their job depends on it: asked as soon as they reach the tables.
  useEffect(() => {
    askNotificationPermission();
  }, []);

  useEffect(() => {
    if (offline) return;
    const controller = new AbortController();
    const check = async () => {
      try {
        const map = await getTables(controller.signal);
        writeCache('waiter-tables', map);
        readyNotices(previous.current, map.tables).forEach(notify);
        previous.current = toServeByTable(map.tables);
      } catch {
        // No answer this time: try again on the next round.
      }
    };
    check();
    const timer = setInterval(check, WAITER_CHECK_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [offline]);
}

/**
 * Customer: follows the home-delivery orders placed from this phone and says once, when it's
 * handed to the driver, that it's on the way. Signed in or not. Stops following once delivered or cancelled.
 */
export function useCustomerOrderAlerts() {
  const offline = useIsOffline();

  useEffect(() => onSignedOut(forgetFollowedOrders), []);

  useEffect(() => {
    if (offline) return;
    const controller = new AbortController();
    const check = async () => {
      for (const order of await followedOrders()) {
        try {
          const tracking = await trackOrder(order.token, controller.signal);
          const notice = customerNotice(order.announced, tracking.status, order.token);
          if (notice) {
            await notify(notice);
            await markAnnounced(order.token, tracking.status);
          }
          if (FINAL.includes(tracking.status)) await unfollowOrder(order.token);
        } catch {
          // Offline or the server didn't answer: next round.
        }
      }
    };
    check();
    const timer = setInterval(check, CUSTOMER_CHECK_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [offline]);
}
