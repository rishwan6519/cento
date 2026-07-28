import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/db';
import Notification from '@/models/Notification';

// ─── Helper: Extract & verify JWT ────────────────────────────────────────────
function getAuthenticatedUser(req: NextRequest): {
  userId: string;
  role: string;
} | null {
  const authorization = req.headers.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) return null;

  const token = authorization.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    let decoded: any;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      decoded = jwt.decode(token);
      if (!decoded) return null;
    }
    const userId = decoded.userId || decoded.id || decoded._id;
    const role = decoded.role || 'store_user';
    if (!userId) return null;
    return { userId: String(userId), role: String(role) };
  } catch {
    return null;
  }
}

interface RouteContext {
  params: Promise<{ notificationId: string }>;
}

// ─── PUT /api/notifications/:notificationId/read ──────────────────────────────
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const auth = getAuthenticatedUser(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { notificationId } = await context.params;

    // Verify ownership before marking as read
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return NextResponse.json(
        { success: false, message: 'Notification not found' },
        { status: 404 }
      );
    }
    if (String(notification.storeUserId) !== String(auth.userId)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Forbidden: You do not own this notification',
        },
        { status: 403 }
      );
    }

    notification.isRead = true;
    await notification.save();

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('[PUT /api/notifications/:id/read] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to mark notification as read',
      },
      { status: 500 }
    );
  }
}
