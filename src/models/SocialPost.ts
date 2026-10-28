import mongoose, { Schema, Document } from 'mongoose';

export type SocialChannel = 'facebook' | 'instagram' | 'whatsapp' | 'email' | 'youtube' | 'tiktok';
export type SocialPostStatus = 'draft' | 'scheduled' | 'published' | 'failed' | 'cancelled';
export type SocialMediaType = 'none' | 'image' | 'video';
export type SocialPublishMode = 'now' | 'schedule';

export interface SocialPostDocument extends Document {
  storeUserId: mongoose.Types.ObjectId;
  channel: SocialChannel;
  message: string;
  mediaType: SocialMediaType;
  mediaUrl?: string;
  thumbnailUrl?: string;
  templateId?: string;
  publishMode: SocialPublishMode;
  scheduledAt?: Date;
  timezone: string;
  status: SocialPostStatus;
  externalPostId?: string;
  errorMessage?: string;
  targetAccountId?: string;
  targetAccountName?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SocialPostSchema: Schema = new Schema(
  {
    storeUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ['facebook', 'instagram', 'whatsapp', 'email', 'youtube', 'tiktok'],
      default: 'facebook',
      index: true,
    },
    message: {
      type: String,
      required: [true, 'Post message is required'],
      trim: true,
    },
    mediaType: {
      type: String,
      enum: ['none', 'image', 'video'],
      default: 'video',
    },
    mediaUrl: {
      type: String,
      trim: true,
      default: '',
    },
    thumbnailUrl: {
      type: String,
      trim: true,
      default: '',
    },
    templateId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    publishMode: {
      type: String,
      enum: ['now', 'schedule'],
      default: 'schedule',
    },
    scheduledAt: {
      type: Date,
      index: true,
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published', 'failed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    externalPostId: {
      type: String,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    targetAccountId: {
      type: String,
      default: '',
    },
    targetAccountName: {
      type: String,
      default: '',
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.SocialPost) {
  delete (mongoose.models as any).SocialPost;
}
export default mongoose.model<SocialPostDocument>('SocialPost', SocialPostSchema);
