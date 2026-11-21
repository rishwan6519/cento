import mongoose, { Schema, Document } from 'mongoose';

export interface IOfflineScreenReport extends Document {
  storeId: string;
  screenId: string;
  reportedBy: string;
  reportedAt: Date;
  status: 'reported' | 'ticket_created' | 'resolved';
  createdAt: Date;
}

const OfflineScreenReportSchema: Schema = new Schema(
  {
    storeId: { type: String, required: true, index: true },
    screenId: { type: String, required: true, index: true },
    reportedBy: { type: String, required: true },
    reportedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['reported', 'ticket_created', 'resolved'],
      default: 'reported',
    },
  },
  { timestamps: true }
);

const OfflineScreenReport =
  mongoose.models.OfflineScreenReport ||
  mongoose.model<IOfflineScreenReport>('OfflineScreenReport', OfflineScreenReportSchema);

export default OfflineScreenReport;

