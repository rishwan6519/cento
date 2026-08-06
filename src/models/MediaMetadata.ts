import mongoose, { Schema, Document } from 'mongoose';

export interface IMediaMetadata extends Document {
  mediaId?: mongoose.Schema.Types.ObjectId;
  userId?: mongoose.Schema.Types.ObjectId;
  channels?: string[];
  voiceoverScript?: string;
  socialMediaHeading?: string;
  socialMediaCaption?: string;
  hashTags?: string[];
  approvalStatus?: string;
  offerId?: string;
  templateId?: string;
  tagline?: string;
  createdAt: Date;
}

const MediaMetadataSchema = new Schema<IMediaMetadata>({
  mediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaItem', required: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  channels: { type: [String], default: undefined },
  voiceoverScript: { type: String, required: false },
  socialMediaHeading: { type: String, required: false },
  socialMediaCaption: { type: String, required: false },
  hashTags: { type: [String], default: undefined },
  approvalStatus: { type: String, required: false },
  offerId: { type: String, required: false },
  templateId: { type: String, required: false },
  tagline: { type: String, required: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.MediaMetadata || mongoose.model<IMediaMetadata>('MediaMetadata', MediaMetadataSchema);
