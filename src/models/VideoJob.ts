import mongoose, { Schema, Document } from "mongoose";

export interface IFalRequest {
  requestId: string;
  statusUrl: string;
  responseUrl: string;
  videoUrl?: string;
  status: "processing" | "completed" | "failed";
}

export interface IVideoJob extends Document {
  jobId: string;
  userId: string;
  modelName: string;
  status: "processing" | "completed" | "failed";
  voiceoverScript: string;
  enhancedPrompt?: string;
  templateId?: string;
  offerId?: string;
  videoId?: string;
  approvalStatus?: "pending" | "success" | "rejected";
  socialMediaHeading?: string;
  socialMediaCaption?: string;
  hashTags?: string[];
  images?: string[];
  channels?: string[];
  socialMedia?: string[];
  videoCount: number;
  falRequests: IFalRequest[];
  createdAt: Date;
}

const VideoJobSchema = new Schema<IVideoJob>({
  jobId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  modelName: { type: String, required: true, default: "Wan 2.1" },
  status: { type: String, enum: ["processing", "completed", "failed"], default: "processing" },
  voiceoverScript: { type: String, default: "" },
  enhancedPrompt: { type: String, default: "" },
  templateId: { type: String, default: "" },
  offerId: { type: String, default: "" },
  videoId: { type: String, default: "" },
  approvalStatus: { type: String, enum: ["pending", "success", "rejected"], default: "pending" },
  socialMediaHeading: { type: String, default: "" },
  socialMediaCaption: { type: String, default: "" },
  hashTags: { type: [String], default: [] },
  images: { type: [String], default: [] },
  channels: { type: [String], default: [] },
  socialMedia: { type: [String], default: [] },
  videoCount: { type: Number, default: 1 },
  falRequests: [
    {
      requestId: { type: String, required: true },
      statusUrl: { type: String, required: true },
      responseUrl: { type: String, required: true },
      videoUrl: { type: String, default: "" },
      status: { type: String, enum: ["processing", "completed", "failed"], default: "processing" },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

export default (mongoose.models.VideoJob as mongoose.Model<IVideoJob>) ||
  mongoose.model<IVideoJob>("VideoJob", VideoJobSchema);

