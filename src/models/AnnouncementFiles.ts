import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnouncement extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  path: string;
  type: 'recorded' | 'uploaded';
  voice?: string | null;
  createdAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  path: { type: String, required: true },
  type: { type: String, enum: ['recorded', 'uploaded'], required: true },
  voice: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Announcement || mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);
