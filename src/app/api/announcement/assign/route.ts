import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import DeviceAnnouncementConnection from '@/models/AnnouncementConnection';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, deviceIds, announcementPlaylistId } = body;

    if (!userId || !announcementPlaylistId || !Array.isArray(deviceIds)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    const results = [];

    const newPlaylist = await mongoose.model('AnnouncementPlaylist').findById(announcementPlaylistId);
    if (!newPlaylist) {
      return NextResponse.json({ error: 'Announcement playlist not found' }, { status: 404 });
    }

    // Disconnect from devices that are no longer selected
    const allConnected = await DeviceAnnouncementConnection.find({ announcementPlaylistIds: announcementPlaylistId });
    for (const conn of allConnected) {
      if (!deviceIds.includes(conn.deviceId.toString())) {
        conn.announcementPlaylistIds = conn.announcementPlaylistIds.filter(
          (id: any) => id.toString() !== announcementPlaylistId.toString()
        );
        await conn.save();
      }
    }

    // Loop through each device ID and merge the announcement connection
    for (const deviceId of deviceIds) {
      const existing = await DeviceAnnouncementConnection.findOne({ deviceId });

      if (existing) {
        // Fetch existing connected playlists to check for conflicts
        const existingPlaylists = await mongoose.model('AnnouncementPlaylist').find({
          _id: { $in: existing.announcementPlaylistIds }
        });

        // Check for overlaps
        for (const ep of existingPlaylists) {
          if (ep._id.toString() === announcementPlaylistId.toString()) continue;

          // Check Date Overlap
          const ns = newPlaylist.schedule?.startDate;
          const ne = newPlaylist.schedule?.endDate;
          const es = ep.schedule?.startDate;
          const ee = ep.schedule?.endDate;
          const datesOverlap = (!ns || !ee || ns <= ee) && (!es || !ne || es <= ne);

          // Check Day Overlap
          const nd = newPlaylist.schedule?.daysOfWeek || [];
          const ed = ep.schedule?.daysOfWeek || [];
          const daysOverlap = nd.length === 0 || ed.length === 0 || nd.some((d: string) => ed.includes(d));

          // Check Time Overlap
          const nts = newPlaylist.schedule?.startTime;
          const nte = newPlaylist.schedule?.endTime;
          const ets = ep.schedule?.startTime;
          const ete = ep.schedule?.endTime;
          const timesOverlap = (!nts || !ete || nts < ete) && (!ets || !nte || ets < nte);

          if (datesOverlap && daysOverlap && timesOverlap) {
            return NextResponse.json({
              error: `Conflict alert: Device is already connected to an overlapping announcement (${ep.name}). Disconnect the existing announcement and try again.`
            }, { status: 409 });
          }
        }
        // Ensure userId is correctly set if the connection exists but might be missing
        if (!existing.userId) {
          existing.userId = userId;
        }

        // Check if the playlist ID is already present
        const alreadyExists = existing.announcementPlaylistIds.some(
          (id: any) => id.toString() === announcementPlaylistId.toString()
        );

        if (!alreadyExists) {
          existing.announcementPlaylistIds.push(announcementPlaylistId);
          await existing.save();
        }

        results.push({ deviceId, status: 'updated' });
      } else {
        // Create new connection if none exists
        await DeviceAnnouncementConnection.create({
          userId,
          deviceId,
          announcementPlaylistIds: [announcementPlaylistId],
        });
        results.push({ deviceId, status: 'created' });
      }
    }

    return NextResponse.json({ success: true, results }, { status: 200 });
  } catch (error) {
    console.error('Error assigning announcement to devices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
