// models/AnnouncementPlaylist.ts

import mongoose, { Schema, Document } from 'mongoose';

// 1. UPDATE THE TYPESCRIPT INTERFACE
interface AnnouncementItem {
  file: mongoose.Types.ObjectId;
  displayOrder: number;
  delay: number;
  maxVolume: number; // <-- ADD THIS LINE
}

interface Schedule {
  scheduleType: 'hourly' | 'timed';
  time?: string;
  frequency?: number;
  startDate?: string;
  endDate?: string;
  daysOfWeek?: string[];
  startTime?: string;
  endTime?: string;
}

// 2. UPDATE THE MAIN EXPORTED INTERFACE TO MATCH
export interface IAnnouncementPlaylist extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  announcements: AnnouncementItem[]; // This now implicitly includes maxVolume
  schedule: Schedule;
  status: 'active' | 'inactive' | 'scheduled';
}

// 3. UPDATE THE MONGOOSE SCHEMA DEFINITION
const announcementItemSchema = new Schema<AnnouncementItem>({
  file: { type: mongoose.Schema.Types.ObjectId, ref: 'Announcement', required: true },
  displayOrder: { type: Number, required: true },
  delay: { type: Number, required: true },
  maxVolume: { // <-- ADD THIS ENTIRE BLOCK
    type: Number,
    required: true,
    default: 100,
    min: 0,
    max: 100,
  },
});

const scheduleSchema = new Schema<Schedule>({
  scheduleType: { type: String, enum: [ 'hourly', 'timed'], required: true },
  time: String,
  frequency: Number,
  startDate: String,
  endDate: String,
  daysOfWeek: [String],
  startTime: String,
  endTime: String,
}, { _id: false });

const playlistSchema = new Schema<IAnnouncementPlaylist>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  announcements: [announcementItemSchema], // This array now uses the updated schema
  schedule: scheduleSchema,
  status: { type: String, enum: ['active', 'inactive', 'scheduled'], default: 'active' }
}, { timestamps: true });

export default mongoose.models.AnnouncementPlaylist ||
  mongoose.model<IAnnouncementPlaylist>('AnnouncementPlaylist', playlistSchema);