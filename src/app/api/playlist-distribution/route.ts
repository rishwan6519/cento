import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import PlaylistDistribution from '@/models/PlaylistDistribution';
import { advancedPlaylistScheduleService } from '@/services/advancedPlaylistSchedule.service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/playlist-distribution
 * Save or update percentage-based distribution config for a device.
 *
 * Body:
 * {
 *   "serialNumber": "URTV2",
 *   "distribution": { "offer": 30, "video": 70 }
 * }
 *
 * Percentages are auto-normalized to 100% based on available categories on the device.
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { serialNumber, distribution } = body;

    if (!serialNumber) {
      return NextResponse.json({ success: false, error: 'serialNumber is required' }, { status: 400 });
    }
    if (!distribution || typeof distribution !== 'object' || Object.keys(distribution).length === 0) {
      return NextResponse.json({ success: false, error: 'distribution object is required with at least one type' }, { status: 400 });
    }

    // Determine available categories by fetching the device's current timeline
    const availableCategories = new Set<string>();
    try {
      const baseData = await advancedPlaylistScheduleService.getDailyTimelineForDevice(serialNumber);
      if (baseData && baseData.timeline) {
        for (const slot of baseData.timeline) {
          if (slot.medias) {
            for (const m of slot.medias) {
              const cat = (m.videoCategory || m.type || 'unknown').toLowerCase();
              availableCategories.add(cat);
            }
          }
        }
      }
    } catch (e) {
       console.error('[playlist-distribution] Could not fetch timeline for available categories', e);
    }

    const entries = Object.entries(distribution) as [string, number][];
    let rawTotal = 0;
    const finalDistribution: Record<string, number> = {};

    for (const [type, pct] of entries) {
      if (typeof pct !== 'number' || pct < 0) {
        return NextResponse.json({
          success: false,
          error: `Invalid percentage for type "${type}": must be a positive number`
        }, { status: 400 });
      }
      rawTotal += pct;
      finalDistribution[type.toLowerCase()] = pct;
    }

    if (rawTotal > 100) {
       return NextResponse.json({ success: false, error: 'Total percentage cannot exceed 100%' }, { status: 400 });
    }

    if (rawTotal < 100) {
      const remaining = 100 - rawTotal;
      const submittedTypes = Object.keys(finalDistribution);
      const unmentionedCategories = Array.from(availableCategories).filter(cat => !submittedTypes.includes(cat));

      if (unmentionedCategories.length === 0) {
        return NextResponse.json({ 
          success: false, 
          error: `Total percentage must equal exactly 100%. Currently it is ${rawTotal}%. It cannot auto-fill because there are no other unassigned categories available on the device's current schedule.` 
        }, { status: 400 });
      } else {
        // Distribute remaining evenly among unmentioned categories
        const split = Math.floor((remaining / unmentionedCategories.length) * 100) / 100;
        for (const cat of unmentionedCategories) {
          finalDistribution[cat] = split;
        }
      }
    }

    // Upsert distribution config
    const result = await PlaylistDistribution.findOneAndUpdate(
      { serialNumber: serialNumber },
      { distribution: finalDistribution },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Distribution saved successfully',
      data: {
        serialNumber,
        distribution: finalDistribution,
        _id: result._id
      }
    });

  } catch (error) {
    console.error('[playlist-distribution POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/playlist-distribution?serialNumber=...
 * Retrieve distribution config for a device.
 */
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const serialNumber = req.nextUrl.searchParams.get('serialNumber');

    if (!serialNumber) {
      return NextResponse.json({ success: false, error: 'serialNumber query parameter is required' }, { status: 400 });
    }

    const config = await PlaylistDistribution.findOne({
      serialNumber: serialNumber
    }).lean();

    if (!config) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No distribution config found for this device (sequential playback will be used)'
      });
    }

    return NextResponse.json({
      success: true,
      data: config
    });

  } catch (error) {
    console.error('[playlist-distribution GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/playlist-distribution?serialNumber=...
 * Remove distribution config (revert to sequential playback).
 */
export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    const serialNumber = req.nextUrl.searchParams.get('serialNumber');

    if (!serialNumber) {
      return NextResponse.json({ success: false, error: 'serialNumber query parameter is required' }, { status: 400 });
    }

    const result = await PlaylistDistribution.findOneAndDelete({
      serialNumber: serialNumber
    });

    if (!result) {
      return NextResponse.json({ success: false, error: 'No distribution config found for this device' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Distribution config removed. Device will use sequential playback.'
    });

  } catch (error) {
    console.error('[playlist-distribution DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
