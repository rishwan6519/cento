import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IVideoCategory extends Document {
  userId: mongoose.Types.ObjectId | string;
  videoCategoryId: string;
  typeId: string;
  typename: string[];
  createdAt: Date;
  updatedAt: Date;
}

const videoCategorySchema = new Schema<IVideoCategory>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  videoCategoryId: {
    type: String,
    required: false,
  },
  typeId: {
    type: String,
    required: false,
  },
  typename: {
    type: [String],
    default: [],
  }
}, {
  timestamps: true
});

// Clear cached model in dev to pick up schema changes
if (mongoose.models.VideoCategory) {
  delete (mongoose.models as any).VideoCategory;
}

const VideoCategory: Model<IVideoCategory> = mongoose.model<IVideoCategory>('VideoCategory', videoCategorySchema);

export default VideoCategory;
