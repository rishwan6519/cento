import mongoose, { Schema, Document } from 'mongoose';
import { AttendancePhase, LocationCheckStatus } from '@/lib/storesparc/types';

export interface IAttendanceRecord extends Document {
  userId: string;
  userName: string;
  storeId: string;
  date: string; // YYYY-MM-DD
  phase: AttendancePhase;
  rosteredShift?: {
    id: string;
    startMinutes: number;
    endMinutes: number;
  };
  checkedInAt?: Date;
  checkedOutAt?: Date;
  locationCheck: LocationCheckStatus;
  locationReading?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    time: string;
  };
  flags: { code: string; label: string }[];
  workedMinutes: number;
  managerNote?: string;
  approvalRequestId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceRecordSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    storeId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    phase: {
      type: String,
      required: true,
      enum: [
        'not_rostered',
        'not_checked_in',
        'awaiting_manager_confirmation',
        'checked_in',
        'checked_out',
      ],
      default: 'not_checked_in',
    },
    rosteredShift: {
      id: { type: String },
      startMinutes: { type: Number },
      endMinutes: { type: Number },
    },
    checkedInAt: { type: Date },
    checkedOutAt: { type: Date },
    locationCheck: {
      type: String,
      enum: ['in_range', 'out_of_range', 'manager_confirmed', 'manager_declined'],
      default: 'in_range',
    },
    locationReading: {
      latitude: { type: Number },
      longitude: { type: Number },
      accuracy: { type: Number },
      time: { type: String },
    },
    flags: [
      {
        code: { type: String, required: true },
        label: { type: String, required: true },
        _id: false,
      },
    ],
    workedMinutes: { type: Number, default: 0 },
    managerNote: { type: String },
    approvalRequestId: { type: String },
  },
  { timestamps: true }
);

AttendanceRecordSchema.index({ userId: 1, date: 1 }, { unique: true });

const AttendanceRecord =
  mongoose.models.AttendanceRecord ||
  mongoose.model<IAttendanceRecord>('AttendanceRecord', AttendanceRecordSchema);

export default AttendanceRecord;

