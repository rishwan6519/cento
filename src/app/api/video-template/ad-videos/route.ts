import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import MediaItemModel from '@/models/MediaItems';
import VideoTemplate from '@/models/VideoTemplate';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

function getAuthenticatedUser(req: NextRequest): { userId: string; role: string } | null {
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
    }
    const userId = decoded?.userId || decoded?.id || decoded?._id;
    const role = decoded?.role || 'store_user';
    if (!userId) return null;
    return { userId: String(userId), role: String(role) };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const auth = getAuthenticatedUser(req);
    const requestedUserId = searchParams.get('userId') || searchParams.get('storeUserId') || searchParams.get('adminId') || auth?.userId;
    const templateIdParam = searchParams.get('templateId') || searchParams.get('template_id');
    const ratioParam = searchParams.get('ratio');
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    // Query all rendered ad / promotional offer videos
    const query: any = {
      type: 'video',
      $or: [
        { templateId: { $exists: true, $ne: '' } },
        { fileCategory: 'offer' },
      ],
    };

    let permittedUserIds: mongoose.Types.ObjectId[] = [];

    // Tenant & Admin Isolation: Only show ad videos created by this admin or stores under this admin
    if (requestedUserId && mongoose.Types.ObjectId.isValid(requestedUserId)) {
      const User = (await import('@/models/User')).default;
      const user = await User.findById(requestedUserId).lean();
      if (user) {
        if (user.role === 'account_admin' || user.role === 'admin') {
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
        query.userId = { $in: permittedUserIds };
      }
    }

    if (templateIdParam && templateIdParam !== 'all') {
      query.templateId = String(templateIdParam);
    }

    if (ratioParam && ratioParam !== 'all') {
      query.ratio = ratioParam;
    }

    const items = await MediaItemModel.find(query).sort({ createdAt: -1 }).lean();

    // Fetch video templates scoped to the permitted user IDs to enrich metadata
    const tplQuery: any = {};
    if (permittedUserIds.length > 0) {
      tplQuery.$or = [
        { storeUserId: { $in: permittedUserIds } },
        { storeUserId: { $in: permittedUserIds.map((id) => String(id)) } },
        { storeUserId: { $exists: false } },
        { storeUserId: null },
      ];
    }
    const templates = await VideoTemplate.find(tplQuery).select('_id templateId templateName aspectRatio offerType').lean();
    const tplMap = new Map<string, any>();
    templates.forEach((t: any) => {
      tplMap.set(String(t._id), t);
      if (t.templateId) {
        tplMap.set(String(t.templateId), t);
      }
    });

    const enrichedVideos = items.map((item: any) => {
      const tpl = item.templateId ? tplMap.get(String(item.templateId)) : null;
      return {
        _id: String(item._id),
        name: item.name || 'Ad Promo Video',
        type: item.type,
        url: item.url,
        fileCategory: item.fileCategory || 'offer',
        ratio: item.ratio || '16:9',
        width: item.width || (item.ratio === '9:16' ? 1080 : 1920),
        height: item.height || (item.ratio === '9:16' ? 1920 : 1080),
        duration: item.duration || 10,
        jobId: item.jobId || '',
        templateId: item.templateId || (tpl ? String(tpl.templateId || tpl._id) : ''),
        templateName: tpl ? tpl.templateName : (item.templateId ? `Template #${item.templateId}` : 'Custom Template'),
        approvalStatus: item.approvalStatus || 'approved',
        createdAt: item.createdAt || new Date(),
      };
    });

    // Apply search filter if present
    const filteredVideos = search
      ? enrichedVideos.filter((v: any) =>
          v.name.toLowerCase().includes(search) ||
          v.templateName.toLowerCase().includes(search) ||
          String(v.templateId).includes(search) ||
          v.ratio.toLowerCase().includes(search)
        )
      : enrichedVideos;

    return NextResponse.json({
      success: true,
      count: filteredVideos.length,
      data: filteredVideos,
    });
  } catch (error: any) {
    console.error('[GET /api/video-template/ad-videos] Error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch ad videos' },
      { status: 500 }
    );
  }
}
