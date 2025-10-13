// models/ApiKey.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IApiKey extends Document {
  userId: mongoose.Types.ObjectId;
  apiKey: string;
  assignedBy: mongoose.Types.ObjectId;
  status: "active" | "inactive" | "revoked";
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    apiKey: { type: String, required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["active", "inactive", "revoked"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.models.ApiKey ||
  mongoose.model<IApiKey>("ApiKey", ApiKeySchema);
