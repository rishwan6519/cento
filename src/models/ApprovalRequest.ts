import mongoose, { Schema, Document } from 'mongoose';
import { ApprovalKind, ApprovalStatus } from '@/lib/storesparc/types';

export interface IApprovalRequest extends Document {
  storeId: string;
  kind: ApprovalKind;
  requesterId: string;
  requesterName: string;
  summary: string;
  detail: any;
  status: ApprovalStatus;
  complianceFlag?: {
    flagged: boolean;
    reason?: string;
  };
  declineReasons: string[];
  submittedAt: Date;
  decidedAt?: Date;
  decidedBy?: string;
  decisionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApprovalRequestSchema: Schema = new Schema(
  {
    storeId: { type: String, required: true, index: true },
    kind: {
      type: String,
      required: true,
      enum: ['shift_swap', 'attendance_correction', 'manual_checkin'],
      index: true,
    },
    requesterId: { type: String, required: true, index: true },
    requesterName: { type: String, required: true },
    summary: { type: String, required: true },
    detail: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'declined', 'withdrawn'],
      default: 'pending',
      index: true,
    },
    complianceFlag: {
      flagged: { type: Boolean, default: false },
      reason: { type: String },
    },
    declineReasons: {
      type: [String],
      default: [
        'Out of hours / unauthorized shift',
        'Incompatible location reading',
        'Scheduling conflict',
      ],
    },
    submittedAt: { type: Date, default: Date.now },
    decidedAt: { type: Date },
    decidedBy: { type: String },
    decisionReason: { type: String },
  },
  { timestamps: true }
);

const ApprovalRequest =
  mongoose.models.ApprovalRequest ||
  mongoose.model<IApprovalRequest>('ApprovalRequest', ApprovalRequestSchema);

export default ApprovalRequest;

