import mongoose, { Schema, Document } from 'mongoose';

export interface IWeeklyHours extends Document {
  userId: string;
  storeId: string;
  weekStart: string; // YYYY-MM-DD
  status: 'in_progress' | 'needs_confirmation' | 'confirmed';
  rosteredMinutes: number;
  recordedMinutes: number;
  canConfirm: boolean;
  confirmedAt?: Date;
  correctionsPending?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WeeklyHoursSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    storeId: { type: String, required: true, index: true },
    weekStart: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['in_progress', 'needs_confirmation', 'confirmed'],
      default: 'in_progress',
    },
    rosteredMinutes: { type: Number, default: 0 },
    recordedMinutes: { type: Number, default: 0 },
    canConfirm: { type: Boolean, default: false },
    confirmedAt: { type: Date },
    correctionsPending: { type: Boolean, default: false },
  },
  { timestamps: true }
);

WeeklyHoursSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

const WeeklyHours =
  mongoose.models.WeeklyHours || mongoose.model<IWeeklyHours>('WeeklyHours', WeeklyHoursSchema);

export default WeeklyHours;

