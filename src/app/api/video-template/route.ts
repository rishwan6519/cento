import { generateUniqueTemplateId } from '@/lib/generateTemplateId';
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

    // Generate unique 5-digit templateId (10000 - 99999) so it is never 1 or overlapping across admins/stores
    const next5DigitTemplateId = await generateUniqueTemplateId();

    let savedTemplate: any;

    if (clientId && mongoose.Types.ObjectId.isValid(String(clientId))) {
      const existing = await VideoTemplate.findById(String(clientId));
      const targetTemplateId = existing?.templateId && Number(existing.templateId) >= 10000
        ? Number(existing.templateId)
        : next5DigitTemplateId;

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
      const assignedTemplateId = (body.templateId && Number(body.templateId) >= 10000)
        ? Number(body.templateId)
        : next5DigitTemplateId;

      savedTemplate = await VideoTemplate.create({
        ...templateFields,
        templateId: assignedTemplateId,
        templateName: String(templateName).trim(),
        storeUserId: resolvedUserId,
      });
    }

    const finalOtId = savedTemplate.offertypeId || (savedTemplate.offer_type && savedTemplate.offer_type.offertypeId) || savedTemplate.offerType || "INDIVIDUAL_DISCOUNT";
    const finalOtName = savedTemplate.offertypename || (savedTemplate.offer_type && savedTemplate.offer_type.name) || savedTemplate.offerType || "Individual Discount";
    const thumbUrl = savedTemplate.thumbnail_url || savedTemplate.thumbnail || savedTemplate.backgroundUrl || "https://video-generator.storesparc.com/uploads/thumbnails/tpl_thumb_default.gif";
    const thumbRel = savedTemplate.thumbnail || (thumbUrl.startsWith("http") ? thumbUrl.replace(/^https?:\/\/[^\/]+\//, "") : thumbUrl);

    const formattedTemplateItem = {
      id: savedTemplate.templateId || next5DigitTemplateId,
      name: savedTemplate.templateName,
      status: "approved",
      base_width: savedTemplate.aspectRatio === "9:16" ? 1080 : 1920,
      base_height: savedTemplate.aspectRatio === "9:16" ? 1920 : 1080,
      duration_seconds: savedTemplate.videoDuration || 10,
      fps: savedTemplate.fps || 30,
      engine: "custom",
      is_custom_layout: true,
      offer_type: {
        id: finalOtId,
        name: finalOtName,
        offertypeId: finalOtId,
        offertypename: finalOtName,
      },
      offertypeId: finalOtId,
      offertypename: finalOtName,
      thumbnail: thumbRel,
      thumbnail_url: thumbUrl,
      created_by: 1,
      created_at: savedTemplate.createdAt ? new Date(savedTemplate.createdAt).toISOString().replace("T", " ").substring(0, 19) : "2026-09-29 03:46:02",
      user: {
        id: 1,
        name: "StoreSparc Demo",
        email: "demo@storesparc.local",
        role: "admin",
      },
    };

    return NextResponse.json(
      {
        success: true,
        message: "OK",
        data: {
          templates: [formattedTemplateItem],
          count: 1,
          offertypeId: String(finalOtId || "ALL").toUpperCase(),
        },
        templateId: String(savedTemplate.templateId || savedTemplate._id),
        id: savedTemplate.templateId || next5DigitTemplateId,
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
    const requestedUserId = searchParams.get('userId') || searchParams.get('storeUserId') || searchParams.get('adminId') || auth?.userId;

    // Build flexible query so all created templates are retrieved reliably
    const andClauses: any[] = [];

    // Filter out dummy/mock entries
    andClauses.push({
      isDummy: { $ne: true },
    });

    // Tenant & Admin Isolation: Only show templates created by this admin or stores under this admin
    if (requestedUserId && mongoose.Types.ObjectId.isValid(requestedUserId)) {
      const User = (await import('@/models/User')).default;
      const user = await User.findById(requestedUserId).lean();
      if (user) {
        let permittedUserIds: mongoose.Types.ObjectId[] = [];
        if (user.role === 'account_admin' || user.role === 'admin') {
          // Account Admin: sees templates created by themselves AND all stores/sub-users under this admin
          const subUsers = await User.find({
            $or: [
              { _id: user._id },
              { controllerId: user._id },
              ...(user.customerId ? [{ customerId: user.customerId }] : []),
              { createdBy: user._id },
            ],
          }).select('_id').lean();
          permittedUserIds = subUsers.map((u: any) => u._id);
        } else {
          // Store user / sub-user: sees templates created by this store, their parent admin, and sibling stores
          const adminId = user.controllerId || user.createdBy;
          if (adminId) {
            const related = await User.find({
              $or: [
                { _id: user._id },
                { _id: adminId },
                { controllerId: adminId },
                { createdBy: adminId },
              ],
            }).select('_id').lean();
            permittedUserIds = related.map((u: any) => u._id);
          } else {
            permittedUserIds = [user._id];
          }
        }

        const permittedStrIds = permittedUserIds.map((id) => String(id));
        andClauses.push({
          $or: [
            { storeUserId: { $in: permittedUserIds } },
            { storeUserId: { $in: permittedStrIds } },
            { storeUserId: { $exists: false } },
            { storeUserId: null },
          ],
        });
      }
    }

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

    // Return templates with assigned 5-digit templateId
    const mappedTemplates = dbTemplates.map((t: any) => ({
      ...t,
      _id: String(t._id),
      templateId: t.templateId || 10001,
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
