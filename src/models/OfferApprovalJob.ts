import mongoose, { Schema, Document } from "mongoose";

export interface IOfferApprovalJob extends Document {
  jobId: string;
  idempotencyKey?: string;
  status: "processing" | "completed" | "failed";
  resultData?: any;
  error?: string;
  createdAt: Date;
}

const OfferApprovalJobSchema = new Schema<IOfferApprovalJob>({
  jobId: { type: String, required: true, unique: true },
  idempotencyKey: { type: String, index: true },
  status: { type: String, enum: ["processing", "completed", "failed"], default: "processing" },
  resultData: { type: Schema.Types.Mixed },
  error: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default (mongoose.models.OfferApprovalJob as mongoose.Model<IOfferApprovalJob>) ||
  mongoose.model<IOfferApprovalJob>("OfferApprovalJob", OfferApprovalJobSchema);
