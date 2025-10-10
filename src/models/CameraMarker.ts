import mongoose, { Schema, Document } from "mongoose";

export interface ICameraMarker extends Document {
  cameraId: string;
  x: number;
  y: number;
  floorMapId: string;
  createdAt: Date;
}

const CameraMarkerSchema = new Schema<ICameraMarker>(
  {
    cameraId: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    floorMapId: { type: String, required: true, ref: "FloorMap" },
  },
  { timestamps: true }
);

export default mongoose.models.CameraMarker ||
  mongoose.model<ICameraMarker>("CameraMarker", CameraMarkerSchema);
