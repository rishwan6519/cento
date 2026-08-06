import mongoose, { Schema, Document } from "mongoose";

export interface IGoogleFlowJob extends Document {
  jobId: string;            // internal UUID
  userId: string;           // store user ID
  operationName: string;    // Google Gemini long-running operation name
  status: "processing" | "completed" | "failed";
  rawPrompt: string;        // original user text
  enhancedPrompt: string;   // OpenAI-enhanced cinematic prompt
  voiceoverScript: string;
  socialMediaHeading: string;
  socialMediaCaption: string;
  hashTags: string[];
  aspectRatio: string;
  resolution: string;
  duration: number;
  offerId: string;
  tagline?: string;
  templateId?: string;
  channels: string[];
  images: string[];
  imageTypes?: string[];
  numberOfVideos: number;
  referenceImageUrl?: string; // stored local URL of uploaded reference image
  hasReferenceImage?: boolean;
  videoUrl: string;         // local saved URL once complete
  googleVideoUri: string;   // raw Google CDN URI
  errorMessage: string;
  createdAt: Date;
  completedAt?: Date;
}

const GoogleFlowJobSchema = new Schema<IGoogleFlowJob>({
  jobId:              { type: String, required: true, unique: true },
  userId:             { type: String, required: true },
  operationName:      { type: String, default: "" },
  status:             { type: String, enum: ["processing", "completed", "failed"], default: "processing" },
  rawPrompt:          { type: String, default: "" },
  enhancedPrompt:     { type: String, default: "" },
  voiceoverScript:    { type: String, default: "" },
  socialMediaHeading: { type: String, default: "" },
  socialMediaCaption: { type: String, default: "" },
  hashTags:           { type: [String], default: [] },
  aspectRatio:        { type: String, default: "16:9" },
  resolution:         { type: String, default: "720p" },
  duration:           { type: Number, default: 8 },
  offerId:            { type: String, default: "" },
  tagline:            { type: String, default: "" },
  templateId:         { type: String, default: "" },
  channels:           { type: [String], default: [] },
  images:             { type: [String], default: [] },
  imageTypes:         { type: [String], default: [] },
  numberOfVideos:     { type: Number, default: 1 },
  referenceImageUrl:  { type: String, default: "" },
  hasReferenceImage:  { type: Boolean, default: false },
  videoUrl:           { type: String, default: "" },
  googleVideoUri:     { type: String, default: "" },
  errorMessage:       { type: String, default: "" },
  createdAt:          { type: Date, default: Date.now },
  completedAt:        { type: Date },
});

export default (mongoose.models.GoogleFlowJob as mongoose.Model<IGoogleFlowJob>) ||
  mongoose.model<IGoogleFlowJob>("GoogleFlowJob", GoogleFlowJobSchema);
