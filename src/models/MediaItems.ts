import mongoose, { Schema, Document } from 'mongoose';

export interface IMediaItem extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  name: string;
  type: string;
  url: string;
  channels?: string[];
  voiceoverScript?: string;
  socialMediaHeading?: string;
  socialMediaCaption?: string;
  hashTags?: string[];
  approvalStatus?: string;
  offerId?: string;
  createdAt: Date;
}

const MediaItemSchema = new Schema<IMediaItem>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  url: { type: String, required: true },
  channels: { type: [String], default: [] },
  voiceoverScript: { type: String, required: false },
  socialMediaHeading: { type: String, required: false },
  socialMediaCaption: { type: String, required: false },
  hashTags: { type: [String], default: undefined },
  approvalStatus: { type: String, required: false },
  offerId: { type: String, required: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.MediaItem || mongoose.model<IMediaItem>('MediaItem', MediaItemSchema);
