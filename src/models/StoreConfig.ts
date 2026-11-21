import mongoose, { Schema, Document } from 'mongoose';

export interface IWeekdayHours {
  weekday: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  openMinutes: number; // minutes from midnight, e.g. 540 = 09:00
  closeMinutes: number; // minutes from midnight, e.g. 1260 = 21:00
  isClosed?: boolean;
}

export interface IStoreConfig extends Document {
  storeId: string;
  storeName: string;
  latitude: number;
  longitude: number;
  geofenceRadius: number; // in metres
  tradingHours: IWeekdayHours[];
  signageRotation: number; // in seconds
  maxAnnouncementLength: number;
  timeZone: string; // e.g. 'Asia/Kolkata'
  whatsAppGroupLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WeekdayHoursSchema = new Schema(
  {
    weekday: { type: Number, required: true },
    openMinutes: { type: Number, required: true, default: 540 }, // 09:00
    closeMinutes: { type: Number, required: true, default: 1260 }, // 21:00
    isClosed: { type: Boolean, default: false },
  },
  { _id: false }
);

const StoreConfigSchema: Schema = new Schema(
  {
    storeId: { type: String, required: true, unique: true, index: true },
    storeName: { type: String, required: true },
    latitude: { type: Number, required: true, default: 12.9716 },
    longitude: { type: Number, required: true, default: 77.5946 },
    geofenceRadius: { type: Number, required: true, default: 150 }, // 150m radius
    tradingHours: {
      type: [WeekdayHoursSchema],
      default: [
        { weekday: 1, openMinutes: 540, closeMinutes: 1260, isClosed: false },
        { weekday: 2, openMinutes: 540, closeMinutes: 1260, isClosed: false },
        { weekday: 3, openMinutes: 540, closeMinutes: 1260, isClosed: false },
        { weekday: 4, openMinutes: 540, closeMinutes: 1260, isClosed: false },
        { weekday: 5, openMinutes: 540, closeMinutes: 1260, isClosed: false },
        { weekday: 6, openMinutes: 540, closeMinutes: 1260, isClosed: false },
        { weekday: 0, openMinutes: 600, closeMinutes: 1200, isClosed: false },
      ],
    },
    signageRotation: { type: Number, default: 15 },
    maxAnnouncementLength: { type: Number, default: 500 },
    timeZone: { type: String, default: 'Asia/Kolkata' },
    whatsAppGroupLink: { type: String, default: 'https://chat.whatsapp.com/testgroup' },
  },
  { timestamps: true }
);

const StoreConfig =
  mongoose.models.StoreConfig || mongoose.model<IStoreConfig>('StoreConfig', StoreConfigSchema);

export default StoreConfig;

