import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/db';
import Offer from '@/models/Offer';

// ─── Helper: Extract & verify JWT ────────────────────────────────────────────
function getAuthenticatedUser(req: NextRequest): {
  userId: string;
  role: string;
} | null {
  const authorization = req.headers.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

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
  params: Promise<{ offerId: string }>;
}

// ─── PUT /api/offers/:offerId ─────────────────────────────────────────────────
export async function PUT(req: NextRequest, context: RouteContext) {
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

    const { offerId } = await context.params;
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
    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, message: 'Start date and end date are required' },
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

    // ── Ownership check ───────────────────────────────────────────────────
    const offer = await Offer.findById(offerId);
    if (!offer) {
      return NextResponse.json(
        { success: false, message: 'Offer not found' },
        { status: 404 }
      );
    }
    if (String(offer.storeUserId) !== String(auth.userId)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not own this offer' },
        { status: 403 }
      );
    }

    // ── Duplicate name check (exclude current offer) ──────────────────────
    const duplicate = await Offer.findOne({
      storeUserId: auth.userId,
      offerName: { $regex: new RegExp(`^${offerName.trim()}$`, 'i') },
      isActive: true,
      _id: { $ne: offerId },
    });
    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message: 'An active offer with this name already exists',
        },
        { status: 409 }
      );
    }

    // ── Update ─────────────────────────────────────────────────────────────
    offer.offerName = offerName.trim();
    offer.offerDescription = offerDescription.trim();
    offer.startDate = start;
    offer.endDate = end;
    await offer.save(); // triggers updatedAt via timestamps

    return NextResponse.json({
      success: true,
      message: 'Offer updated successfully',
    });
  } catch (error) {
    console.error('[PUT /api/offers/:offerId] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to update offer',
      },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/offers/:offerId ──────────────────────────────────────────────
export async function DELETE(req: NextRequest, context: RouteContext) {
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

    const { offerId } = await context.params;

    // ── Ownership check ───────────────────────────────────────────────────
    const offer = await Offer.findById(offerId);
    if (!offer) {
      return NextResponse.json(
        { success: false, message: 'Offer not found' },
        { status: 404 }
      );
    }
    if (String(offer.storeUserId) !== String(auth.userId)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not own this offer' },
        { status: 403 }
      );
    }

    await Offer.findByIdAndDelete(offerId);

    return NextResponse.json({
      success: true,
      message: 'Offer deleted successfully',
    });
  } catch (error) {
    console.error('[DELETE /api/offers/:offerId] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to delete offer',
      },
      { status: 500 }
    );
  }
}
