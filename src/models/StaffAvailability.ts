import mongoose, { Schema, Document } from 'mongoose';

export interface IDayAvailability {
  date: string; // YYYY-MM-DD
  status: 'available' | 'partial' | 'unavailable';
  fromMinutes?: number;
  toMinutes?: number;
  note?: string;
}

export interface IStaffAvailability extends Document {
  userId: string;
  userName: string;
  storeId: string;
  weekStart: string; // YYYY-MM-DD (Monday)
  month?: string; // YYYY-MM
  days: IDayAvailability[];
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DayAvailabilitySchema = new Schema(
  {
    date: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ['available', 'partial', 'unavailable'],
    },
    fromMinutes: { type: Number },
    toMinutes: { type: Number },
    note: { type: String },
  },
  { _id: false }
);

const StaffAvailabilitySchema: Schema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    storeId: { type: String, required: true, index: true },
    weekStart: { type: String, required: true, index: true },
    month: { type: String },
    days: [DayAvailabilitySchema],
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

StaffAvailabilitySchema.index({ userId: 1, weekStart: 1 }, { unique: true });

const StaffAvailability =
  mongoose.models.StaffAvailability ||
  mongoose.model<IStaffAvailability>('StaffAvailability', StaffAvailabilitySchema);

export default StaffAvailability;

