import { NextRequest, NextResponse } from 'next/server';
import { getRenderJob } from '@/lib/videoRenderer/renderService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('job_id') || searchParams.get('jobId') || '';

    if (!jobId) {
      return NextResponse.json(
        { success: false, message: 'Provide job_id in query string' },
        { status: 422 }
      );
    }

    const job = await getRenderJob(jobId);
    if (!job) {
      return NextResponse.json(
        { success: false, message: `Could not resolve video pack for jobId '${jobId}'` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        status: job.status,
        primary_job_id: jobId,
        videos: job.videos,
      },
      message: 'OK',
    });
  } catch (err: any) {
    console.error('[GET /api/external/videos] Error:', err);
    return NextResponse.json({ success: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
