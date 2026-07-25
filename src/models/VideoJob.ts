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

if (mongoose.models && mongoose.models.VideoJob) {
  delete mongoose.models.VideoJob;
}

export default mongoose.model<IVideoJob>("VideoJob", VideoJobSchema);

