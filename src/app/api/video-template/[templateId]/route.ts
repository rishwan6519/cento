import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import VideoTemplate from '@/models/VideoTemplate';

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
  params: Promise<{ templateId: string }>;
}

// ─── GET /api/video-template/:templateId ────────────────────────────────────
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const { templateId } = await context.params;
    let template: any = null;

    if (mongoose.Types.ObjectId.isValid(templateId)) {
      template = await VideoTemplate.findById(templateId).lean();
    }
    if (!template && !isNaN(Number(templateId))) {
      template = await VideoTemplate.findOne({ templateId: Number(templateId) }).lean();
    }

    if (!template) {
      return NextResponse.json(
        { success: false, message: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...template,
        _id: String(template._id),
        templateId: template.templateId || 10001,
      },
    });
  } catch (error) {
    console.error('[GET /api/video-template/:templateId] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch template details',
      },
      { status: 500 }
    );
  }
}

// ─── PUT /api/video-template/:templateId ────────────────────────────────────
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const auth = getAuthenticatedUser(req);
    const { templateId } = await context.params;
    const body = await req.json();
    const resolvedUserId = auth?.userId || body.storeUserId || body.userId || '64f3b2c1a4e2d1234567890a';

    const { storeUserId: _ignoredStoreUser, _id: _ignoredId, createdAt: _ignoredCreated, ...updateData } = body;

    if (updateData.templateName !== undefined && !String(updateData.templateName).trim()) {
      return NextResponse.json(
        { success: false, message: 'Template name cannot be empty' },
        { status: 400 }
      );
    }

    let filter: any = null;
    if (mongoose.Types.ObjectId.isValid(templateId)) {
      filter = { _id: templateId };
    } else if (!isNaN(Number(templateId))) {
      filter = { templateId: Number(templateId) };
    } else {
      filter = { _id: templateId };
    }

    const updatedTemplate = await VideoTemplate.findOneAndUpdate(
      filter,
      {
        ...updateData,
        storeUserId: resolvedUserId,
      },
      { new: true, setDefaultsOnInsert: true }
    );

    if (!updatedTemplate) {
      return NextResponse.json(
        { success: false, message: 'Template not found to update' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
      data: {
        ...updatedTemplate.toObject(),
        _id: String(updatedTemplate._id),
        templateId: updatedTemplate.templateId || 10001,
      },
    });
  } catch (error) {
    console.error('[PUT /api/video-template/:templateId] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update template',
      },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/video-template/:templateId ─────────────────────────────────
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const { templateId } = await context.params;
    let template: any = null;

    if (mongoose.Types.ObjectId.isValid(templateId)) {
      template = await VideoTemplate.findById(templateId);
    }
    if (!template && !isNaN(Number(templateId))) {
      template = await VideoTemplate.findOne({ templateId: Number(templateId) });
    }

    if (!template) {
      return NextResponse.json(
        { success: false, message: 'Template not found' },
        { status: 404 }
      );
    }

    await VideoTemplate.findByIdAndDelete(template._id);

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    console.error('[DELETE /api/video-template/:templateId] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete template',
      },
      { status: 500 }
    );
  }
}
