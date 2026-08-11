import mongoose, { Schema, Document } from "mongoose";

export interface ICloudbasesJob extends Document {
  jobId: string;
  userId: string;
  templateId: string;
  status: "processing" | "completed" | "failed";
  // Input fields
  description: string;
  headline: string;
  discount: string;
  validity: string;
  productUrl: string;
  // Output
  resultData: Record<string, any>;
  errorMessage: string;
  createdAt: Date;
  completedAt?: Date;
}

const CloudbasesJobSchema = new Schema<ICloudbasesJob>({
  jobId:         { type: String, required: true, unique: true },
  userId:        { type: String, default: "" },
  templateId:    { type: String, default: "" },
  status:        { type: String, enum: ["processing", "completed", "failed"], default: "processing" },
  description:   { type: String, default: "" },
  headline:      { type: String, default: "" },
  discount:      { type: String, default: "" },
  validity:      { type: String, default: "" },
  productUrl:    { type: String, default: "" },
  resultData:    { type: Schema.Types.Mixed, default: {} },
  errorMessage:  { type: String, default: "" },
  createdAt:     { type: Date, default: Date.now },
  completedAt:   { type: Date },
});

export default (mongoose.models.CloudbasesJob as mongoose.Model<ICloudbasesJob>) ||
  mongoose.model<ICloudbasesJob>("CloudbasesJob", CloudbasesJobSchema);