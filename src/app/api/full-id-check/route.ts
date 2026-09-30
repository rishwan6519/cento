import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Device from '@/models/Device';
import DevicePlaylist from '@/models/ConectPlaylist';
import Playlist from '@/models/PlaylistConfig';
import ConnectedAnnouncement from '@/models/AnnouncementConnection';
import AnnouncementPlaylist from '@/models/AnnouncementPlaylist';
import Announcement from '@/models/AnnouncementFiles';
import mongoose from 'mongoose';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const serialNumber = req.nextUrl.searchParams.get('serialNumber');
    if (!serialNumber) {
      return NextResponse.json({ error: 'Serial number is required' }, { status: 400 });
    }

    // 🔹 1. Find Device
    const device = await Device.findOne({ serialNumber });
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    const versionData: any = { playlists: [], announcements: [] };

    // 🔹 2. Get Linked Playlists
    const devicePlaylist = await DevicePlaylist.findOne({ deviceId: device._id });
    const playlistIds = devicePlaylist?.playlistIds || [];

    if (playlistIds.length > 0) {
      const playlists = await Playlist.find({ _id: { $in: playlistIds } });
      versionData.playlists = playlists.map((p: any) => ({
        id: p._id.toString(),
        contentType: p.contentType,
        startDate: p.startDate,
        endDate: p.endDate,
        daysOfWeek: p.daysOfWeek,
        startTime: p.startTime,
        endTime: p.endTime,
        shuffle: p.shuffle,
        priority: p.priority !== undefined ? p.priority : (devicePlaylist.priorities ? (devicePlaylist.priorities.get(p._id.toString()) || 0) : 0),
        files: p.files.map((f: any) => ({
          path: `https://iot.centelon.com/${(f.path || '').replace(/^(https?:\/\/iot\.centelon\.com)?\/?/, '')}`,
          displayOrder: f.displayOrder,
          type: f.type,
          delay: f.delay,
          maxVolume: f.maxVolume,
          minVolume: f.minVolume,
          backgroundImageEnabled: f.backgroundImageEnabled,
          backgroundImage: f.backgroundImage
        }))
      }));
    }

    // 🔹 3. Get Linked Announcement Playlists
    const connections = await ConnectedAnnouncement.find({ deviceId: device._id });
    const announcementIds = [
      ...connections.flatMap((c: any) => c.announcementPlaylistIds || []),
      ...(devicePlaylist?.announcementPlaylistIds || [])
    ];

    if (announcementIds.length > 0) {
      const announcementPlaylists = await AnnouncementPlaylist.find({ _id: { $in: announcementIds } });
      
      // Manually populate files if they are ObjectIds to avoid CastError with URL strings
      for (const ap of announcementPlaylists) {
        if (ap.announcements) {
          for (const a of ap.announcements) {
            if (a.file && mongoose.Types.ObjectId.isValid(a.file) && a.file.toString().length === 24) {
              try {
                const doc = await Announcement.findById(a.file);
                if (doc) a.file = doc;
              } catch (err) {}
            }
          }
        }
      }

      const melbourneTimeZone = 'Australia/Melbourne';
      const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: melbourneTimeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
      const todayStr = dateFormatter.format(new Date());

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

      const rawAnnouncements = announcementPlaylists
        .filter((ap: any) => {
          if (ap.schedule && ap.schedule.endDate) {
             return ap.schedule.endDate >= todayStr;
          }
          return true;
        })
        .map((ap: any) => ({
        id: ap._id.toString(),
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
      }));

      versionData.announcements = mergeOverlappingAnnouncements(rawAnnouncements);
    }
    // 🔹 4. Compute Hash
    const versionId = crypto.createHash('md5').update(JSON.stringify(versionData)).digest('hex');

    // 🔹 5. Send Response
    return NextResponse.json({
      success: true,
      deviceId: device._id,
      serialNumber: device.serialNumber,
      versionId,
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error('Error fetching device version info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch device version info', details: error instanceof Error ? error.message : error },
      { status: 500 }
    );
  }
}
