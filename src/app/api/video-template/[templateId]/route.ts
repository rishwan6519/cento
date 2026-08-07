import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
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
    const auth = getAuthenticatedUser(req);
    if (!auth || !auth.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Missing or invalid authentication token' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const { templateId } = await context.params;
    const template: any = await VideoTemplate.findById(templateId).lean();

    if (!template) {
      return NextResponse.json(
        { success: false, message: 'Template not found' },
        { status: 404 }
      );
    }

    // Always validate ownership before returning data
    if (String(template.storeUserId) !== String(auth.userId)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not own this template' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
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
    const auth = getAuthenticatedUser(req);
    if (!auth || !auth.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Missing or invalid authentication token' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const { templateId } = await context.params;
    const body = await req.json();

    // Prevent overriding sensitive immutable properties
    const { storeUserId: _ignoredStoreUser, _id: _ignoredId, createdAt: _ignoredCreated, ...updateData } = body;

    if (updateData.templateName !== undefined && !String(updateData.templateName).trim()) {
      return NextResponse.json(
        { success: false, message: 'Template name cannot be empty' },
        { status: 400 }
      );
    }

    // Upsert: if the template doesn't exist in DB (dummy first edit), create it with this _id
    const updatedTemplate = await VideoTemplate.findOneAndUpdate(
      { _id: templateId },
      {
        ...updateData,
        storeUserId: auth.userId,
        isDummyOverride: true,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
      data: updatedTemplate,
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
    const auth = getAuthenticatedUser(req);
    if (!auth || !auth.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Missing or invalid authentication token' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const { templateId } = await context.params;
    const template: any = await VideoTemplate.findById(templateId);

    if (!template) {
      return NextResponse.json(
        { success: false, message: 'Template not found' },
        { status: 404 }
      );
    }

    // Only the owner can delete
    if (String(template.storeUserId) !== String(auth.userId)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not own this template' },
        { status: 403 }
      );
    }

    await VideoTemplate.findByIdAndDelete(templateId);

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
