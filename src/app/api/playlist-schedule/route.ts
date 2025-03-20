import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const SCHEDULE_FILE = path.join(DATA_DIR, 'playlist-schedules.json');

interface PlaylistSchedule {
  id: string;
  deviceTypeId: string;
  playlists: {
    playlistId: string;
    duration: number;
  }[];
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  activeDays: string[];
  exemptDays: string[];
  createdAt: string;
}

// Create directory if it doesn't exist
async function ensureDirectory() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Read schedules file
async function readSchedules() {
  try {
    const data = await fs.readFile(SCHEDULE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Save schedules to file
async function saveSchedules(schedules: any[]) {
  await ensureDirectory();
  await fs.writeFile(SCHEDULE_FILE, JSON.stringify(schedules, null, 2));
}

export async function POST(request: Request) {
  try {
    const schedule = await request.json();
    
    // Add id and timestamp
    const newSchedule: PlaylistSchedule = {
      ...schedule,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };

    // Read existing schedules
    const schedules = await readSchedules();
    
    // Add new schedule
    schedules.push(newSchedule);

    // Save updated schedules
    await saveSchedules(schedules);

    return NextResponse.json({ success: true, schedule: newSchedule });
  } catch (error) {
    console.error('Error saving schedule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save schedule' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceTypeId = searchParams.get('deviceTypeId');

    await ensureDirectory();
    const schedules = await readSchedules();

    // If deviceTypeId is provided, filter schedules
    const filteredSchedules = deviceTypeId 
      ? schedules.filter((schedule: PlaylistSchedule) => schedule.deviceTypeId === deviceTypeId)
      : schedules;

    return NextResponse.json({ 
      success: true, 
      schedules: filteredSchedules 
    });
  } catch (error) {
    console.error('Error reading schedules:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read schedules' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Schedule ID is required' },
        { status: 400 }
      );
    }

    const schedules = await readSchedules();
    const filteredSchedules = schedules.filter((schedule: any) => schedule.id !== id);
    await saveSchedules(filteredSchedules);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete schedule' },
      { status: 500 }
    );
  }
}