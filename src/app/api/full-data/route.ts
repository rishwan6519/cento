import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import Device from '@/models/Device';
import DevicePlaylist from '@/models/ConectPlaylist';
import Playlist from '@/models/PlaylistConfig';
import ConnectedAnnouncement from '@/models/AnnouncementConnection';
import AnnouncementPlaylist from '@/models/AnnouncementPlaylist';
import Announcement from '@/models/AnnouncementFiles';
import MediaGroup from '@/models/MediaGroups';
import MediaItem from '@/models/MediaItems';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const serialNumber = req.nextUrl.searchParams.get('serialNumber');
    if (!serialNumber) {
      return NextResponse.json({ error: 'Serial number is required' }, { status: 400 });
    }

    // 1️⃣ Find Device
    const device = await Device.findOne({ serialNumber });
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    // Setup Melbourne timezone utilities
    const melbourneTZ = 'Australia/Melbourne';
    const now = new Date();
    const timeFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: melbourneTZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: melbourneTZ, year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const weekDayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: melbourneTZ, weekday: 'long'
    });

    const currentTime = timeFormatter.format(now);
    const todayStr = dateFormatter.format(now);
    const todayWeekDay = weekDayFormatter.format(now).toLowerCase();

    // 2️⃣ Fetch linked Playlists
    const devicePlaylist = await DevicePlaylist.findOne({ deviceId: device._id });
    let playlistDetails: Array<{
      id: any;
      versionId: string;
      contentType: any;
      startDate: any;
      endDate: any;
      daysOfWeek: any;
      startTime: any;
      endTime: any;
      shuffle: any;
      files: Array<{
        path: string;
        displayOrder: any;
        type: any;
        delay: any;
        maxVolume: any;
        minVolume: any;
        backgroundImageEnabled: any;
        backgroundImage: any;
      }>;
    }> = [];

    if (devicePlaylist && devicePlaylist.playlistIds.length > 0) {
      const playlists = await Playlist.find({ _id: { $in: devicePlaylist.playlistIds } })
        .populate({ path: 'files.fileId', model: 'MediaItem', select: 'fileCategory videoCategory type _id' });
        
      // Build a fallback map for files missing fileId
      const missingPaths: string[] = [];
      playlists.forEach((p: any) => {
         p.files.forEach((f: any) => {
            if (!f.fileId || typeof f.fileId !== 'object') {
               const relativePath = '/' + (f.path || '').replace(/^(https?:\/\/[^\/]+)?\/?/, '');
               missingPaths.push(relativePath);
            }
         });
      });
      
      const fallbackMediaMap: any = {};
      if (missingPaths.length > 0) {
         const MediaItemModel = mongoose.models.MediaItem || mongoose.model('MediaItem');
         const fallbackMedia = await MediaItemModel.find({ url: { $in: missingPaths } }).lean();
         fallbackMedia.forEach((m: any) => {
            fallbackMediaMap[m.url] = m;
         });
      }

      playlistDetails = playlists.map((p: any) => {
        const payload = {
          name: p.name,
          contentType: p.contentType,
          startDate: p.startDate,
          endDate: p.endDate,
          daysOfWeek: p.daysOfWeek,
          startTime: p.startTime,
          endTime: p.endTime,
          shuffle: p.shuffle,
          priority: p.priority !== undefined ? p.priority : (devicePlaylist.priorities ? (devicePlaylist.priorities.get(p._id.toString()) || 0) : 0),
          files: p.files.map((f: any) => {
            let actualMedia: any = null;
            if (typeof f.fileId === 'object' && f.fileId) {
              actualMedia = f.fileId;
            } else {
              const relativePath = '/' + (f.path || '').replace(/^(https?:\/\/[^\/]+)?\/?/, '');
              actualMedia = fallbackMediaMap[relativePath];
            }
            
            let fType = actualMedia ? actualMedia.type : f.type;
            if (!fType || fType === 'file' || fType === 'generic') {
               const pLow = (f.path || '').toLowerCase();
               if (pLow.endsWith('.mp4') || pLow.endsWith('.webm') || pLow.endsWith('.ogg')) fType = 'video';
               else if (pLow.endsWith('.mp3') || pLow.endsWith('.wav')) fType = 'audio';
               else if (pLow.endsWith('.jpg') || pLow.endsWith('.jpeg') || pLow.endsWith('.png')) fType = 'image';
               else fType = 'file';
            }

            return {
              mediaId: actualMedia ? actualMedia._id.toString() : null,
              fileCategory: actualMedia ? (actualMedia.fileCategory || actualMedia.videoCategory || 'other') : 'other',
              path: `https://iot.centelon.com/${(f.path || '').replace(/^(https?:\/\/[^\/]+)?\/?/, '')}`,
              displayOrder: f.displayOrder,
              type: fType,
            delay: f.delay,
            maxVolume: f.maxVolume,
            minVolume: f.minVolume,
              backgroundImageEnabled: f.backgroundImageEnabled,
              backgroundImage: f.backgroundImage
            };
          })
        };

        return {
          id: p._id,
          versionId: crypto.createHash('md5').update(JSON.stringify(payload)).digest('hex'),
          ...payload
        };
      });
    }

    // 3️⃣ Fetch linked Announcement Playlists
    const connections = await ConnectedAnnouncement.find({ deviceId: device._id });
    let announcementDetails: Array<{
      id: string;
      versionId: string;
      schedule: any;
      announcements: Array<{
        name: string;
        path: string;
        displayOrder: any;
        delay: any;
      }>;
    }> = [];

    if (connections && connections.length > 0) {
      const allIds = connections.flatMap((c: any) => c.announcementPlaylistIds);
      const announcementPlaylists = await AnnouncementPlaylist.find({ _id: { $in: allIds } }).populate({
        path: 'announcements.file',
        model: Announcement
      });

      announcementDetails = announcementPlaylists.map((ap: any) => {
        const payload = {
          name: ap.name,
          schedule: ap.schedule,
          announcements: ap.announcements
            .map((a: any) => {
              if (!a.file) return null;
              return {
                name: a.file.name,
                path: `https://iot.centelon.com/${(a.file.path || '').replace(/^(https?:\/\/iot\.centelon\.com)?\/?/, '')}`,
                displayOrder: a.displayOrder,
                delay: a.delay
              };
            })
            .filter(Boolean)
        };

        return {
          id: ap._id.toString(),
          versionId: crypto.createHash('md5').update(JSON.stringify(payload)).digest('hex'),
          ...payload
        };
      });
    }

    // 4️⃣ Fetch group information for the device
    const deviceObjectId = new mongoose.Types.ObjectId(device._id);
    const groups = await MediaGroup.find({ deviceIds: deviceObjectId })
      .populate('mediaIds')
      .populate('deviceIds');

    // 5️⃣ Fetch media files for each group
    const groupDetails = groups.map((group: any) => {
      // Extract media file URLs
      const mediaUrls = group.mediaIds?.map((media: any) => ({
        id: media._id,
        name: media.name,
        url: `https://iot.centelon.com/${(media.url || '').replace(/^(https?:\/\/iot\.centelon\.com)?\/?/, '')}`,
        type: media.type,
        createdAt: media.createdAt
      })) || [];

      return {
        id: group._id,
        name: group.name,
        description: group.description,
        mediaCount: group.mediaIds?.length || 0,
        deviceCount: group.deviceIds?.length || 0,
        mediaUrls: mediaUrls, // Include the actual media file URLs
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      };
    });

    // 6️⃣ Response
    return NextResponse.json({
      success: true,
      device: {
        id: device._id,
        serialNumber: device.serialNumber,
        name: device.name,
        location: (device as any).location,
        latestScreenshotUrl: (device as any).latestScreenshotUrl,
      },
      dateTime: {
        australian: currentTime,
        date: todayStr,
        weekday: todayWeekDay,
      },
      playlists: playlistDetails,
      announcements: announcementDetails,
      groups: groupDetails, // Added group information with media URLs
    });

  } catch (error) {
    console.error('Error fetching full device data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch full device data', details: error instanceof Error ? error.message : error },
      { status: 500 }
    );
  }
}