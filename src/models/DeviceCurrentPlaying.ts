import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDeviceCurrentPlaying {
  serialNumber: string;
  path: string;
  updatedAt?: Date;
}

export type IDeviceCurrentPlayingDocument = IDeviceCurrentPlaying & Document;

const deviceCurrentPlayingSchema = new Schema<IDeviceCurrentPlaying>({
  serialNumber: { type: String, required: true, unique: true },
  path: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
deviceCurrentPlayingSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export const DeviceCurrentPlaying = mongoose.models.DeviceCurrentPlaying || mongoose.model<IDeviceCurrentPlaying>('DeviceCurrentPlaying', deviceCurrentPlayingSchema, 'device_current_playing');
