import mongoose, { Schema, Document } from "mongoose";

export interface IZone {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ICameraMarker extends Document {
  cameraId: string; // Acts as the Name
  x: number;
  y: number;
  width: number;
  height: number;
  floorMapId: string;
  zones: IZone[];
  createdAt: Date;
}

const ZoneSchema = new Schema({
    name: { type: String, required: true },
    x: { type: Number, required: true }, // Relative to the Camera Marker or Absolute? Usually easier if relative to image, same as camera
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true }
}, { _id: false });

const CameraMarkerSchema = new Schema<ICameraMarker>(
  {
    cameraId: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    floorMapId: { type: String, required: true, ref: "FloorMap" },
    zones: [ZoneSchema]
  },
  { timestamps: true }
);

export default mongoose.models.CameraMarker ||
  mongoose.model<ICameraMarker>("CameraMarker", CameraMarkerSchema);
