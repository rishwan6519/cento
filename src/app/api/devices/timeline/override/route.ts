import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import ManualTimelineOverride from '@/models/ManualTimelineOverride';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await req.json();
    const { serialNumber, date, data } = body;

    if (!serialNumber || !date || !data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 });
    }

    // Generate a new version ID using current timestamp
    const newVersionId = Date.now().toString();

    // Upsert the manual timeline override
    const updatedOverride = await ManualTimelineOverride.findOneAndUpdate(
      { serialNumber, date },
      { 
         serialNumber, 
         date, 
         versionId: newVersionId, 
         data 
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Timeline override saved successfully',
      versionId: newVersionId
    }, { status: 200 });

  } catch (error) {
    console.error('Error saving timeline override:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
