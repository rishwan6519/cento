// models/AnnouncementPlaylist.ts

import mongoose, { Schema, Document } from 'mongoose';

interface AnnouncementItem {
  file: mongoose.Types.ObjectId;
  displayOrder: number;
  delay: number;
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

export interface IAnnouncementPlaylist extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  announcements: AnnouncementItem[];
  schedule: Schedule;
  status: 'active' | 'inactive' | 'scheduled';
}

const announcementItemSchema = new Schema<AnnouncementItem>({
  file: { type: mongoose.Schema.Types.ObjectId, ref: 'Announcement', required: true },
  displayOrder: { type: Number, required: true },
  delay: { type: Number, required: true },
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
  announcements: [announcementItemSchema],
  schedule: scheduleSchema,
  status: { type: String, enum: ['active', 'inactive', 'scheduled'], default: 'active' }
}, { timestamps: true });

export default mongoose.models.AnnouncementPlaylist ||
  mongoose.model<IAnnouncementPlaylist>('AnnouncementPlaylist', playlistSchema);
