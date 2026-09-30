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
    
    // Also include announcements connected via DevicePlaylist (concurrent-playlists)
    const devicePlaylistsAnnouncements = await DevicePlaylist.find({ deviceId: device._id }, 'announcementPlaylistIds');
    
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

    const allAnnIds = [
      ...connections.flatMap((c: any) => c.announcementPlaylistIds || []),
      ...devicePlaylistsAnnouncements.flatMap((c: any) => c.announcementPlaylistIds || [])
    ];

    if (allAnnIds.length > 0) {
      const announcementPlaylists = await AnnouncementPlaylist.find({ _id: { $in: allAnnIds } });

      // Manually populate files if they are ObjectIds to avoid CastError with URL strings
      for (const ap of announcementPlaylists) {
        if (ap.announcements) {
          for (const a of ap.announcements) {
            if (a.file && mongoose.Types.ObjectId.isValid(a.file) && a.file.toString().length === 24) {
              try {
                const doc = await Announcement.findById(a.file);
                if (doc) {
                  a.file = doc;
                }
              } catch (err) {}
            }
          }
        }
      }

      // Helper function to merge overlapping announcements by date and time
      const mergeOverlappingAnnouncements = (playlists: any[]) => {
        function getNextDay(dateStr: string) {
          if (!dateStr || dateStr.startsWith('2099')) return "2099-12-31";
          const d = new Date(dateStr);
          d.setDate(d.getDate() + 1);
          return d.toISOString().split('T')[0];
        }

        function getPrevDay(dateStr: string) {
          if (!dateStr || dateStr.startsWith('1970')) return "1970-01-01";
          const d = new Date(dateStr);
          d.setDate(d.getDate() - 1);
          return d.toISOString().split('T')[0];
        }

        const groups = new Map<string, any[]>();
        for (const p of playlists) {
          const key = `${p.schedule.scheduleType}_${p.schedule.frequency || ''}_${(p.schedule.daysOfWeek || []).sort().join(',')}`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(p);
        }

        const result: any[] = [];
        
        for (const group of groups.values()) {
          let datePoints = new Set<string>();
          for (const p of group) {
            datePoints.add(p.schedule.startDate || "1970-01-01");
            datePoints.add(getNextDay(p.schedule.endDate || "2099-12-31"));
          }
          const sortedDates = Array.from(datePoints).sort();

          for (let i = 0; i < sortedDates.length - 1; i++) {
            const dStart = sortedDates[i];
            const dEndNext = sortedDates[i+1];
            const dEnd = getPrevDay(dEndNext);

            if (dStart > dEnd) continue;

            const activeInDate = group.filter(p => {
              const ps = p.schedule.startDate || "1970-01-01";
              const pe = p.schedule.endDate || "2099-12-31";
              return ps <= dStart && pe >= dEnd;
            });

            if (activeInDate.length === 0) continue;

            let timePoints = new Set<string>();
            timePoints.add("00:00");
            timePoints.add("23:59");
            
            for (const p of activeInDate) {
              if (p.schedule.startTime) timePoints.add(p.schedule.startTime);
              if (p.schedule.endTime) timePoints.add(p.schedule.endTime);
            }
            
            const sortedTimes = Array.from(timePoints).sort();
            
            for (let j = 0; j < sortedTimes.length - 1; j++) {
              const tStart = sortedTimes[j];
              const tEnd = sortedTimes[j+1];
              if (tStart === tEnd) continue;
              
              const activeInTime = activeInDate.filter(p => {
                const ts = p.schedule.startTime || "00:00";
                const te = p.schedule.endTime || "23:59";
                return ts <= tStart && te >= tEnd;
              });

              if (activeInTime.length === 0) continue;

              const combinedFiles: any[] = [];
              let order = 1;
              for (const p of activeInTime) {
                for (const f of p.announcements) {
                  combinedFiles.push({ ...f, displayOrder: order++ });
                }
              }

              const base = activeInTime[0];
              result.push({
                id: `merged-${crypto.createHash('md5').update(`${dStart}-${dEnd}-${tStart}-${tEnd}`).digest('hex').substring(0,8)}`,
                versionId: base.versionId,
                name: activeInTime.length > 1 ? `Combined (${tStart}-${tEnd})` : base.name,
                schedule: {
                  ...base.schedule,
                  startDate: dStart === "1970-01-01" ? null : dStart,
                  endDate: dEnd === "2099-12-31" ? null : dEnd,
                  startTime: tStart,
                  endTime: tEnd
                },
                announcements: combinedFiles
              });
            }
          }
        }
        return result;
      };

      const melbourneTimeZone = 'Australia/Melbourne';
      const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: melbourneTimeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
      const todayStr = dateFormatter.format(new Date());

      announcementDetails = announcementPlaylists
        .filter((ap: any) => {
          if (ap.schedule && ap.schedule.endDate) {
             return ap.schedule.endDate >= todayStr;
          }
          return true;
        })
        .map((ap: any) => {
        const payload = {
          name: ap.name,
          schedule: ap.schedule,
          announcements: ap.announcements
            .map((a: any) => {
              if (!a.file) return null;
              
              let fileName = 'Announcement';
              let filePath = '';
              
              if (typeof a.file === 'object') {
                 fileName = a.file.name || 'Announcement';
                 filePath = a.file.path || '';
              } else if (typeof a.file === 'string') {
                 if (a.file.includes("path: '")) {
                    const pathMatch = a.file.match(/path:\s*'([^']+)'/);
                    if (pathMatch) filePath = pathMatch[1];
                 } else {
                    filePath = a.file;
                 }

                 if (a.file.includes("name: '")) {
                    const nameMatch = a.file.match(/name:\s*'([^']+)'/);
                    if (nameMatch) fileName = nameMatch[1];
                 } else {
                    fileName = filePath.split('/').pop() || 'Announcement';
                 }
              }

              return {
                name: fileName,
                path: `https://iot.centelon.com/${(filePath).replace(/^(https?:\/\/iot\.centelon\.com)?\/?/, '')}`,
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

      announcementDetails = mergeOverlappingAnnouncements(announcementDetails);
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