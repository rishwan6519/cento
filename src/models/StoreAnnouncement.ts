import mongoose, { Schema, Document } from 'mongoose';

export interface IStoreAnnouncement extends Document {
  storeId: string;
  message: string;
  status: 'scheduled' | 'sent' | 'cancelled';
  author: string;
  scheduledFor?: Date;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StoreAnnouncementSchema: Schema = new Schema(
  {
    storeId: { type: String, required: true, index: true },
    message: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ['scheduled', 'sent', 'cancelled'],
      default: 'sent',
      index: true,
    },
    author: { type: String, required: true },
    scheduledFor: { type: Date },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

const StoreAnnouncement =
  mongoose.models.StoreAnnouncement ||
  mongoose.model<IStoreAnnouncement>('StoreAnnouncement', StoreAnnouncementSchema);

export default StoreAnnouncement;

