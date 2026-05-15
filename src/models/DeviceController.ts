import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDeviceController {
  deviceId: string;       // unique identifier – serial number or device _id string
  deviceReset: number;    // 0 = default (no reset), 1 = reset requested
  updatedAt: Date;
}

export type IDeviceControllerDocument = IDeviceController & Document;

const deviceControllerSchema = new Schema<IDeviceController>(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    deviceReset: {
      type: Number,
      enum: [0, 1],
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const DeviceController: Model<IDeviceController> =
  mongoose.models.DeviceController ||
  mongoose.model<IDeviceController>(
    "DeviceController",
    deviceControllerSchema,
    "device_controller"
  );

export default DeviceController;
