import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import TimeSlotDistribution from '@/models/TimeSlotDistribution';
import ManualTimelineOverride from '@/models/ManualTimelineOverride';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await req.json();
    const { serialNumber, start, end, date, distribution } = body;

    if (!serialNumber || !start || !end || !distribution) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    let rawTotal = 0;
    const finalDistribution: Record<string, number> = {};

    for (const [type, pct] of Object.entries(distribution)) {
      const p = Number(pct);
      if (p < 0) return NextResponse.json({ error: 'Negative percentage not allowed' }, { status: 400 });
      rawTotal += p;
      finalDistribution[type.toLowerCase()] = p;
    }

    if (Math.abs(rawTotal - 100) > 0.1) {
       return NextResponse.json({ error: `Total percentage must equal exactly 100%. Currently it is ${rawTotal}%.` }, { status: 400 });
    }

    // Upsert the time slot distribution
    await TimeSlotDistribution.findOneAndUpdate(
      { serialNumber, start, end },
      { serialNumber, start, end, distribution: finalDistribution },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Because we updated the distribution, we MUST delete any Manual Overrides for this device/date
    // so that the timeline regenerates using the new percentages!
    if (date) {
        await ManualTimelineOverride.findOneAndDelete({ serialNumber, date });
    }

    return NextResponse.json({
      success: true,
      message: 'Time slot distribution saved successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Error saving time slot distribution:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
