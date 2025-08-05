import mongoose, { Schema, Document } from 'mongoose';

export interface IInstantAnnouncement extends Document {
  userId: mongoose.Types.ObjectId;
  deviceId: mongoose.Types.ObjectId;
  file: mongoose.Types.ObjectId; // Ref to AnnouncementFile
  triggerTime: Date;
}

const instantAnnouncementSchema = new Schema<IInstantAnnouncement>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
  file: { type: mongoose.Schema.Types.ObjectId, ref: 'Announcement', required: true },
  triggerTime: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.InstantAnnouncement ||
  mongoose.model<IInstantAnnouncement>('InstantAnnouncement', instantAnnouncementSchema);
