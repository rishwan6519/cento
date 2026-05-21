import admin from "firebase-admin";

// ─────────────────────────────────────────────────────────────────────────────
// Firebase Admin SDK Initializer
//
// Place your Firebase Service Account JSON key in:
//   /src/lib/firebase-service-account.json
//
// OR set these environment variables in .env.local:
//   FIREBASE_PROJECT_ID=your-project-id
//   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
//   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
// ─────────────────────────────────────────────────────────────────────────────

function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app(); // Already initialized – reuse existing instance
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin SDK not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env.local"
    );
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// sendPushNotification
//
// Sends a push notification to one or more FCM tokens.
//
// @param fcmTokens  - Array of FCM token strings
// @param title      - Notification title
// @param body       - Notification body message
// @param data       - Optional key-value data payload (for in-app handling)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendPushNotification(
  fcmTokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
) {
  if (!fcmTokens || fcmTokens.length === 0) return;

  const app = getFirebaseAdmin();

  const message: admin.messaging.MulticastMessage = {
    notification: { title, body },
    tokens: fcmTokens,
    ...(data && { data }),
  };

  try {
    const response = await admin.messaging(app).sendEachForMulticast(message);
    console.log(
      `FCM: ${response.successCount} sent, ${response.failureCount} failed`
    );

    // Log any failures for debugging
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        console.error(`FCM token[${idx}] failed:`, resp.error?.message);
      }
    });

    return response;
  } catch (error) {
    console.error("FCM sendPushNotification error:", error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// sendDeviceOfflineAlert
//
// Convenience wrapper – sends a device offline alert to the given tokens.
// ─────────────────────────────────────────────────────────────────────────────
export async function sendDeviceOfflineAlert(
  fcmTokens: string[],
  deviceName: string
) {
  return sendPushNotification(
    fcmTokens,
    "Device Offline Alert ⚠️",
    `${deviceName} has lost connection to the server.`,
    { type: "device_offline", deviceName }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// sendDeviceOnlineAlert
//
// Convenience wrapper – sends a device back-online alert.
// ─────────────────────────────────────────────────────────────────────────────
export async function sendDeviceOnlineAlert(
  fcmTokens: string[],
  deviceName: string
) {
  return sendPushNotification(
    fcmTokens,
    "Device Online ✅",
    `${deviceName} is back online.`,
    { type: "device_online", deviceName }
  );
}
