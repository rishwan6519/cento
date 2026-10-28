import { NextRequest, NextResponse } from 'next/server';
import { getRenderJob } from '@/lib/videoRenderer/renderService';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    if (!jobId) {
      return NextResponse.json({ success: false, message: 'job_id is required' }, { status: 400 });
    }

    const job = await getRenderJob(jobId);
    if (!job) {
      return NextResponse.json({ success: false, message: 'Job not found' }, { status: 404 });
    }

    // Default to 16:9 video as primary response
    const primary = (job.videos && job.videos.find((v) => v.ratio === '16:9')) || job.primaryVideo || job.videos[0];

    if (job.status === 'completed' && primary) {
      return NextResponse.json({
        success: true,
        async: true,
        status: 'completed',
        job_id: jobId,
        status_url: `/api/external/video/${jobId}`,
        ratio: primary.ratio,
        file: primary.file,
        url: primary.url,
        width: primary.width,
        height: primary.height,
        duration: primary.duration,
        message: 'completed',
        videos: job.videos,
      });
    }

    if (job.status === 'failed') {
      return NextResponse.json(
        {
          success: false,
          status: 'failed',
          job_id: jobId,
          message: job.errorMessage || 'Render failed',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      async: true,
      status: job.status,
      job_id: jobId,
      status_url: `/api/external/video/${jobId}`,
      message: job.message || 'Queued for rendering',
    });
  } catch (err: any) {
    console.error('[GET /api/external/video/[jobId]] Error:', err);
    return NextResponse.json({ success: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
