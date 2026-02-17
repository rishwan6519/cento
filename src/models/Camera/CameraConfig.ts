import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICameraConfig {
  id: string; // e.g., "CAM-01"
  name: string;
  rtsp_url: string;
  ip: string;
  username: string;
  password: string;
  type: 'dahua' | 'hikvision' | 'other';
  channel: number;
  status: string;
  zones: any[];
  lines: any[];
}

export type ICameraConfigDocument = ICameraConfig & Document;

const cameraConfigSchema = new Schema<ICameraConfig>({
  id: {
    type: String, // e.g., "CAM-01"
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  rtsp_url: {
    type: String,
    required: true
  },
  ip: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['dahua', 'hikvision', 'other'] 
  },
  channel: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    default: 'inactive' // active, inactive, error
  },
  zones: [Schema.Types.Mixed],
  lines: [Schema.Types.Mixed]
}, { timestamps: true });

export const CameraConfig: Model<ICameraConfig> = mongoose.models.CameraConfig || mongoose.model<ICameraConfig>('CameraConfig', cameraConfigSchema);
