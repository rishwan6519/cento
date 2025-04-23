import mongoose, { Schema, Document } from 'mongoose';

// Define the interface for a Device document
export interface DeviceDocument extends Document {
  name: string;
  serialNumber: string;
  status: string;
  type?: {
    name?: string;
  };
  imageUrl?: string;
  color?: string;
  userId: mongoose.Types.ObjectId; // Assume userId is a MongoDB ObjectId
}

// Define the schema
const DeviceSchema: Schema = new Schema({
  name: { type: String, required: true },
  serialNumber: { type: String, required: true, unique: true },
  status: { type: String, required: true },
  type: {
    name: { type: String },
  },
  imageUrl: { type: String },
  color: { type: String },
  userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Create the model
const Device = mongoose.model<DeviceDocument>('OnboardedDevice', DeviceSchema);

export default Device;