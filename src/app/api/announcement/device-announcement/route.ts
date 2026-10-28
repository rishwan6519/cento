import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AnnouncementConnection from '@/models/AnnouncementConnection';
import AnnouncementPlaylist from '@/models/AnnouncementPlaylist';
import DevicePlaylist from '@/models/ConectPlaylist';
import PlaylistConfig from '@/models/PlaylistConfig';
import { isTimeOverlapping } from '@/lib/conflictCheck';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });
    }

    await connectToDatabase();

    const connection = await AnnouncementConnection.findOne({ deviceId });

    if (!connection) {
      return NextResponse.json({ announcementPlaylistIds: [] }, { status: 200 });
    }

    return NextResponse.json(
      { announcementPlaylistIds: connection.announcementPlaylistIds },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /device-announcement/connected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, deviceId, announcementPlaylistIds } = body;

    if (!userId || !deviceId || !Array.isArray(announcementPlaylistIds)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    // 1. Conflict Check Logic
    const newPlaylists = await AnnouncementPlaylist.find({ _id: { $in: announcementPlaylistIds } });
    
    // Check against existing announcements for this device
    const existingAnnConnection = await AnnouncementConnection.findOne({ deviceId }).populate('announcementPlaylistIds');
    if (existingAnnConnection) {
        for (const newP of newPlaylists) {
            for (const existingP of (existingAnnConnection.announcementPlaylistIds || []) as any[]) {
                if (newP._id.toString() === existingP._id.toString()) continue;
                if (newP.schedule?.scheduleType === 'hourly' || existingP.schedule?.scheduleType === 'hourly') continue;
                if (isTimeOverlapping(newP.schedule as any, existingP.schedule as any)) {
                    return NextResponse.json({
                        error: `Conflict: Time Slot overlap with existing announcement "${existingP.name}"`,
                        conflict: true
                    }, { status: 409 });
                }
            }
        }
    }

    // Check against existing regular playlists for this device
    const existingPlaylistConnection = await DevicePlaylist.findOne({ deviceId }).populate('playlistIds');
    if (existingPlaylistConnection) {
        for (const newP of newPlaylists) {
            if (newP.schedule?.scheduleType === 'hourly') continue;
            for (const existingP of (existingPlaylistConnection.playlistIds || []) as any[]) {
                if (isTimeOverlapping(newP.schedule as any, existingP as any)) {
                    return NextResponse.json({
                        error: `Conflict: Time Slot overlap with existing regular playlist "${existingP.name}"`,
                        conflict: true
                    }, { status: 409 });
                }
            }
        }
    }

    // 2. Upsert connection (Previous logic)
    const existing = await AnnouncementConnection.findOne({ userId, deviceId });

    if (existing) {
      existing.announcementPlaylistIds = announcementPlaylistIds;
      await existing.save();
      return NextResponse.json(
        { message: 'Connection updated', connection: existing },
        { status: 200 }
      );
    }

    const newConnection = await AnnouncementConnection.create({
      userId,
      deviceId,
      announcementPlaylistIds,
    });

    return NextResponse.json(
      { message: 'Connection created', connection: newConnection },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /device-announcement error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');
    const announcementPlaylistId = searchParams.get('announcementPlaylistId');

    if (!deviceId || !announcementPlaylistId) {
      return NextResponse.json(
        { error: 'Missing deviceId or announcementPlaylistId' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Cast to ObjectId for proper matching
    let deviceObjId: mongoose.Types.ObjectId | null = null;
    let annObjId: mongoose.Types.ObjectId | null = null;
    try {
      deviceObjId = new mongoose.Types.ObjectId(deviceId);
      annObjId = new mongoose.Types.ObjectId(announcementPlaylistId);
    } catch { /* ids may not be valid ObjectIds */ }

    let totalModified = 0;

    // 1. Remove from AnnouncementConnection collection (ObjectId match)
    if (deviceObjId && annObjId) {
      const r1 = await AnnouncementConnection.updateOne(
        { deviceId: deviceObjId },
        { $pull: { announcementPlaylistIds: annObjId } }
      );
      totalModified += r1.modifiedCount;

      // 2. Also remove from DevicePlaylist.announcementPlaylistIds (ObjectId match)
      const r2 = await DevicePlaylist.updateOne(
        { deviceId: deviceObjId },
        { $pull: { announcementPlaylistIds: annObjId } }
      );
      totalModified += r2.modifiedCount;
    }

    // Fallback: string-based match
    if (totalModified === 0) {
      const r3 = await AnnouncementConnection.updateOne(
        { deviceId: deviceId },
        { $pull: { announcementPlaylistIds: announcementPlaylistId as any } }
      );
      const r4 = await DevicePlaylist.updateOne(
        { deviceId: deviceId },
        { $pull: { announcementPlaylistIds: announcementPlaylistId as any } }
      );
      totalModified += r3.modifiedCount + r4.modifiedCount;
    }

    if (totalModified === 0) {
      return NextResponse.json(
        { error: "Device connection not found or playlist already disconnected" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Announcement disconnected successfully" },
      { status: 200 }
    );

  } catch (error) {
    console.error('DELETE /device-announcement error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}