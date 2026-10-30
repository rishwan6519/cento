import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredUnapprovedVideos } from '@/lib/videoCleanup';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get('days')) || 30;
    const result = await cleanupExpiredUnapprovedVideos(days);
    return NextResponse.json({
      success: true,
      message: `Cleaned up unapproved videos older than ${days} days`,
      deletedCount: result.deletedCount,
      errors: result.errors,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Cleanup failed' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

