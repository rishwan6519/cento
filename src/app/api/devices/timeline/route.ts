import { NextRequest, NextResponse } from 'next/server';
import { generateDailyTimeline } from '@/lib/timelineHelper';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const serialNumber = req.nextUrl.searchParams.get('serialNumber');
    const targetDate = req.nextUrl.searchParams.get('date');

    if (!serialNumber) {
      return NextResponse.json({ error: 'Serial number is required' }, { status: 400 });
    }

    const result = await generateDailyTimeline(serialNumber, targetDate || undefined);
    
    if (!result) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('Error in daily timeline route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
