import mongoose, { Schema, Document } from 'mongoose';

export interface IMediaItem extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  name: string;
  type: string;
  url: string;
  createdAt: Date;
}

const MediaItemSchema = new Schema<IMediaItem>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  url: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.MediaItem || mongoose.model<IMediaItem>('MediaItem', MediaItemSchema);
