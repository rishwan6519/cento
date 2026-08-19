import mongoose, { Schema, Document } from 'mongoose';

export interface ITimeSlotDistribution extends Document {
  serialNumber: string;
  start: string;
  end: string;
  distribution: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const TimeSlotDistributionSchema = new Schema<ITimeSlotDistribution>({
  serialNumber: { type: String, required: true },
  start: { type: String, required: true },
  end: { type: String, required: true },
  distribution: { type: Map, of: Number, required: true },
}, {
  timestamps: true
});

// Compound index to quickly find the specific distribution for a slot
TimeSlotDistributionSchema.index({ serialNumber: 1, start: 1, end: 1 }, { unique: true });

// Clear cached model in dev to pick up schema changes
if (mongoose.models.TimeSlotDistribution) {
  delete (mongoose.models as any).TimeSlotDistribution;
}

export default mongoose.model<ITimeSlotDistribution>('TimeSlotDistribution', TimeSlotDistributionSchema);
