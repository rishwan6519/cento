import mongoose, { Schema, Document } from 'mongoose';

export interface ICoverageGap {
  date: string;
  fromMinutes: number;
  toMinutes: number;
  message: string;
}

export interface IRosterWeek extends Document {
  storeId: string;
  weekStart: string; // YYYY-MM-DD
  status: 'draft' | 'published';
  publishedAt?: Date;
  editable: boolean;
  lockedReason?: string;
  coverageGaps: ICoverageGap[];
  createdAt: Date;
  updatedAt: Date;
}

const CoverageGapSchema = new Schema(
  {
    date: { type: String, required: true },
    fromMinutes: { type: Number, required: true },
    toMinutes: { type: Number, required: true },
    message: { type: String, required: true },
  },
  { _id: false }
);

const RosterWeekSchema: Schema = new Schema(
  {
    storeId: { type: String, required: true, index: true },
    weekStart: { type: String, required: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    publishedAt: { type: Date },
    editable: { type: Boolean, default: true },
    lockedReason: { type: String },
    coverageGaps: [CoverageGapSchema],
  },
  { timestamps: true }
);

RosterWeekSchema.index({ storeId: 1, weekStart: 1 }, { unique: true });

const RosterWeek =
  mongoose.models.RosterWeek || mongoose.model<IRosterWeek>('RosterWeek', RosterWeekSchema);

export default RosterWeek;

