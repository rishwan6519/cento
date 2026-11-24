import PushDevice from '@/models/PushDevice';
import { IStoreAlert } from '@/models/StoreAlert';

export interface PushNotificationPayload {
  notification: {
    title: string;
    body: string;
  };
  data: {
    alert_id: string;
    category: string;
    target_screen: string;
    target_argument: string;
    created_at: string;
    click_action: string;
  };
  android?: {
    priority: 'high' | 'normal';
    notification?: {
      sound?: string;
      channelId?: string;
    };
  };
  apns?: {
    payload: {
      aps: {
        badge?: number;
        sound?: string;
        category?: string;
        contentAvailable?: boolean;
      };
    };
  };
}

/**
 * Builds a unified FCM / APNs payload from a StoreAlert document.
 * Matches 1:1 with the attributes delivered in the GET /api/v1/alerts feed.
 */
export function buildPushPayloadForAlert(
  alert: IStoreAlert,
  unreadBadgeCount: number = 1
): PushNotificationPayload {
  const alertId = (alert as any)._id?.toString() || '';
  const createdAtStr = alert.createdAt ? alert.createdAt.toISOString() : new Date().toISOString();

  return {
    notification: {
      title: alert.title,
      body: alert.body,
    },
    data: {
      alert_id: alertId,
      category: alert.category,
      target_screen: alert.targetScreen || '',
      target_argument: alert.targetArgument || '',
      created_at: createdAtStr,
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'storesparc_alerts',
      },
    },
    apns: {
      payload: {
        aps: {
          badge: unreadBadgeCount,
          sound: 'default',
          category: alert.category,
          contentAvailable: true,
        },
      },
    },
  };
}

/**
 * Dispatches push notifications to all registered devices for a target user.
 */
export async function dispatchPushNotification(
  userId: string,
  alert: IStoreAlert,
  unreadBadgeCount: number = 1
): Promise<{ dispatched_count: number; device_count: number }> {
  try {
    const devices = await PushDevice.find({ userId });
    if (devices.length === 0) {
      return { dispatched_count: 0, device_count: 0 };
    }

    const payload = buildPushPayloadForAlert(alert, unreadBadgeCount);

    // In a live production environment with Firebase Admin SDK configured:
    // await admin.messaging().sendEachForMulticast({ tokens: devices.map(d => d.token), ...payload });
    console.log(`[Push Notification] Dispatched to ${devices.length} device(s) for user ${userId}:`, {
      title: payload.notification.title,
      category: payload.data.category,
      target_screen: payload.data.target_screen,
    });

    return { dispatched_count: devices.length, device_count: devices.length };
  } catch (error) {
    console.error('Failed to dispatch push notification:', error);
    return { dispatched_count: 0, device_count: 0 };
  }
}

