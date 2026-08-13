import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { advancedPlaylistScheduleService, ServiceError } from '@/services/advancedPlaylistSchedule.service';
import PlaylistConfig from '@/models/PlaylistConfig';

/**
 * Handle POST /api/advanced-playlist-schedule (Create a new schedule)
 */
export async function createAdvancedScheduleHandler(req: NextRequest): Promise<NextResponse> {
  try {
    await connectToDatabase();
    const body = await req.json();
    const createdSchedule = await advancedPlaylistScheduleService.createSchedule(body);

    return NextResponse.json(
      { success: true, message: 'Advanced playlist schedule created successfully', data: createdSchedule },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating advanced playlist schedule:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { success: false, error: error.message, details: error.errors },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error while creating schedule' },
      { status: 500 }
    );
  }
}

/**
 * Handle GET /api/advanced-playlist-schedule (List schedules with optional filters)
 */
export async function getAdvancedSchedulesHandler(req: NextRequest): Promise<NextResponse> {
  try {
    await connectToDatabase();
    const searchParams = req.nextUrl.searchParams;
    const filters = {
      playlistId: searchParams.get('playlistId') || undefined,
      deviceId: searchParams.get('deviceId') || undefined,
      userId: searchParams.get('userId') || undefined,
      isActive: searchParams.get('isActive') || undefined,
    };

    const schedules = await advancedPlaylistScheduleService.listSchedules(filters);

    return NextResponse.json({ success: true, count: schedules.length, data: schedules }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching advanced playlist schedules:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error while fetching schedules' },
      { status: 500 }
    );
  }
}

/**
 * Handle GET /api/advanced-playlist-schedule/:id (Get single schedule)
 */
export async function getAdvancedScheduleByIdHandler(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await connectToDatabase();
    const resolvedParams = await Promise.resolve(context.params);
    const id = resolvedParams.id;

    const schedule = await advancedPlaylistScheduleService.getScheduleById(id);

    return NextResponse.json({ success: true, data: schedule }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching advanced playlist schedule by ID:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error while fetching schedule' },
      { status: 500 }
    );
  }
}

/**
 * Handle PUT /api/advanced-playlist-schedule/:id (Update single schedule)
 */
export async function updateAdvancedScheduleHandler(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await connectToDatabase();
    const resolvedParams = await Promise.resolve(context.params);
    const id = resolvedParams.id;
    const body = await req.json();

    const updatedSchedule = await advancedPlaylistScheduleService.updateSchedule(id, body);

    return NextResponse.json(
      { success: true, message: 'Advanced playlist schedule updated successfully', data: updatedSchedule },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating advanced playlist schedule:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { success: false, error: error.message, details: error.errors },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error while updating schedule' },
      { status: 500 }
    );
  }
}

/**
 * Handle DELETE /api/advanced-playlist-schedule/:id (Delete single schedule)
 */
export async function deleteAdvancedScheduleHandler(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await connectToDatabase();
    const resolvedParams = await Promise.resolve(context.params);
    const id = resolvedParams.id;

    await advancedPlaylistScheduleService.deleteSchedule(id);

    return NextResponse.json(
      { success: true, message: 'Advanced playlist schedule deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting advanced playlist schedule:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error while deleting schedule' },
      { status: 500 }
    );
  }
}

/**
 * Handle POST /api/advanced-playlist-schedule/create-with-playlist (All-in-One: Create playlist & schedule simultaneously)
 */
export async function createScheduleWithPlaylistHandler(req: NextRequest): Promise<NextResponse> {
  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      playlistName,
      files = [],
      shuffle = false,
      type = 'media',
      deviceIds,
      userId,
      startDate,
      endDate,
      startTime,
      endTime,
      priority,
      isActive = true,
    } = body;

    if (!playlistName || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'playlistName and a non-empty files array are required to create a playlist' },
        { status: 400 }
      );
    }

    // 1. Create the new playlist in PlaylistConfig
    const newPlaylist = await PlaylistConfig.create({
      name: playlistName,
      type: type,
      contentType: 'playlist',
      status: 'active',
      shuffle: shuffle,
      files: files.map((f: any, index: number) => ({
        ...f,
        displayOrder: f.displayOrder || index + 1,
      })),
    });

    // 2. Create the advanced schedule referencing the newly created playlist
    const scheduleInput = {
      playlistId: newPlaylist._id.toString(),
      deviceIds,
      userId,
      startDate,
      endDate,
      startTime,
      endTime,
      priority,
      isActive,
    };

    const createdSchedule = await advancedPlaylistScheduleService.createSchedule(scheduleInput);

    return NextResponse.json(
      {
        success: true,
        message: 'Playlist created and scheduled successfully in a single step',
        data: {
          playlist: newPlaylist,
          schedule: createdSchedule,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating schedule with playlist:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { success: false, error: error.message, details: error.errors },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error during single-step creation and scheduling' },
      { status: 500 }
    );
  }
}

/**
 * Handle GET /api/advanced-playlist-schedule/daily-timeline?serialNumber=X&date=YYYY-MM-DD
 * Returns a full day schedule time slots with combined media items when schedules overlap.
 */
export async function getDailyTimelineHandler(req: NextRequest): Promise<NextResponse> {
  try {
    await connectToDatabase();
    const searchParams = req.nextUrl.searchParams;
    const serialNumber = searchParams.get('serialNumber');
    const date = searchParams.get('date') || undefined;

    if (!serialNumber) {
      return NextResponse.json(
        { success: false, error: 'Serial number is required as a query parameter (serialNumber)' },
        { status: 400 }
      );
    }

    const result = await advancedPlaylistScheduleService.getDailyTimelineForDevice(serialNumber, date);

    return NextResponse.json(
      {
        success: true,
        serverDate: result.serverDate,
        serverTime: result.serverTime,
        versionId: result.versionId,
        count: result.timeline.length,
        data: result.timeline,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching daily timeline for device:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error while fetching daily timeline' },
      { status: 500 }
    );
  }
}
