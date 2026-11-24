import mongoose, { Schema, Document } from 'mongoose';

export interface IPushDevice extends Document {
  userId: string;
  token: string;
  platform: 'Android' | 'iOS';
  appId: string;
  environment: 'production' | 'staging' | 'sandbox';
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PushDeviceSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    platform: {
      type: String,
      required: true,
      enum: ['Android', 'iOS'],
      default: 'Android',
    },
    appId: { type: String, default: 'com.storesparc.ops' },
    environment: {
      type: String,
      enum: ['production', 'staging', 'sandbox'],
      default: 'production',
    },
    lastActive: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const PushDevice =
  mongoose.models.PushDevice || mongoose.model<IPushDevice>('PushDevice', PushDeviceSchema);

export default PushDevice;

