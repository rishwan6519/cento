import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import DevicePlaylist from '@/models/ConectPlaylist';
import MediaGroup from '@/models/MediaGroups';
import PlaylistConfig from "@/models/PlaylistConfig";
import AnnouncementPlaylist from '@/models/AnnouncementPlaylist';
import DeviceAnnouncementConnection from '@/models/AnnouncementConnection';
import "@/models/Device";
import "@/models/User";
import mongoose from 'mongoose';
import { isTimeOverlapping } from '@/lib/conflictCheck';





export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { deviceId, playlistIds, userId, priorities = {} } = body;

    if (!deviceId || !playlistIds || playlistIds.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Check for Quick Playlist (Media Group) conflict first
    const deviceObjectId = new mongoose.Types.ObjectId(deviceId);
    const existingQuick = await MediaGroup.findOne({ deviceIds: deviceObjectId });
    if (existingQuick) {
      return NextResponse.json({
        error: `Conflict: This device is already assigned to the Quick Playlist group "${existingQuick.name}". Please disconnect it there first.`,
        conflict: true,
        conflictType: 'quick'
      }, { status: 409 });
    }

    // 2. Schedule Conflict Check (New Feature)
    const newPlaylists = await PlaylistConfig.find({ _id: { $in: playlistIds } });
    
    // Check against existing regular playlists for THIS device
    const existingConnections = await DevicePlaylist.findOne({ deviceId }).populate('playlistIds');
    if (existingConnections) {
      for (const newP of newPlaylists) {
        for (const existingP of (existingConnections.playlistIds || []) as any[]) {
          if (newP._id.toString() === existingP._id.toString()) continue;
          if (isTimeOverlapping(newP as any, existingP as any)) {
             return NextResponse.json({
                error: `Conflict: Time Slot overlap with existing playlist "${existingP.name}"`,
                conflict: true,
                conflictType: 'regular'
              }, { status: 409 });
          }
        }
      }
    }

    // Check against existing announcements for THIS device
    const announcementConnections = await DeviceAnnouncementConnection.findOne({ deviceId }).populate('announcementPlaylistIds');
    if (announcementConnections) {
       for (const newP of newPlaylists) {
         for (const existingAnn of (announcementConnections.announcementPlaylistIds || []) as any[]) {
            const schedule = existingAnn.schedule || {};
            if (schedule.scheduleType === 'hourly') continue; // Simple overlap skip for hourly for now or treat as always overlap?
            if (isTimeOverlapping(newP as any, schedule as any)) {
               return NextResponse.json({
                  error: `Conflict: Time Slot overlap with existing announcement "${existingAnn.name}"`,
                  conflict: true,
                  conflictType: 'announcement'
                }, { status: 409 });
            }
         }
       }
    }

    // 3. Check for existing regular playlist record (Previous logic)
    const existing = await DevicePlaylist.findOne({ deviceId });

    if (existing) {
      // Check if a DIFFERENT user already has playlists on this device — BLOCK only if they have active playlists
      if (existing.userId && existing.userId.toString() !== userId && existing.playlistIds && existing.playlistIds.length > 0) {
        return NextResponse.json({
          error: 'Conflict: Another user already has a regular playlist connected to this device. Please disconnect it first.',
          conflict: true,
          conflictType: 'regular'
        }, { status: 409 });
      }

      // If different user but empty playlists, or same user: update/reassign
      const updatedPlaylistIds = Array.from(new Set([...(existing.playlistIds || []), ...playlistIds]));
      existing.playlistIds = updatedPlaylistIds;
      existing.userId = userId; // Update user just in case it was an empty remnant from another user
      existing.updatedAt = new Date();
      if (!existing.priorities) existing.priorities = new Map();
      Object.entries(priorities).forEach(([pid, prio]) => {
         existing.priorities.set(pid, prio as number);
      });
      await existing.save();

      return NextResponse.json(existing);
    } else {
      // No record, create new
      const newDevicePlaylist = await DevicePlaylist.create({
        deviceId,
        playlistIds,
        priorities,
        userId,
        updatedAt: new Date()
      });

      return NextResponse.json(newDevicePlaylist);
    }
  } catch (error) {
    console.error('Error saving playlists for device:', error);
    return NextResponse.json({ error: 'Failed to connect playlists' }, { status: 500 });
  }
}


interface Playlist {
  _id: string;
  name?: string;
  startTime?: string;
  endTime?: string;
}
interface IDevicePlaylist {
  deviceId: string;
  playlistIds: Playlist[];
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    const query: any = {
      'playlistIds.0': { $exists: true }
    };
    if (userId) {
      query.userId = userId;
    }

    const devicePlaylists: IDevicePlaylist[] = await DevicePlaylist.find(query)
      .populate("playlistIds")
      .select("-__v -createdAt -updatedAt");
      console.log('devicePlaylists', devicePlaylists);

    const playlistMap = new Map();

    devicePlaylists.forEach(dp => {
      const deviceIdString = dp.deviceId.toString();

      dp.playlistIds.forEach((playlist: Playlist) => {
        const playlistId = playlist._id.toString();

        if (!playlistMap.has(playlistId)) {
          playlistMap.set(playlistId, {
            playlistData: playlist,
            deviceIds: []
          });
        }

        const entry = playlistMap.get(playlistId);
        if (!entry.deviceIds.includes(deviceIdString)) {
          entry.deviceIds.push(deviceIdString);
        }
      });
    });

    const result = Array.from(playlistMap.values());
    console.log('Resulting playlists:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching device playlists:', error);
    return NextResponse.json({ error: 'Failed to fetch device playlists' }, { status: 500 });
  }
}
export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const url = new URL(req.url);
    const deviceId = url.searchParams.get('deviceId');
    const playlistId = url.searchParams.get('playlistId');

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    // If a playlistId is provided, remove that specific playlist from the device.
    if (playlistId) {
      const result = await DevicePlaylist.updateOne(
        { deviceId },
        { $pull: { playlistIds: playlistId } }
      );

      if (result.modifiedCount === 0) {
        return NextResponse.json({ error: 'Device or playlist not found' }, { status: 404 });
      }
    } else {
      // If no playlistId is provided, you could choose to delete the entire device playlist record.
      // For this use case, we'll assume we always get a playlistId.
      return NextResponse.json({ error: 'Playlist ID is required for disconnection' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Playlist disconnected successfully" });
  } catch (error) {
    console.error('Error removing device playlist:', error);
    return NextResponse.json({ error: 'Failed to disconnect playlist' }, { status: 500 });
  }
}


