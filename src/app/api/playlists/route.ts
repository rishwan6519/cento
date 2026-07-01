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

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const {
      name,
      type,
      category,       // alias for type (from CreateInstantPlaylist)
      startTime,
      endTime,
      startDate,
      endDate,
      files,
      mediaIds,       // alias for files (array of IDs or filenames)
      backgroundAudio,
      userId,
      deviceIds,
      daysOfWeek,
      globalMinVolume,
      globalMaxVolume,
      selectedDeviceId,
      description,
      frequencyInMinutes,
    } = body;

    // Resolve type — accept either 'type' or 'category'
    const resolvedType = type || category || 'media';

    // Validate only name is required
    if (!name) {
      return NextResponse.json(
        { error: 'Playlist name is required' },
        { status: 400 }
      );
    }

    // Resolve files — accept either 'files' array or 'mediaIds' array
    let resolvedFiles: any[] = [];
    if (Array.isArray(files) && files.length > 0) {
      resolvedFiles = await Promise.all(files.map(async (file: any, index: number) => {
        let mediaDetails = { name: file.name, path: file.path, type: file.type };
        if (!file.path && (file.fileId || file._id || file.id)) {
          const media = await MediaItem.findById(file.fileId || file._id || file.id);
          if (media) {
            mediaDetails.name = media.name;
            mediaDetails.path = media.url || media.fileUrl;
            mediaDetails.type = media.type;
          }
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
          const media = await MediaItem.findById(id);
          if (media) {
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

    // Create new playlist
    const isAnnouncement = ["announcement", "Instant Announcement", "offer", "alert", "info"].includes(resolvedType);
    
    let playlist;
    if (isAnnouncement) {
      playlist = await AnnouncementPlaylist.create({
        name,
        type: resolvedType === "Instant Announcement" ? "announcement" : resolvedType,
        userId: userId || null,
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
          daysOfWeek: daysOfWeek || [],
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
        daysOfWeek: daysOfWeek || [],
        globalMinVolume: globalMinVolume ?? 30,
        globalMaxVolume: globalMaxVolume ?? 80,
        frequencyInMinutes: frequencyInMinutes ? Number(frequencyInMinutes) : null,
        selectedDeviceId: selectedDeviceId || null,
        deviceIds: deviceIds || [],
        description: description || '',
        userId: userId || null,
        files: resolvedFiles,
        backgroundAudio: {
          enabled: backgroundAudio?.enabled || false,
          file: backgroundAudio?.file || null,
          volume: backgroundAudio?.volume || 50
        }
      });
    }
    console.log('Playlist created successfully:', playlist);

    // Connect playlist to selected device(s) in DevicePlaylist collection
    const rawDevices: string[] = [];
    if (selectedDeviceId && mongoose.Types.ObjectId.isValid(selectedDeviceId)) {
      rawDevices.push(selectedDeviceId);
    }
    if (Array.isArray(deviceIds)) {
      deviceIds.forEach((id: any) => {
        if (id && mongoose.Types.ObjectId.isValid(id) && !rawDevices.includes(id.toString())) {
          rawDevices.push(id.toString());
        }
      });
    }

    const devicesToConnect: { id: string, ownerId?: string }[] = [];
    for (const devId of rawDevices) {
      const directDevice = await Device.findById(devId);
      if (directDevice) {
        if (!devicesToConnect.some(d => d.id === devId)) {
          devicesToConnect.push({ id: devId });
        }
        continue;
      }
      const assignment = await AssignedDevice.findById(devId);
      if (assignment && assignment.deviceId) {
        const actualId = assignment.deviceId.toString();
        if (!devicesToConnect.some(d => d.id === actualId)) {
          devicesToConnect.push({ id: actualId });
        }
        continue;
      }
      const onboarding = await OnboardedDevice.findById(devId);
      if (onboarding && onboarding.deviceId) {
        const actualId = onboarding.deviceId.toString();
        if (!devicesToConnect.some(d => d.id === actualId)) {
          devicesToConnect.push({ id: actualId });
        }
        continue;
      }
      
      const storeUser = await User.findById(devId);
      if (storeUser && storeUser.role === 'store') {
         const storeAssignments = await AssignedDevice.find({ userId: devId });
         for (const sa of storeAssignments) {
            if (sa.deviceId) {
               const actualId = sa.deviceId.toString();
               if (!devicesToConnect.some(d => d.id === actualId)) {
                  devicesToConnect.push({ id: actualId, ownerId: devId });
               }
            }
         }
         continue;
      }

      if (!devicesToConnect.some(d => d.id === devId)) {
        devicesToConnect.push({ id: devId });
      }
    }

    console.log('[Playlists API] rawDevices:', rawDevices);
    console.log('[Playlists API] devicesToConnect:', devicesToConnect);

    if (devicesToConnect.length > 0) {
      let resolvedUserId = userId;
      if (!resolvedUserId || !mongoose.Types.ObjectId.isValid(resolvedUserId)) {
        const onboarded = await OnboardedDevice.findOne({ deviceId: devicesToConnect[0].id });
        if (onboarded && onboarded.userId) {
          resolvedUserId = onboarded.userId;
        } else {
          const assigned = await AssignedDevice.findOne({ deviceId: devicesToConnect[0].id });
          if (assigned && assigned.userId) {
            resolvedUserId = assigned.userId;
          } else {
            const User = mongoose.models.User;
            if (User) {
              const anyUser = await User.findOne();
              if (anyUser) {
                resolvedUserId = anyUser._id;
              }
            }
          }
        }
      }

      if (resolvedUserId) {
        const conflictWarnings: string[] = [];
        let connectedCount = 0;

        for (const dev of devicesToConnect) {
          const devId = dev.id;
          const connectionOwnerId = dev.ownerId || resolvedUserId;
          const existingConnection = await DevicePlaylist.findOne({ deviceId: devId });
          
          if (existingConnection && !isAnnouncement) {
            // Check for conflicts with existing media playlists (only for media playlists, not announcements)
            const existingPlaylists = await PlaylistConfig.find({
              _id: { $in: existingConnection.playlistIds }
            });

            let hasConflict = false;
            for (const ep of existingPlaylists) {
              if (ep._id.toString() === playlist._id.toString()) continue;

              // Get schedule fields from the new playlist
              const ns = playlist.startDate;
              const ne = playlist.endDate;
              const nd = playlist.daysOfWeek || [];
              const nts = playlist.startTime;
              const nte = playlist.endTime;

              const es = ep.startDate;
              const ee = ep.endDate;
              const datesOverlap = (!ns || !ee || ns <= ee) && (!es || !ne || es <= ne);

              const ed = ep.daysOfWeek || [];
              const daysOverlap = nd.length === 0 || ed.length === 0 || nd.some((d: string) => ed.includes(d));

              const ets = ep.startTime;
              const ete = ep.endTime;
              const timesOverlap = (!nts || !ete || nts < ete) && (!ets || !nte || ets < nte);

              if (datesOverlap && daysOverlap && timesOverlap) {
                // Find device name for better message
                const deviceDoc = await Device.findById(devId);
                const deviceName = deviceDoc?.name || deviceDoc?.serialNumber || devId;
                conflictWarnings.push(`Device "${deviceName}" already has overlapping playlist "${ep.name}". Disconnect it first.`);
                hasConflict = true;
                break;
              }
            }

            if (hasConflict) continue; // Skip this device, connect the rest
          }

          // No conflict — proceed to connect
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
              connectedCount++;
            }
          } else {
            await DevicePlaylist.create({
              deviceId: devId,
              playlistIds: isAnnouncement ? [] : [playlist._id],
              announcementPlaylistIds: isAnnouncement ? [playlist._id] : [],
              userId: connectionOwnerId,
              updatedAt: new Date()
            });
            connectedCount++;
          }
        }

        // If ALL devices had conflicts (none connected)
        if (connectedCount === 0 && conflictWarnings.length > 0) {
          return NextResponse.json({
            success: false,
            message: `Conflict alert: ${conflictWarnings.join(' | ')}`
          }, { status: 409 });
        }

        // Some connected, some had conflicts
        if (conflictWarnings.length > 0) {
          return NextResponse.json({
            success: true,
            data: playlist,
            warning: `Connected to ${connectedCount} device(s), but some devices had conflicts: ${conflictWarnings.join(' | ')}`
          }, { status: 201 });
        }
      }
    }

    return NextResponse.json({ success: true, data: playlist }, { status: 201 });

  } catch (error) {
    console.error('Error creating playlist:', error);
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
      description,
      backgroundAudio,
      userId,
      files,
      frequencyInMinutes
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
    }

    // Only update files if mediaIds were explicitly provided
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
      selectedDeviceId: selectedDeviceId || null,
    };

    if (deviceIds !== undefined) {
      updateFields.deviceIds = deviceIds;
    }
    if (description !== undefined) {
      updateFields.description = description;
    }
    if (backgroundAudio !== undefined) {
      updateFields.backgroundAudio = {
        enabled: backgroundAudio?.enabled || false,
        file: backgroundAudio?.file || null,
        volume: backgroundAudio?.volume || 50
      };
    }

    if (Array.isArray(files) && files.length > 0) {
      updateFields.files = await Promise.all(files.map(async (file: any, index: number) => {
        let mediaDetails = { name: file.name, path: file.path, type: file.type };
        if (!file.path && (file.fileId || file._id || file.id)) {
          const media = await MediaItem.findById(file.fileId || file._id || file.id);
          if (media) {
            mediaDetails.name = media.name;
            mediaDetails.path = media.url || media.fileUrl;
            mediaDetails.type = media.type;
          }
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
          const media = await MediaItem.findById(mediaId);
          if (media) {
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

    // Sync DevicePlaylist connections
    const rawDevices: string[] = [];
    if (selectedDeviceId && mongoose.Types.ObjectId.isValid(selectedDeviceId)) {
      rawDevices.push(selectedDeviceId);
    }
    if (Array.isArray(deviceIds)) {
      deviceIds.forEach((id: any) => {
        if (id && mongoose.Types.ObjectId.isValid(id) && !rawDevices.includes(id.toString())) {
          rawDevices.push(id.toString());
        }
      });
    }

    const devicesToConnect: string[] = [];
    for (const devId of rawDevices) {
      const directDevice = await Device.findById(devId);
      if (directDevice) {
        if (!devicesToConnect.includes(devId)) {
          devicesToConnect.push(devId);
        }
        continue;
      }
      const assignment = await AssignedDevice.findById(devId);
      if (assignment && assignment.deviceId) {
        const actualId = assignment.deviceId.toString();
        if (!devicesToConnect.includes(actualId)) {
          devicesToConnect.push(actualId);
        }
        continue;
      }
      const onboarding = await OnboardedDevice.findById(devId);
      if (onboarding && onboarding.deviceId) {
        const actualId = onboarding.deviceId.toString();
        if (!devicesToConnect.includes(actualId)) {
          devicesToConnect.push(actualId);
        }
        continue;
      }
      if (!devicesToConnect.includes(devId)) {
        devicesToConnect.push(devId);
      }
    }

    // Disconnect from devices that are no longer in devicesToConnect
    const connectedConnections = await DevicePlaylist.find({ playlistIds: playlist._id });
    for (const conn of connectedConnections) {
      if (!devicesToConnect.includes(conn.deviceId.toString())) {
        conn.playlistIds = conn.playlistIds.filter((pid: any) => pid.toString() !== playlist._id.toString());
        conn.updatedAt = new Date();
        await conn.save();
      }
    }

    // Connect to new/existing devices in devicesToConnect
    if (devicesToConnect.length > 0) {
      let resolvedUserId = userId || playlist.userId;
      if (!resolvedUserId || !mongoose.Types.ObjectId.isValid(resolvedUserId)) {
        const onboarded = await OnboardedDevice.findOne({ deviceId: devicesToConnect[0] });
        if (onboarded && onboarded.userId) {
          resolvedUserId = onboarded.userId;
        } else {
          const assigned = await AssignedDevice.findOne({ deviceId: devicesToConnect[0] });
          if (assigned && assigned.userId) {
            resolvedUserId = assigned.userId;
          } else {
            const User = mongoose.models.User;
            if (User) {
              const anyUser = await User.findOne();
              if (anyUser) {
                resolvedUserId = anyUser._id;
              }
            }
          }
        }
      }

      if (resolvedUserId) {
        for (const devId of devicesToConnect) {
          const existingConnection = await DevicePlaylist.findOne({ deviceId: devId });
          if (existingConnection) {
            // Check for conflicts with existing media playlists
            const existingPlaylists = await PlaylistConfig.find({
              _id: { $in: existingConnection.playlistIds }
            });

            for (const ep of existingPlaylists) {
              if (ep._id.toString() === playlist._id.toString()) continue;

              const ns = playlist.startDate;
              const ne = playlist.endDate;
              const es = ep.startDate;
              const ee = ep.endDate;
              const datesOverlap = (!ns || !ee || ns <= ee) && (!es || !ne || es <= ne);

              const nd = playlist.daysOfWeek || [];
              const ed = ep.daysOfWeek || [];
              const daysOverlap = nd.length === 0 || ed.length === 0 || nd.some((d: string) => ed.includes(d));

              const nts = playlist.startTime;
              const nte = playlist.endTime;
              const ets = ep.startTime;
              const ete = ep.endTime;
              const timesOverlap = (!nts || !ete || nts < ete) && (!ets || !nte || ets < nte);

              if (datesOverlap && daysOverlap && timesOverlap) {
                return NextResponse.json({
                  error: `Conflict alert: Device is already connected to an overlapping media playlist (${ep.name}). Disconnect the existing playlist and try again.`
                }, { status: 409 });
              }
            }

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
    console.error('Error updating playlist:', error);
    return NextResponse.json(
      { error: 'Failed to update playlist', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}


export async function GET(req: NextRequest) {
  try {

    const userId = req.nextUrl.searchParams.get('userId');

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: 'Invalid or missing userId' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Look up the user to find their controllerId (super user)
    const User = mongoose.models.User;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    let myPlaylistsQuery: any = { userId: userObjectId };
    // (Removed controllerId logic as it is no longer needed)

    // Fetch user's own playlists
    const ownPlaylists = await PlaylistConfig.find(myPlaylistsQuery)
      .populate('userId', 'username')
      .populate('files.fileId');

    // Look up the user's devices
    const onboarded = await OnboardedDevice.find({ userId: userObjectId }).select('deviceId');
    const assigned = await AssignedDevice.find({ userId: userObjectId }).select('deviceId');

    const deviceIds = [
      ...onboarded.map(d => d.deviceId),
      ...assigned.map(d => d.deviceId)
    ];

    let connectedOtherPlaylists: any[] = [];
    if (deviceIds.length > 0) {
      // Find all active connections for these devices
      const connections = await DevicePlaylist.find({ deviceId: { $in: deviceIds } }).select('playlistIds');
      const activePlaylistIds = connections.reduce((acc: mongoose.Types.ObjectId[], curr) => {
        if (curr.playlistIds) acc.push(...curr.playlistIds);
        return acc;
      }, []);

      if (activePlaylistIds.length > 0) {
        // Find playlists connected to our devices but not owned by us
        connectedOtherPlaylists = await PlaylistConfig.find({
          _id: { $in: activePlaylistIds },
          userId: { $ne: userObjectId }
        })
        .populate('userId', 'username')
        .populate('files.fileId');
      }
    }

    // Combine both sets
    const allPlaylists = [...ownPlaylists, ...connectedOtherPlaylists]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Fetch active device IDs
    const onboardedDevices = await OnboardedDevice.find().select('deviceId');
    const assignedDevices = await AssignedDevice.find({ status: 'active' }).select('deviceId');
    const activeDeviceIds = new Set([
      ...onboardedDevices.map(d => d.deviceId?.toString()).filter(Boolean),
      ...assignedDevices.map(d => d.deviceId?.toString()).filter(Boolean)
    ]);

    // Check assignments
    const allConnections = await DevicePlaylist.find().select('playlistIds deviceId');
    const activeConnections = allConnections.filter(c => c.deviceId && activeDeviceIds.has(c.deviceId.toString()));
    const assignedIds = new Set(activeConnections.flatMap(c => c.playlistIds.map((id: any) => id.toString())));
    
    const mappedPlaylists = allPlaylists.map(p => ({
      ...p.toObject(),
      isAssigned: assignedIds.has(p._id.toString())
    }));

    return NextResponse.json(mappedPlaylists);
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch playlists' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    let id = req.nextUrl.searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch (e) {
        // Body might be empty or not JSON
      }
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Playlist ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const playlist = await PlaylistConfig.findByIdAndDelete(id);
    if (!playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json(
      { error: 'Failed to delete playlist' },
      { status: 500 }
    );
  }
}



