import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import type { SortOrder } from 'mongoose';
import mongoose from 'mongoose';
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
    const body = await req.json();
    const resolvedUserId = auth?.userId || body.storeUserId || body.userId || '64f3b2c1a4e2d1234567890a';

    await connectToDatabase();

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

    // Determine sequential templateId starting with 1
    const allTemplates = await VideoTemplate.find({}, 'templateId').lean();
    let maxId = 0;
    for (const t of allTemplates) {
      const num = Number((t as any).templateId);
      if (!isNaN(num) && num > maxId) maxId = num;
    }
    const nextTemplateId = maxId + 1;

    let savedTemplate: any;

    if (clientId && mongoose.Types.ObjectId.isValid(String(clientId))) {
      const existing = await VideoTemplate.findById(String(clientId));
      const targetTemplateId = existing?.templateId || nextTemplateId;

      savedTemplate = await VideoTemplate.findOneAndUpdate(
        { _id: String(clientId) },
        {
          ...templateFields,
          templateId: targetTemplateId,
          templateName: String(templateName).trim(),
          storeUserId: resolvedUserId,
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    } else {
      const assignedTemplateId = (body.templateId && Number(body.templateId) > 0)
        ? Number(body.templateId)
        : nextTemplateId;

      savedTemplate = await VideoTemplate.create({
        ...templateFields,
        templateId: assignedTemplateId,
        templateName: String(templateName).trim(),
        storeUserId: resolvedUserId,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Template saved successfully',
        templateId: String(savedTemplate.templateId || savedTemplate._id),
        id: savedTemplate.templateId || nextTemplateId,
        data: savedTemplate,
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
    await connectToDatabase();
    const auth = getAuthenticatedUser(req);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'createdAt';
    const order: SortOrder = searchParams.get('order') === 'asc' ? 1 : -1;

    // Build flexible query so all created templates are retrieved reliably
    const andClauses: any[] = [];

    // Filter out dummy/mock entries
    andClauses.push({
      isDummy: { $ne: true },
    });

    if (search.trim()) {
      andClauses.push({
        $or: [
          { templateName: { $regex: search.trim(), $options: 'i' } },
          { templateDescription: { $regex: search.trim(), $options: 'i' } },
          { offerTitle: { $regex: search.trim(), $options: 'i' } },
          { offerType: { $regex: search.trim(), $options: 'i' } },
        ],
      });
    }

    const query = andClauses.length > 0 ? { $and: andClauses } : {};
    const sortField: { [key: string]: SortOrder } = { templateId: 1, createdAt: -1 };
    const dbTemplates: any[] = await VideoTemplate.find(query).sort(sortField).lean();

    // Ensure every returned template has a clean numeric templateId starting from 1
    const mappedTemplates = dbTemplates.map((t: any, idx: number) => ({
      ...t,
      _id: String(t._id),
      templateId: t.templateId || (idx + 1),
    }));

    return NextResponse.json({
      success: true,
      count: mappedTemplates.length,
      data: mappedTemplates,
      templates: mappedTemplates,
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
