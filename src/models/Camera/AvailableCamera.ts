import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAvailableCamera {
  pi_id: string;
  camera_id: string;
  status: string;
  last_timestamp: number;
}

export type IAvailableCameraDocument = IAvailableCamera & Document;

const availableCameraSchema = new Schema<IAvailableCamera>({
  pi_id: {
    type: String,
    required: true,
  },
  camera_id: {
    type: String, // e.g., "camera1"
    required: true,
    unique: true // Assuming one record per camera that gets updated
  },
  status: {
    type: String,
    required: true, // "Connected" or "Disconnected"
  },
  last_timestamp: {
    type: Number,
    required: true,
  }
}, { timestamps: true });

export const AvailableCamera: Model<IAvailableCamera> = mongoose.models.AvailableCamera || mongoose.model<IAvailableCamera>('AvailableCamera', availableCameraSchema);
