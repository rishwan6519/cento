import mongoose, { Schema, Document } from 'mongoose';

export interface IMediaItem extends Document {
  name: string;
  type: string;
  url: string;
  createdAt: Date;
}

const MediaItemSchema = new Schema<IMediaItem>({
  name: { type: String, required: true },
  type: { type: String, required: true },
  url: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.MediaItem || mongoose.model<IMediaItem>('MediaItem', MediaItemSchema);
