import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import PlaylistConfig from '@/models/PlaylistConfig';
import DevicePlaylist from '@/models/ConectPlaylist';
import OnboardedDevice from '@/models/OnboardedDevice';
import AssignedDevice from '@/models/AssignDevice';
import Device from '@/models/Device';
import mongoose from 'mongoose';
import MediaItem from '@/models/MediaItems';
import AnnouncementPlaylist from '@/models/AnnouncementPlaylist';
import User from '@/models/User';

/**
 * Concurrent Playlist API Endpoint (/api/concurrent-playlists)
 * Supports Device Serial Numbers directly instead of requiring raw MongoDB ObjectIds,
 * automatically extracts and populates userId from target devices,
 * and allows multiple concurrent playlists at the identical date and time window.
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const {
      name,
      type,
      category,       // alias for type
      startTime,
      endTime,
      startDate,
      endDate,
      files,
      mediaIds,       // alias for files
      backgroundAudio,
      userId,
      deviceIds,
      selectedDeviceId,
      serialNumber,              // support device serial number
      deviceSerialNumber,        // alias for serial number
      selectedDeviceSerialNumber,// alias for serial number
      serialNumbers,             // support array of serial numbers
      deviceSerialNumbers,       // alias for array of serial numbers
      daysOfWeek,
      globalMinVolume,
      globalMaxVolume,
      description,
      frequencyInMinutes,
    } = body;

    const resolvedType = type || category || 'media';

    if (!name) {
      return NextResponse.json(
        { error: 'Playlist name is required' },
        { status: 400 }
      );
    }

    // 1. Gather all incoming device inputs (Serial Numbers or ObjectIds)
    const rawDeviceInputs: string[] = [];
    if (serialNumber) rawDeviceInputs.push(String(serialNumber).trim());
    if (deviceSerialNumber && !rawDeviceInputs.includes(String(deviceSerialNumber).trim())) rawDeviceInputs.push(String(deviceSerialNumber).trim());
    if (selectedDeviceSerialNumber && !rawDeviceInputs.includes(String(selectedDeviceSerialNumber).trim())) rawDeviceInputs.push(String(selectedDeviceSerialNumber).trim());
    if (selectedDeviceId && !rawDeviceInputs.includes(String(selectedDeviceId).trim())) rawDeviceInputs.push(String(selectedDeviceId).trim());
    
    if (Array.isArray(serialNumbers)) {
      serialNumbers.forEach((sn: any) => { if (sn && !rawDeviceInputs.includes(String(sn).trim())) rawDeviceInputs.push(String(sn).trim()); });
    }
    if (Array.isArray(deviceSerialNumbers)) {
      deviceSerialNumbers.forEach((sn: any) => { if (sn && !rawDeviceInputs.includes(String(sn).trim())) rawDeviceInputs.push(String(sn).trim()); });
    }
    if (Array.isArray(deviceIds)) {
      deviceIds.forEach((id: any) => { if (id && !rawDeviceInputs.includes(String(id).trim())) rawDeviceInputs.push(String(id).trim()); });
    }

    // 2. Resolve device serial numbers or IDs to actual Device ObjectIds & determine owner userId
    const resolvedDevicesToConnect: { id: string, ownerId?: string }[] = [];
    let autoResolvedUserId = userId || null;

    for (const input of rawDeviceInputs) {
      // First check if it matches a Device Serial Number in database
      const deviceBySerial = await Device.findOne({ serialNumber: input });
      if (deviceBySerial) {
        const actualId = deviceBySerial._id.toString();
        if (!resolvedDevicesToConnect.some(d => d.id === actualId)) {
          resolvedDevicesToConnect.push({ id: actualId });
        }
        // Try to automatically find owner userId if not explicitly passed
        if (!autoResolvedUserId) {
          const onboarded = await OnboardedDevice.findOne({ deviceId: deviceBySerial._id });
          if (onboarded && onboarded.userId) autoResolvedUserId = onboarded.userId;
          else {
            const assigned = await AssignedDevice.findOne({ deviceId: deviceBySerial._id });
            if (assigned && assigned.userId) autoResolvedUserId = assigned.userId;
          }
        }
        continue;
      }

      // Otherwise, check if it's a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(input)) {
        const directDevice = await Device.findById(input);
        if (directDevice) {
          const actualId = directDevice._id.toString();
          if (!resolvedDevicesToConnect.some(d => d.id === actualId)) {
            resolvedDevicesToConnect.push({ id: actualId });
          }
          if (!autoResolvedUserId) {
            const onboarded = await OnboardedDevice.findOne({ deviceId: directDevice._id });
            if (onboarded && onboarded.userId) autoResolvedUserId = onboarded.userId;
            else {
              const assigned = await AssignedDevice.findOne({ deviceId: directDevice._id });
              if (assigned && assigned.userId) autoResolvedUserId = assigned.userId;
            }
          }
          continue;
        }
        const assignment = await AssignedDevice.findById(input);
        if (assignment && assignment.deviceId) {
          const actualId = assignment.deviceId.toString();
          if (!resolvedDevicesToConnect.some(d => d.id === actualId)) {
            resolvedDevicesToConnect.push({ id: actualId, ownerId: assignment.userId });
          }
          if (!autoResolvedUserId && assignment.userId) autoResolvedUserId = assignment.userId;
          continue;
        }
        const onboarding = await OnboardedDevice.findById(input);
        if (onboarding && onboarding.deviceId) {
          const actualId = onboarding.deviceId.toString();
          if (!resolvedDevicesToConnect.some(d => d.id === actualId)) {
            resolvedDevicesToConnect.push({ id: actualId, ownerId: onboarding.userId });
          }
          if (!autoResolvedUserId && onboarding.userId) autoResolvedUserId = onboarding.userId;
          continue;
        }
        const storeUser = await User.findById(input);
        if (storeUser && storeUser.role === 'store') {
          const storeAssignments = await AssignedDevice.find({ userId: input });
          for (const sa of storeAssignments) {
            if (sa.deviceId) {
              const actualId = sa.deviceId.toString();
              if (!resolvedDevicesToConnect.some(d => d.id === actualId)) {
                resolvedDevicesToConnect.push({ id: actualId, ownerId: input });
              }
            }
          }
          if (!autoResolvedUserId) autoResolvedUserId = input;
          continue;
        }
        if (!resolvedDevicesToConnect.some(d => d.id === input)) {
          resolvedDevicesToConnect.push({ id: input });
        }
      }
    }

    // Fallback if userId is still null after checking devices
    if (!autoResolvedUserId && resolvedDevicesToConnect.length > 0) {
      const onboarded = await OnboardedDevice.findOne({ deviceId: resolvedDevicesToConnect[0].id });
      if (onboarded && onboarded.userId) autoResolvedUserId = onboarded.userId;
      else {
        const assigned = await AssignedDevice.findOne({ deviceId: resolvedDevicesToConnect[0].id });
        if (assigned && assigned.userId) autoResolvedUserId = assigned.userId;
        else {
          const anyUser = await User.findOne();
          if (anyUser) autoResolvedUserId = anyUser._id;
        }
      }
    }

    const finalSelectedDeviceId = resolvedDevicesToConnect.length > 0 ? resolvedDevicesToConnect[0].id : (selectedDeviceId || null);
    const finalDeviceIds = resolvedDevicesToConnect.map(d => d.id);

    // 2.5 Determine target device ratio to align media automatically
    let targetRatio: string | null = null;
    if (resolvedDevicesToConnect.length > 0) {
      const dev = await Device.findById(resolvedDevicesToConnect[0].id).populate('typeId');
      if (dev?.screenRatio) {
        targetRatio = dev.screenRatio;
      } else if (dev?.typeId?.screenSize) {
        const { width, height } = dev.typeId.screenSize;
        if (width && height) {
          const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
          const div = gcd(width, height);
          targetRatio = `${width / div}:${height / div}`;
          if (width > height && targetRatio !== "16:9") {
            if (Math.abs(width/height - 16/9) < 0.1) targetRatio = "16:9";
          } else if (height > width && targetRatio !== "9:16") {
            if (Math.abs(height/width - 16/9) < 0.1) targetRatio = "9:16";
            else if (Math.abs(height/width - 5/4) < 0.1) targetRatio = "4:5";
          }
        }
      }
    }

    // 3. Resolve files — accept either 'files' array or 'mediaIds' array
    let resolvedFiles: any[] = [];
    if (Array.isArray(files) && files.length > 0) {
      resolvedFiles = await Promise.all(files.map(async (file: any, index: number) => {
        let mediaDetails = { name: file.name, path: file.path, type: file.type };
        const fileIdToFind = file.mediaId || file.fileId || file._id || file.id;
        let media = null;
        if (fileIdToFind) {
          media = await MediaItem.findById(fileIdToFind);
        } else if (file.path) {
          media = await MediaItem.findOne({ url: file.path });
        }
        
        if (media) {
          if (targetRatio && media.jobId) {
             const alignedMedia = await MediaItem.findOne({ jobId: media.jobId, ratio: targetRatio });
             if (alignedMedia) {
                media = alignedMedia;
             } else {
                const mainMedia = await MediaItem.findOne({ jobId: media.jobId, ratio: "16:9" });
                if (mainMedia) media = mainMedia;
             }
          }
          mediaDetails.name = media.name;
          mediaDetails.path = media.url || media.fileUrl;
          mediaDetails.type = media.type;
        }
        let bgImage = file.backgroundImage || null;
        if (bgImage && mongoose.Types.ObjectId.isValid(bgImage)) {
          const bgMedia = await MediaItem.findById(bgImage);
          if (bgMedia) {
            bgImage = bgMedia.url || bgMedia.fileUrl;
          }
        }
        return {
          ...file,
          ...mediaDetails,
          backgroundImage: bgImage,
          displayOrder: index + 1,
          delay: file.delay || 0
        };
      }));
    } else if (Array.isArray(mediaIds) && mediaIds.length > 0) {
      resolvedFiles = await Promise.all(mediaIds.map(async (id: any, index: number) => {
        let mediaDetails = { name: undefined, path: undefined, type: undefined };
        if (id) {
          let media = await MediaItem.findById(id);
          if (media) {
            if (targetRatio && media.jobId) {
               const alignedMedia = await MediaItem.findOne({ jobId: media.jobId, ratio: targetRatio });
               if (alignedMedia) {
                  media = alignedMedia;
               } else {
                  const mainMedia = await MediaItem.findOne({ jobId: media.jobId, ratio: "16:9" });
                  if (mainMedia) media = mainMedia;
               }
            }
            mediaDetails.name = media.name;
            mediaDetails.path = media.url || media.fileUrl;
            mediaDetails.type = media.type;
          }
        }
        return {
          fileId: id,
          ...mediaDetails,
          displayOrder: index + 1,
          delay: 0
        };
      }));
    }

    // 4. Create new playlist with resolved device ID and resolved user ID
    const isAnnouncement = ["announcement", "Instant Announcement", "offer", "alert", "info"].includes(resolvedType);
    
    let playlist;
    if (isAnnouncement) {
      playlist = await AnnouncementPlaylist.create({
        name,
        type: resolvedType === "Instant Announcement" ? "announcement" : resolvedType,
        userId: autoResolvedUserId || null,
        announcements: resolvedFiles.map(f => ({
          file: f.path || f.url || f.fileUrl,
          displayOrder: f.displayOrder,
          delay: f.delay || 0,
          maxVolume: globalMaxVolume ?? 100
        })),
        schedule: {
          scheduleType: frequencyInMinutes ? 'hourly' : 'timed',
          frequency: frequencyInMinutes ? Number(frequencyInMinutes) : undefined,
          startDate: startDate || null,
          endDate: endDate || null,
          daysOfWeek: (() => {
            const dayMap: Record<string, string> = {
              'sun': 'sunday', 'sunday': 'sunday',
              'mon': 'monday', 'monday': 'monday',
              'tue': 'tuesday', 'tuesday': 'tuesday',
              'wed': 'wednesday', 'wednesday': 'wednesday',
              'thu': 'thursday', 'thursday': 'thursday',
              'fri': 'friday', 'friday': 'friday',
              'sat': 'saturday', 'saturday': 'saturday',
            };
            return (daysOfWeek || []).map((d: any) => dayMap[String(d).trim().toLowerCase()] || String(d).trim().toLowerCase());
          })(),
          startTime: startTime || null,
          endTime: endTime || null,
        },
        status: 'active'
      });
    } else {
      playlist = await PlaylistConfig.create({
        name,
        type: resolvedType,
        startTime: startTime || null,
        endTime: endTime || null,
        startDate: startDate || null,
        endDate: endDate || null,
        daysOfWeek: (() => {
          // Normalize all day variants to full lowercase names for consistent matching
          const dayMap: Record<string, string> = {
            'sun': 'sunday', 'sunday': 'sunday',
            'mon': 'monday', 'monday': 'monday',
            'tue': 'tuesday', 'tuesday': 'tuesday',
            'wed': 'wednesday', 'wednesday': 'wednesday',
            'thu': 'thursday', 'thursday': 'thursday',
            'fri': 'friday', 'friday': 'friday',
            'sat': 'saturday', 'saturday': 'saturday',
          };
          return (daysOfWeek || []).map((d: any) => dayMap[String(d).trim().toLowerCase()] || String(d).trim().toLowerCase());
        })(),
        globalMinVolume: globalMinVolume ?? 30,
        globalMaxVolume: globalMaxVolume ?? 80,
        frequencyInMinutes: frequencyInMinutes ? Number(frequencyInMinutes) : null,
        selectedDeviceId: finalSelectedDeviceId,
        deviceIds: finalDeviceIds,
        description: description || '',
        userId: autoResolvedUserId || null,
        files: resolvedFiles,
        backgroundAudio: {
          enabled: backgroundAudio?.enabled || false,
          file: backgroundAudio?.file || null,
          volume: backgroundAudio?.volume || 50
        }
      });
    }

    // 5. Connect playlist to device(s) in DevicePlaylist collection without overlap checking
    if (resolvedDevicesToConnect.length > 0 && autoResolvedUserId) {
      for (const dev of resolvedDevicesToConnect) {
        const devId = dev.id;
        const connectionOwnerId = dev.ownerId || autoResolvedUserId;
        const existingConnection = await DevicePlaylist.findOne({ deviceId: devId });
        
        // INTENTIONALLY SKIP CONFLICT CHECKING: Allow multiple overlapping concurrent playlists

        if (existingConnection) {
          const currentPlaylistIds = existingConnection.playlistIds || [];
          const alreadyConnected = currentPlaylistIds.some(
            (pid: any) => pid.toString() === playlist._id.toString()
          );
          const annIds = existingConnection.announcementPlaylistIds || [];
          const alreadyConnectedAnn = annIds.some(
            (pid: any) => pid.toString() === playlist._id.toString()
          );

          if (!alreadyConnected && !alreadyConnectedAnn) {
            if (isAnnouncement) {
               if (!existingConnection.announcementPlaylistIds) existingConnection.announcementPlaylistIds = [];
               existingConnection.announcementPlaylistIds.push(playlist._id);
            } else {
               existingConnection.playlistIds.push(playlist._id);
            }
            existingConnection.updatedAt = new Date();
            existingConnection.userId = connectionOwnerId;
            await existingConnection.save();
          }
        } else {
          await DevicePlaylist.create({
            deviceId: devId,
            playlistIds: isAnnouncement ? [] : [playlist._id],
            announcementPlaylistIds: isAnnouncement ? [playlist._id] : [],
            userId: connectionOwnerId,
            updatedAt: new Date()
          });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: playlist,
      message: 'Concurrent playlist created and connected successfully (overlapping schedules permitted)' 
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating concurrent playlist:', error);
    return NextResponse.json(
      { error: 'Failed to create playlist', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const {
      id,
      name,
      type,
      startTime,
      endTime,
      startDate,
      endDate,
      mediaIds,
      daysOfWeek,
      globalMinVolume,
      globalMaxVolume,
      selectedDeviceId,
      deviceIds,
      serialNumber,
      deviceSerialNumber,
      serialNumbers,
      description,
      backgroundAudio,
      userId,
      files,
      frequencyInMinutes
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
    }

    // Gather all incoming device inputs for update
    const rawDeviceInputs: string[] = [];
    if (serialNumber) rawDeviceInputs.push(String(serialNumber).trim());
    if (deviceSerialNumber && !rawDeviceInputs.includes(String(deviceSerialNumber).trim())) rawDeviceInputs.push(String(deviceSerialNumber).trim());
    if (selectedDeviceId && !rawDeviceInputs.includes(String(selectedDeviceId).trim())) rawDeviceInputs.push(String(selectedDeviceId).trim());
    if (Array.isArray(serialNumbers)) {
      serialNumbers.forEach((sn: any) => { if (sn && !rawDeviceInputs.includes(String(sn).trim())) rawDeviceInputs.push(String(sn).trim()); });
    }
    if (Array.isArray(deviceIds)) {
      deviceIds.forEach((id: any) => { if (id && !rawDeviceInputs.includes(String(id).trim())) rawDeviceInputs.push(String(id).trim()); });
    }

    const resolvedDevicesToConnect: string[] = [];
    let autoResolvedUserId = userId || null;

    for (const input of rawDeviceInputs) {
      const deviceBySerial = await Device.findOne({ serialNumber: input });
      if (deviceBySerial) {
        if (!resolvedDevicesToConnect.includes(deviceBySerial._id.toString())) {
          resolvedDevicesToConnect.push(deviceBySerial._id.toString());
        }
        if (!autoResolvedUserId) {
          const onboarded = await OnboardedDevice.findOne({ deviceId: deviceBySerial._id });
          if (onboarded && onboarded.userId) autoResolvedUserId = onboarded.userId;
        }
        continue;
      }
      if (mongoose.Types.ObjectId.isValid(input)) {
        const directDevice = await Device.findById(input);
        if (directDevice) {
          if (!resolvedDevicesToConnect.includes(directDevice._id.toString())) {
            resolvedDevicesToConnect.push(directDevice._id.toString());
          }
          continue;
        }
        if (!resolvedDevicesToConnect.includes(input)) {
          resolvedDevicesToConnect.push(input);
        }
      }
    }

    const updateFields: any = {
      name,
      type: type || 'media',
      startTime: startTime || null,
      endTime: endTime || null,
      startDate: startDate || null,
      endDate: endDate || null,
      daysOfWeek: daysOfWeek || [],
      globalMinVolume: globalMinVolume ?? 30,
      globalMaxVolume: globalMaxVolume ?? 80,
      frequencyInMinutes: frequencyInMinutes ? Number(frequencyInMinutes) : null,
    };

    if (autoResolvedUserId) updateFields.userId = autoResolvedUserId;
    if (resolvedDevicesToConnect.length > 0) {
      updateFields.selectedDeviceId = resolvedDevicesToConnect[0];
      updateFields.deviceIds = resolvedDevicesToConnect;
    } else if (selectedDeviceId !== undefined) {
      updateFields.selectedDeviceId = selectedDeviceId || null;
    }
    if (description !== undefined) updateFields.description = description;
    if (backgroundAudio !== undefined) {
      updateFields.backgroundAudio = {
        enabled: backgroundAudio?.enabled || false,
        file: backgroundAudio?.file || null,
        volume: backgroundAudio?.volume || 50
      };
    }

    // Determine target device ratio to align media automatically
    let targetRatio: string | null = null;
    if (resolvedDevicesToConnect.length > 0) {
      const dev = await Device.findById(resolvedDevicesToConnect[0]).populate('typeId');
      if (dev?.screenRatio) {
        targetRatio = dev.screenRatio;
      } else if (dev?.typeId?.screenSize) {
        const { width, height } = dev.typeId.screenSize;
        if (width && height) {
          const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
          const div = gcd(width, height);
          targetRatio = `${width / div}:${height / div}`;
          if (width > height && targetRatio !== "16:9") {
            if (Math.abs(width/height - 16/9) < 0.1) targetRatio = "16:9";
          } else if (height > width && targetRatio !== "9:16") {
            if (Math.abs(height/width - 16/9) < 0.1) targetRatio = "9:16";
            else if (Math.abs(height/width - 5/4) < 0.1) targetRatio = "4:5";
          }
        }
      }
    }

    if (Array.isArray(files) && files.length > 0) {
      updateFields.files = await Promise.all(files.map(async (file: any, index: number) => {
        let mediaDetails = { name: file.name, path: file.path, type: file.type };
        const fileIdToFind = file.mediaId || file.fileId || file._id || file.id;
        let media = null;
        if (fileIdToFind) {
          media = await MediaItem.findById(fileIdToFind);
        } else if (file.path) {
          media = await MediaItem.findOne({ url: file.path });
        }
        
        if (media) {
          if (targetRatio && media.jobId) {
             const alignedMedia = await MediaItem.findOne({ jobId: media.jobId, ratio: targetRatio });
             if (alignedMedia) {
                media = alignedMedia;
             } else {
                const mainMedia = await MediaItem.findOne({ jobId: media.jobId, ratio: "16:9" });
                if (mainMedia) media = mainMedia;
             }
          }
          mediaDetails.name = media.name;
          mediaDetails.path = media.url || media.fileUrl;
          mediaDetails.type = media.type;
        }
        let bgImage = file.backgroundImage || null;
        if (bgImage && mongoose.Types.ObjectId.isValid(bgImage)) {
          const bgMedia = await MediaItem.findById(bgImage);
          if (bgMedia) {
            bgImage = bgMedia.url || bgMedia.fileUrl;
          }
        }
        return {
          ...file,
          ...mediaDetails,
          backgroundImage: bgImage,
          displayOrder: index + 1,
          delay: file.delay || 0
        };
      }));
    } else if (Array.isArray(mediaIds) && mediaIds.length > 0) {
      updateFields.files = await Promise.all(mediaIds.map(async (mediaId: any, index: number) => {
        let mediaDetails = { name: undefined, path: undefined, type: undefined };
        if (mediaId) {
          let media = await MediaItem.findById(mediaId);
          if (media) {
            if (targetRatio && media.jobId) {
               const alignedMedia = await MediaItem.findOne({ jobId: media.jobId, ratio: targetRatio });
               if (alignedMedia) {
                  media = alignedMedia;
               } else {
                  const mainMedia = await MediaItem.findOne({ jobId: media.jobId, ratio: "16:9" });
                  if (mainMedia) media = mainMedia;
               }
            }
            mediaDetails.name = media.name;
            mediaDetails.path = media.url || media.fileUrl;
            mediaDetails.type = media.type;
          }
        }
        return {
          fileId: mediaId,
          ...mediaDetails,
          displayOrder: index + 1,
          delay: 0
        };
      }));
    }

    const playlist = await PlaylistConfig.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    );

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    const connectedConnections = await DevicePlaylist.find({ playlistIds: playlist._id });
    for (const conn of connectedConnections) {
      if (!resolvedDevicesToConnect.includes(conn.deviceId.toString())) {
        conn.playlistIds = conn.playlistIds.filter((pid: any) => pid.toString() !== playlist._id.toString());
        conn.updatedAt = new Date();
        await conn.save();
      }
    }

    if (resolvedDevicesToConnect.length > 0) {
      let resolvedUserId = autoResolvedUserId || playlist.userId;
      if (!resolvedUserId || !mongoose.Types.ObjectId.isValid(resolvedUserId)) {
        const onboarded = await OnboardedDevice.findOne({ deviceId: resolvedDevicesToConnect[0] });
        if (onboarded && onboarded.userId) resolvedUserId = onboarded.userId;
        else {
          const assigned = await AssignedDevice.findOne({ deviceId: resolvedDevicesToConnect[0] });
          if (assigned && assigned.userId) resolvedUserId = assigned.userId;
          else {
            const anyUser = await User.findOne();
            if (anyUser) resolvedUserId = anyUser._id;
          }
        }
      }

      if (resolvedUserId) {
        for (const devId of resolvedDevicesToConnect) {
          const existingConnection = await DevicePlaylist.findOne({ deviceId: devId });
          if (existingConnection) {
            const currentPlaylistIds = existingConnection.playlistIds || [];
            const alreadyConnected = currentPlaylistIds.some(
              (pid: any) => pid.toString() === playlist._id.toString()
            );
            if (!alreadyConnected) {
              existingConnection.playlistIds.push(playlist._id);
              existingConnection.updatedAt = new Date();
              existingConnection.userId = resolvedUserId;
              await existingConnection.save();
            }
          } else {
            await DevicePlaylist.create({
              deviceId: devId,
              playlistIds: [playlist._id],
              userId: resolvedUserId,
              updatedAt: new Date()
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true, data: playlist });
  } catch (error) {
    console.error('Error updating concurrent playlist:', error);
    return NextResponse.json(
      { error: 'Failed to update playlist', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const serialNumber = req.nextUrl.searchParams.get('serialNumber') || req.nextUrl.searchParams.get('deviceSerialNumber');
    const deviceId = req.nextUrl.searchParams.get('deviceId');
    const userId = req.nextUrl.searchParams.get('userId');

    // 1. Search by Device Serial Number or Device ID
    if (serialNumber || deviceId) {
      let dev: any = null;
      if (serialNumber) {
        dev = await Device.findOne({ serialNumber: String(serialNumber).trim() });
      }
      if (!dev && deviceId && mongoose.Types.ObjectId.isValid(deviceId)) {
        dev = await Device.findById(deviceId);
      }

      const resolvedDeviceId = dev ? dev._id : (deviceId && mongoose.Types.ObjectId.isValid(deviceId) ? new mongoose.Types.ObjectId(deviceId) : null);

      if (!resolvedDeviceId) {
        return NextResponse.json({
          success: false,
          error: 'Device not found for the provided serial number or ID',
          data: []
        }, { status: 404 });
      }

      // Fetch connection mapping in DevicePlaylist using Storesparc resolution engine
      const connection = await DevicePlaylist.findOne({ deviceId: resolvedDeviceId });
      const activePlaylistIds = connection?.playlistIds || [];
      const activeAnnIds = connection?.announcementPlaylistIds || [];

      const deviceIdStr = resolvedDeviceId.toString();
      let associatedIds: any[] = [resolvedDeviceId, deviceIdStr];
      let storeUserIds: any[] = [];
      try {
        const assignments = await AssignedDevice.find({ deviceId: resolvedDeviceId });
        assignments.forEach((a: any) => {
          associatedIds.push(a._id, a._id.toString());
          if (a.userId) storeUserIds.push(a.userId, a.userId.toString());
        });
        const onboardings = await OnboardedDevice.find({ deviceId: resolvedDeviceId });
        onboardings.forEach((o: any) => {
          associatedIds.push(o._id, o._id.toString());
          if (o.userId) storeUserIds.push(o.userId, o.userId.toString());
        });
      } catch (err) {
        console.error("Error finding associated assignments in concurrent GET:", err);
      }

      let storeConnectedPlaylistIds: any[] = [];
      try {
        if (storeUserIds.length > 0) {
          const storePlaylists = await DevicePlaylist.find({ deviceId: { $in: storeUserIds } }, 'playlistIds announcementPlaylistIds');
          storePlaylists.forEach((curr: any) => {
            if (curr.playlistIds) curr.playlistIds.forEach((pid: any) => { if (pid) storeConnectedPlaylistIds.push(pid); });
            if (curr.announcementPlaylistIds) curr.announcementPlaylistIds.forEach((pid: any) => { if (pid) activeAnnIds.push(pid); });
          });
        }
      } catch (err) {}

      const allConnectedIds = [...activePlaylistIds, ...storeConnectedPlaylistIds];

      const mediaPlaylists = await PlaylistConfig.find({
        $or: [
          { _id: { $in: allConnectedIds } },
          { selectedDeviceId: { $in: associatedIds } },
          { deviceIds: { $in: associatedIds } },
          { selectedDeviceId: { $in: storeUserIds } },
          { deviceIds: { $in: storeUserIds } }
        ]
      })
      .populate('userId', 'username')
      .populate('files.fileId')
      .lean();

      const announcementPlaylists = await AnnouncementPlaylist.find({
        _id: { $in: activeAnnIds }
      }).lean();

      const allDevicePlaylists = [...mediaPlaylists, ...announcementPlaylists]
        .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .map((p: any) => ({
          ...p,
          id: p._id.toString(),
          versionId: p.updatedAt ? new Date(p.updatedAt).getTime().toString() : p._id.toString()
        }));

      return NextResponse.json({
        success: true,
        serialNumber: dev?.serialNumber || serialNumber || null,
        deviceId: resolvedDeviceId.toString(),
        deviceStatus: dev?.status || 'unknown',
        totalCount: allDevicePlaylists.length,
        data: allDevicePlaylists
      }, { status: 200 });
    }

    // 2. Fallback: Search by User ID
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: 'Please provide either serialNumber, deviceId, or userId as a query parameter' },
        { status: 400 }
      );
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const ownPlaylists = await PlaylistConfig.find({ userId: userObjectId })
      .populate('userId', 'username')
      .populate('files.fileId')
      .lean();

    const onboarded = await OnboardedDevice.find({ userId: userObjectId }).select('deviceId');
    const assigned = await AssignedDevice.find({ userId: userObjectId }).select('deviceId');

    const devIds = [
      ...onboarded.map(d => d.deviceId),
      ...assigned.map(d => d.deviceId)
    ];

    let connectedOtherPlaylists: any[] = [];
    if (devIds.length > 0) {
      const connections = await DevicePlaylist.find({ deviceId: { $in: devIds } }).select('playlistIds');
      const activePlaylistIds = connections.reduce((acc: mongoose.Types.ObjectId[], curr) => {
        if (curr.playlistIds) acc.push(...curr.playlistIds);
        return acc;
      }, []);

      if (activePlaylistIds.length > 0) {
        connectedOtherPlaylists = await PlaylistConfig.find({
          _id: { $in: activePlaylistIds },
          userId: { $ne: userObjectId }
        })
        .populate('userId', 'username')
        .populate('files.fileId')
        .lean();
      }
    }

    const allPlaylists = [...ownPlaylists, ...connectedOtherPlaylists]
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .map((p: any) => ({
        ...p,
        id: p._id.toString(),
        versionId: p.updatedAt ? new Date(p.updatedAt).getTime().toString() : p._id.toString()
      }));

    return NextResponse.json({
      success: true,
      count: allPlaylists.length,
      data: allPlaylists
    });
  } catch (error) {
    console.error('Error fetching concurrent playlists:', error);
    return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    let id = req.nextUrl.searchParams.get('id');
    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch (e) {}
    }

    if (!id) {
      return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
    }

    await connectToDatabase();
    const playlist = await PlaylistConfig.findByIdAndDelete(id);
    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting concurrent playlist:', error);
    return NextResponse.json({ error: 'Failed to delete playlist' }, { status: 500 });
  }
}
