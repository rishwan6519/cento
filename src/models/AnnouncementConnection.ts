// models/DeviceAnnouncementConnection.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDeviceAnnouncementConnection extends Document {
  userId: Types.ObjectId | string;
  deviceId: Types.ObjectId | string;
  announcementPlaylistIds: (Types.ObjectId | string)[];
}

const DeviceAnnouncementConnectionSchema = new Schema<IDeviceAnnouncementConnection>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device', required: true },
    announcementPlaylistIds: [
      { type: Schema.Types.ObjectId, ref: 'AnnouncementPlaylist', required: true },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.DeviceAnnouncementConnection ||
  mongoose.model<IDeviceAnnouncementConnection>(
    'DeviceAnnouncementConnection',
    DeviceAnnouncementConnectionSchema
  );
