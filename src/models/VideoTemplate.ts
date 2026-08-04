import mongoose, { Schema, Document } from 'mongoose';

export type PositionOption = 'left' | 'right' | 'top' | 'bottom' | 'center';
export type TemplateStatus = 'Active' | 'Inactive';

export interface VideoTemplateDocument extends Document {
  storeUserId: mongoose.Types.ObjectId;
  templateName: string;
  templateDescription: string;
  logoPosition: PositionOption;
  storeImagePosition: PositionOption;
  productImagePosition: PositionOption;
  offerTitle: string;
  offerDescription: string;
  ctaButtonText: string;
  offerLabel: string;
  priceLabel: string;
  discountLabel: string;
  footerText: string;
  website: string;
  phoneNumber: string;
  address: string;
  backgroundColor: string;
  primaryTextColor: string;
  secondaryTextColor: string;
  buttonColor: string;
  animationStyle: string;
  videoDuration: number;
  aspectRatio: string;
  language: string;
  aiModel?: string;
  status: TemplateStatus;
  createdAt: Date;
  updatedAt: Date;
}

const positionOptions: PositionOption[] = ['left', 'right', 'top', 'bottom', 'center'];

const VideoTemplateSchema: Schema = new Schema(
  {
    storeUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Store user ID is required'],
      index: true,
    },
    templateName: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
    },
    templateDescription: {
      type: String,
      default: '',
      trim: true,
    },
    logoPosition: {
      type: String,
      enum: positionOptions,
      default: 'left',
    },
    storeImagePosition: {
      type: String,
      enum: positionOptions,
      default: 'right',
    },
    productImagePosition: {
      type: String,
      enum: positionOptions,
      default: 'center',
    },
    offerTitle: {
      type: String,
      default: '',
      trim: true,
    },
    offerDescription: {
      type: String,
      default: '',
      trim: true,
    },
    ctaButtonText: {
      type: String,
      default: 'Shop Now',
      trim: true,
    },
    offerLabel: {
      type: String,
      default: '',
      trim: true,
    },
    priceLabel: {
      type: String,
      default: '',
      trim: true,
    },
    discountLabel: {
      type: String,
      default: '',
      trim: true,
    },
    footerText: {
      type: String,
      default: '',
      trim: true,
    },
    website: {
      type: String,
      default: '',
      trim: true,
    },
    phoneNumber: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    backgroundColor: {
      type: String,
      default: '#FFFFFF',
      trim: true,
    },
    primaryTextColor: {
      type: String,
      default: '#000000',
      trim: true,
    },
    secondaryTextColor: {
      type: String,
      default: '#666666',
      trim: true,
    },
    buttonColor: {
      type: String,
      default: '#FF0000',
      trim: true,
    },
    animationStyle: {
      type: String,
      default: 'Fade',
      trim: true,
    },
    videoDuration: {
      type: Number,
      default: 15,
    },
    aspectRatio: {
      type: String,
      default: '9:16',
      trim: true,
    },
    language: {
      type: String,
      default: 'English',
      trim: true,
    },
    aiModel: {
      type: String,
      default: 'Google Flow Veo 3.1 Lite',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
  },
  {
    timestamps: true,
    collection: 'video_templates',
  }
);

// Index for performance and ordering
VideoTemplateSchema.index({ storeUserId: 1, createdAt: -1 });

const VideoTemplate =
  mongoose.models.VideoTemplate ||
  mongoose.model<VideoTemplateDocument>('VideoTemplate', VideoTemplateSchema);

export default VideoTemplate;
