import mongoose, { Document, Model } from 'mongoose';

export interface IManualTimelineOverride extends Document {
  serialNumber: string;
  date: string;       // Format YYYY-MM-DD
  versionId: string;  // Unique version ID generated on save
  data: any[];        // The array of timeline windows (start, end, medias)
  createdAt: Date;
  updatedAt: Date;
}

const ManualTimelineOverrideSchema = new mongoose.Schema(
  {
    serialNumber: {
      type: String,
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
    },
    versionId: {
      type: String,
      required: true,
    },
    data: {
      type: [mongoose.Schema.Types.Mixed], // Array of objects containing start, end, and medias
      required: true,
      default: []
    }
  },
  { timestamps: true }
);

// Compound index to quickly find the specific manual override for a device on a given date
ManualTimelineOverrideSchema.index({ serialNumber: 1, date: 1 }, { unique: true });

const ManualTimelineOverride: Model<IManualTimelineOverride> = mongoose.models.ManualTimelineOverride || mongoose.model<IManualTimelineOverride>('ManualTimelineOverride', ManualTimelineOverrideSchema);

export default ManualTimelineOverride;
