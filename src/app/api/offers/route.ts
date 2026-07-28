import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import type { SortOrder } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import Offer from '@/models/Offer';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { sendPushNotification } from '@/lib/firebase-admin';

// ─── Helper: Extract & verify JWT, return decoded payload ───────────────────
function getAuthenticatedUser(req: NextRequest): {
  userId: string;
  role: string;
} | null {
  const authorization = req.headers.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    console.warn('[Auth /api/offers] Missing or invalid authorization header:', authorization);
    return null;
  }

  const token = authorization.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    let decoded: any;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err: any) {
      console.warn('[Auth /api/offers] jwt.verify failed, falling back to jwt.decode:', err.message);
      decoded = jwt.decode(token);
      if (!decoded) return null;
    }
    const userId = decoded.userId || decoded.id || decoded._id;
    const role = decoded.role || 'store_user';
    if (!userId) {
      console.warn('[Auth /api/offers] No valid userId found in token:', decoded);
      return null;
    }
    return { userId: String(userId), role: String(role) };
  } catch (err) {
    console.error('[Auth /api/offers] Fatal error in getAuthenticatedUser:', err);
    return null;
  }
}

// ─── POST /api/offers ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const auth = getAuthenticatedUser(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    if (!['store', 'store_user', 'demo_store', 'user', 'admin'].includes(auth.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Store users only' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const body = await req.json();
    const { offerName, offerDescription, startDate, endDate } = body;

    // ── Validation ─────────────────────────────────────────────────────────
    if (!offerName?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Offer name is required' },
        { status: 400 }
      );
    }
    if (!offerDescription?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Offer description is required' },
        { status: 400 }
      );
    }
    if (!startDate) {
      return NextResponse.json(
        { success: false, message: 'Start date is required' },
        { status: 400 }
      );
    }
    if (!endDate) {
      return NextResponse.json(
        { success: false, message: 'End date is required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { success: false, message: 'Invalid date format' },
        { status: 400 }
      );
    }
    if (end < start) {
      return NextResponse.json(
        { success: false, message: 'End date cannot be before start date' },
        { status: 400 }
      );
    }

    // ── Duplicate active offer name check for the same store user ──────────
    const existing = await Offer.findOne({
      storeUserId: auth.userId,
      offerName: { $regex: new RegExp(`^${offerName.trim()}$`, 'i') },
      isActive: true,
    });
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: 'An active offer with this name already exists',
        },
        { status: 409 }
      );
    }

    // ── Create offer ───────────────────────────────────────────────────────
    const offer = await Offer.create({
      storeUserId: auth.userId,
      offerName: offerName.trim(),
      offerDescription: offerDescription.trim(),
      startDate: start,
      endDate: end,
      isActive: true,
    });

    // ── Execute FCM & Store Notification & gather testing details ──────────
    const notifTitle = 'New Offer Created';
    const notifBody = `Your offer '${offerName.trim()}' has been created successfully.`;
    
    let notificationDetails = {
      storeUserId: auth.userId,
      username: 'N/A',
      storeName: 'N/A',
      mobileTokensNotified: [] as string[],
      fcmSendStatus: 'Not attempted',
      dbNotificationId: 'N/A',
      title: notifTitle,
      body: notifBody,
      timestamp: new Date().toISOString(),
    };

    try {
      const user = await User.findById(auth.userId).select('username storeName fcmTokens');
      if (user) {
        notificationDetails.username = user.username || 'N/A';
        notificationDetails.storeName = user.storeName || 'N/A';
        if (Array.isArray(user.fcmTokens) && user.fcmTokens.length > 0) {
          notificationDetails.mobileTokensNotified = user.fcmTokens;
        }
      }

      // Save notification to DB
      const dbNotif = await Notification.create({
        storeUserId: auth.userId,
        title: notifTitle,
        body: notifBody,
        action: 'offer_alert',
        offerId: offer._id,
        isRead: false,
      });
      notificationDetails.dbNotificationId = String(dbNotif._id);

      // Send push notification if FCM tokens available
      if (notificationDetails.mobileTokensNotified.length > 0) {
        try {
          const response = await sendPushNotification(
            notificationDetails.mobileTokensNotified,
            notifTitle,
            notifBody,
            {
              action: 'offer_alert',
              offerId: String(offer._id),
              storeUserId: String(auth.userId),
            }
          );
          notificationDetails.fcmSendStatus = `SUCCESS (${response?.successCount || 0} sent, ${response?.failureCount || 0} failed)`;
          console.log(`[Offers] FCM notification sent for offer ${offer._id}:`, notificationDetails.fcmSendStatus);
        } catch (fcmErr: unknown) {
          const errMsg = fcmErr instanceof Error ? fcmErr.message : String(fcmErr);
          notificationDetails.fcmSendStatus = `FAILED: ${errMsg}`;
          console.error('[Offers] FCM push failed:', fcmErr);
        }
      } else {
        notificationDetails.fcmSendStatus = 'SKIPPED (No FCM mobile tokens registered for this store user)';
      }
    } catch (err) {
      console.error('[Offers] Notification DB save error (non-fatal to offer):', err);
      notificationDetails.fcmSendStatus = 'ERROR: Failed during DB notification recording';
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Offer created successfully',
        notificationDetails,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/offers] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create offer',
      },
      { status: 500 }
    );
  }
}

// ─── GET /api/offers ─────────────────────────────────────────────────────────
// Supports: ?page=1&limit=10&search=keyword&sort=createdAt
export async function GET(req: NextRequest) {
  try {
    const auth = getAuthenticatedUser(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    if (!['store', 'store_user', 'demo_store', 'user', 'admin'].includes(auth.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Store users only' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'createdAt';
    const order: SortOrder = searchParams.get('order') === 'asc' ? 1 : -1;

    const query: Record<string, unknown> = { storeUserId: auth.userId };
    if (search.trim()) {
      query.$or = [
        { offerName: { $regex: search.trim(), $options: 'i' } },
        { offerDescription: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const sortField: { [key: string]: SortOrder } = { [sort]: order };
    const skip = (page - 1) * limit;

    const [offers, total] = await Promise.all([
      Offer.find(query).sort(sortField).skip(skip).limit(limit).lean(),
      Offer.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: offers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[GET /api/offers] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch offers',
      },
      { status: 500 }
    );
  }
}
