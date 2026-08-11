import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import type { SortOrder } from 'mongoose';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import VideoTemplate from '@/models/VideoTemplate';
import { DUMMY_TEMPLATES } from '@/lib/dummyTemplates';

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

    // Allow a custom _id when saving a dummy template override
    const {
      storeUserId: _ignoredStoreUser,
      _id: clientId,
      templateName,
      ...templateFields
    } = body;

    if (!templateName || !String(templateName).trim()) {
      return NextResponse.json(
        { success: false, message: 'Template name is required' },
        { status: 400 }
      );
    }

    let savedTemplate: any;

    // If a valid _id is supplied (dummy override), use findOneAndUpdate with upsert
    if (clientId && mongoose.Types.ObjectId.isValid(String(clientId))) {
      savedTemplate = await VideoTemplate.findOneAndUpdate(
        { _id: String(clientId) },
        {
          ...templateFields,
          templateName: String(templateName).trim(),
          storeUserId: auth.userId,
          isDummyOverride: true,
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    } else {
      savedTemplate = await VideoTemplate.create({
        ...templateFields,
        templateName: String(templateName).trim(),
        storeUserId: auth.userId,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Template saved successfully',
        templateId: String(savedTemplate._id),
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
    /*
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
    const dbTemplates: any[] = await VideoTemplate.find(query).sort(sortField).lean();

    // Build a set of DB _ids for fast lookup (DB records override dummies with same _id)
    const dbIdSet = new Set(dbTemplates.map((t: any) => String(t._id)));

    // Merge: include dummies that have NOT been overridden in DB
    const dummyEntries = DUMMY_TEMPLATES
      .filter((d) => !dbIdSet.has(String(d._id)))
      .map((d) => ({
        _id: d._id,
        templateName: d.templateName,
        templateDescription: d.description,
        description: d.description,
        status: 'Active',
        isDummy: true,
        createdAt: new Date('2026-01-01').toISOString(),
        updatedAt: new Date('2026-01-01').toISOString(),
      }));

    // Search filter for dummies too
    const filteredDummies = search.trim()
      ? dummyEntries.filter((d) =>
          d.templateName.toLowerCase().includes(search.toLowerCase()) ||
          (d.description || '').toLowerCase().includes(search.toLowerCase())
        )
      : dummyEntries;

    const combined = [...dbTemplates, ...filteredDummies];

    return NextResponse.json({
      success: true,
      data: combined,
    });
    */

    const fetchOptions: RequestInit = {};
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      fetchOptions.headers = { 'Authorization': authHeader };
    }
    const response = await fetch("https://cloudbases.in/storesparc_video/index.php/api/external/templates?limit=50&all=1", fetchOptions);
    const data = await response.json();
    
    // Pass the response directly as requested
    return NextResponse.json(data);
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
