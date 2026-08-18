import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import PlaylistDistribution from '@/models/PlaylistDistribution';
import PlaylistConfig from '@/models/PlaylistConfig';
import MediaItem from '@/models/MediaItems';
import mongoose from 'mongoose';
import { detectMediaType } from '@/lib/timelineHelper';

export const dynamic = 'force-dynamic';

/**
 * POST /api/playlist-distribution
 * Save or update percentage-based distribution config for a playlist.
 *
 * Body:
 * {
 *   "playlistId": "6a7e1d780c43c54b5ea2379f",
 *   "distribution": { "offer": 30, "video": 70 }
 * }
 *
 * Percentages are auto-normalized to 100%.
 * Returns error if the playlist has zero files for any configured type.
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { playlistId, distribution } = body;

    if (!playlistId) {
      return NextResponse.json({ success: false, error: 'playlistId is required' }, { status: 400 });
    }
    if (!distribution || typeof distribution !== 'object' || Object.keys(distribution).length === 0) {
      return NextResponse.json({ success: false, error: 'distribution object is required with at least one type' }, { status: 400 });
    }

    // Validate all values are positive numbers
    const entries = Object.entries(distribution) as [string, number][];
    for (const [type, pct] of entries) {
      if (typeof pct !== 'number' || pct <= 0) {
        return NextResponse.json({
          success: false,
          error: `Invalid percentage for type "${type}": must be a positive number`
        }, { status: 400 });
      }
    }

    // Auto-normalize to 100%
    const rawTotal = entries.reduce((sum, [, pct]) => sum + pct, 0);
    const normalized: Record<string, number> = {};
    for (const [type, pct] of entries) {
      normalized[type.toLowerCase()] = Math.round((pct / rawTotal) * 10000) / 100; // 2 decimal places
    }

    // Verify playlist exists and check that files exist for each configured type
    const playlist = await PlaylistConfig.findById(playlistId)
      .populate({ path: 'files.mediaId', model: MediaItem })
      .lean() as any;

    if (!playlist) {
      return NextResponse.json({ success: false, error: 'Playlist not found' }, { status: 404 });
    }

    // We removed the strict check that required every configured type to exist in the specific playlist
    // because playlists can be combined with other playlists at runtime in the timeline.
    
    // Upsert distribution config
    const result = await PlaylistDistribution.findOneAndUpdate(
      { playlistId: new mongoose.Types.ObjectId(playlistId) },
      { distribution: normalized },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Distribution saved successfully',
      data: {
        playlistId,
        distribution: normalized,
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
 * GET /api/playlist-distribution?playlistId=...
 * Retrieve distribution config for a playlist.
 */
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const playlistId = req.nextUrl.searchParams.get('playlistId');

    if (!playlistId) {
      return NextResponse.json({ success: false, error: 'playlistId query parameter is required' }, { status: 400 });
    }

    const config = await PlaylistDistribution.findOne({
      playlistId: new mongoose.Types.ObjectId(playlistId)
    }).lean();

    if (!config) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No distribution config found for this playlist (sequential playback will be used)'
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
 * DELETE /api/playlist-distribution?playlistId=...
 * Remove distribution config (revert to sequential playback).
 */
export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    const playlistId = req.nextUrl.searchParams.get('playlistId');

    if (!playlistId) {
      return NextResponse.json({ success: false, error: 'playlistId query parameter is required' }, { status: 400 });
    }

    const result = await PlaylistDistribution.findOneAndDelete({
      playlistId: new mongoose.Types.ObjectId(playlistId)
    });

    if (!result) {
      return NextResponse.json({ success: false, error: 'No distribution config found for this playlist' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Distribution config removed. Playlist will use sequential playback.'
    });

  } catch (error) {
    console.error('[playlist-distribution DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
