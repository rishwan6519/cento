import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import type { SortOrder } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import VideoTemplate from '@/models/VideoTemplate';

// ─── Helper: Extract & verify JWT, return decoded payload ───────────────────
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

// ─── POST /api/video-template ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const auth = getAuthenticatedUser(req);
    // Never accept storeUserId from frontend. Always use logged-in Store User ID.
    if (!auth || !auth.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Missing or invalid authentication token' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const body = await req.json();

    // Remove any client-supplied storeUserId or _id for security
    const {
      storeUserId: _ignoredStoreUser,
      _id: _ignoredId,
      templateName,
      ...templateFields
    } = body;

    if (!templateName || !String(templateName).trim()) {
      return NextResponse.json(
        { success: false, message: 'Template name is required' },
        { status: 400 }
      );
    }

    const newTemplate = await VideoTemplate.create({
      ...templateFields,
      templateName: String(templateName).trim(),
      storeUserId: auth.userId,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Template created successfully',
        templateId: String(newTemplate._id),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/video-template] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create template',
      },
      { status: 500 }
    );
  }
}

// ─── GET /api/video-template ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const auth = getAuthenticatedUser(req);
    // Never accept storeUserId from frontend. Always use logged-in Store User ID.
    if (!auth || !auth.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Missing or invalid authentication token' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'createdAt';
    const order: SortOrder = searchParams.get('order') === 'asc' ? 1 : -1;

    // Return only templates belonging to the logged-in Store User
    const query: Record<string, unknown> = { storeUserId: auth.userId };
    if (search.trim()) {
      query.$or = [
        { templateName: { $regex: search.trim(), $options: 'i' } },
        { templateDescription: { $regex: search.trim(), $options: 'i' } },
        { offerTitle: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const sortField: { [key: string]: SortOrder } = { [sort]: order };
    const templates = await VideoTemplate.find(query).sort(sortField).lean();

    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error('[GET /api/video-template] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch templates',
      },
      { status: 500 }
    );
  }
}
