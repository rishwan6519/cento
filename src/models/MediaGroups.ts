import mongoose, { Schema, Document } from 'mongoose';

export interface IMediaGroup extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  name: string;
  description?: string;
  mediaIds: mongoose.Schema.Types.ObjectId[];
  deviceIds: mongoose.Schema.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const MediaGroupSchema = new Schema<IMediaGroup>({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String, 
    default: '',
    trim: true
  },
  mediaIds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MediaItem' 
  }],
  deviceIds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Device' 
  }],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

MediaGroupSchema.index({ userId: 1, name: 1 }, { unique: true });

MediaGroupSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.MediaGroup || mongoose.model<IMediaGroup>('MediaGroup', MediaGroupSchema);