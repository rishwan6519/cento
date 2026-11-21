import mongoose, { Schema, Document } from 'mongoose';

export interface IRosterShift extends Document {
  storeId: string;
  weekStart: string; // YYYY-MM-DD
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  startMinutes: number; // e.g. 540 (09:00)
  endMinutes: number; // e.g. 1020 (17:00)
  swapEligible: boolean;
  status: 'draft' | 'published';
  createdAt: Date;
  updatedAt: Date;
}

const RosterShiftSchema: Schema = new Schema(
  {
    storeId: { type: String, required: true, index: true },
    weekStart: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    date: { type: String, required: true, index: true },
    startMinutes: { type: Number, required: true },
    endMinutes: { type: Number, required: true },
    swapEligible: { type: Boolean, default: true },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'published'],
      default: 'draft',
      index: true,
    },
  },
  { timestamps: true }
);

const RosterShift =
  mongoose.models.RosterShift || mongoose.model<IRosterShift>('RosterShift', RosterShiftSchema);

export default RosterShift;

