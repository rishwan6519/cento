import mongoose, { Schema, Document, Model } from "mongoose";

export interface IServerLog {
  serialNumber: string;         // Device serial number
  logs: string[];               // Array of log strings sent by the device
  currentlyPlaying: string | null; // Playlist name or null
  receivedAt: Date;             // Timestamp when the server received this batch
}

export type IServerLogDocument = IServerLog & Document;

const serverLogSchema = new Schema<IServerLog>(
  {
    serialNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    logs: {
      type: [String],
      required: true,
      default: [],
    },
    currentlyPlaying: {
      type: String,
      default: null,
    },
    receivedAt: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
  },
  {
    // No automatic timestamps – we manage `receivedAt` manually so the TTL
    // index below works on a predictable field name.
    timestamps: false,
  }
);

// ── TTL index: MongoDB will automatically remove documents older than 7 days ──
// This runs as a background task inside MongoDB itself – no cron job needed.
serverLogSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

const ServerLog: Model<IServerLog> =
  mongoose.models.ServerLog ||
  mongoose.model<IServerLog>("ServerLog", serverLogSchema, "server_logs");

export default ServerLog;
