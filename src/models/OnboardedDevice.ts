import mongoose, { Schema, Document } from "mongoose";

export interface OnboardedDeviceDocument extends Document {
  deviceId: mongoose.Schema.Types.ObjectId;
  typeId: mongoose.Schema.Types.ObjectId;
  userId: mongoose.Schema.Types.ObjectId;
}

const OnboardedDeviceSchema: Schema = new Schema({
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Device", required: true },
  typeId: { type: mongoose.Schema.Types.ObjectId, ref: "DeviceType", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

const OnboardedDevice =
  mongoose.models.OnboardedDevice ||
  mongoose.model<OnboardedDeviceDocument>("OnboardedDevice", OnboardedDeviceSchema);

export default OnboardedDevice;
