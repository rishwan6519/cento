import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import MediaItemModel from '@/models/MediaItems';
import VideoTemplate from '@/models/VideoTemplate';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
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

    if (templateIdParam && templateIdParam !== 'all') {
      query.templateId = String(templateIdParam);
    }

    if (ratioParam && ratioParam !== 'all') {
      query.ratio = ratioParam;
    }

    const items = await MediaItemModel.find(query).sort({ createdAt: -1 }).lean();

    // Fetch all video templates to enrich with template metadata
    const templates = await VideoTemplate.find({}).select('_id templateId templateName aspectRatio offerType').lean();
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
