import { PermissionsAndroid, Platform } from 'react-native';
import { mobileApi } from './api';

let currentFcmToken: string | null = null;

export interface IncomingPushPayload {
  title: string;
  body: string;
  orderCode?: string;
}

/**
 * Xin quyền nhận thông báo, lấy FCM token và gửi lên backend (Android).
 * Dùng lazy require để build iOS unsigned IPA không cần link Firebase native.
 */
export async function setupPushNotifications(
  onNewNotification?: (payload: IncomingPushPayload) => void
): Promise<() => void> {
  if (Platform.OS !== 'android') {
    return () => {};
  }

  try {
    if (Platform.Version >= 33) {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
    }

    const fcm = require('@react-native-firebase/messaging');
    const messaging = fcm.getMessaging();
    await fcm.requestPermission(messaging);
    const token: string = await fcm.getToken(messaging);
    if (token) {
      currentFcmToken = token;
      await mobileApi.registerDeviceToken(token, Platform.OS).catch(() => {});
    }

    const unsubRefresh = fcm.onTokenRefresh(messaging, async (newToken: string) => {
      currentFcmToken = newToken;
      await mobileApi.registerDeviceToken(newToken, Platform.OS).catch(() => {});
    });

    const unsubMessage = fcm.onMessage(messaging, async (remoteMessage: any) => {
      const title = remoteMessage?.notification?.title || 'Đơn hàng mới';
      const body =
        remoteMessage?.notification?.body || 'Bạn vừa có đơn hàng mới trên Điều Nhà.';
      const orderCode =
        typeof remoteMessage?.data?.orderCode === 'string'
          ? remoteMessage.data.orderCode
          : undefined;

      onNewNotification?.({ title, body, orderCode });
    });

    return () => {
      unsubRefresh();
      unsubMessage();
    };
  } catch (err) {
    console.warn('[Push] Setup skipped:', err);
    return () => {};
  }
}

export async function clearPushRegistration(): Promise<void> {
  if (!currentFcmToken) return;
  try {
    await mobileApi.unregisterDeviceToken(currentFcmToken);
  } catch {
    // Ignore
  } finally {
    currentFcmToken = null;
  }
}
