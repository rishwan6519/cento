import { IAnnouncementPlaylist } from '@/models/AnnouncementPlaylist';

export interface Schedule {
  startDate?: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  daysOfWeek?: string[];
}

export function isTimeOverlapping(s1: Schedule, s2: Schedule): boolean {
  // 1. Date Overlap
  if (s1.startDate && s2.endDate && s1.startDate > s2.endDate) return false;
  if (s1.endDate && s2.startDate && s1.endDate < s2.startDate) return false;

  // 2. Days of Week Overlap
  if (s1.daysOfWeek?.length && s2.daysOfWeek?.length) {
    const hasCommonDay = s1.daysOfWeek.some(day => s2.daysOfWeek!.includes(day));
    if (!hasCommonDay) return false;
  }

  // 3. Time Overlap (HH:mm format)
  const start1 = s1.startTime;
  const end1 = s1.endTime;
  const start2 = s2.startTime;
  const end2 = s2.endTime;

  if (start1 >= end2 || end1 <= start2) return false;

  return true;
}

export function getConflictMessage(playlistName: string, type: 'regular' | 'announcement'): string {
  return `Conflict Detected: This device is already scheduled for ${type === 'announcement' ? 'announcement' : 'playlist'} "${playlistName}" during the same time period.`;
}
