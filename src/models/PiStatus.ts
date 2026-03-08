import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPiStatus {
  pi_id: string;
  status?: string;
  pipeline_running?: boolean;
  cameras_active?: any[];
  camera_count?: number;
  last_frame_time?: Date;
  health_score?: number;
}

export type IPiStatusDocument = IPiStatus & Document;

const piStatusSchema = new Schema<IPiStatus>({
  pi_id: { type: String, required: true, unique: true },
  status: { type: String },
  pipeline_running: { type: Boolean },
  cameras_active: [Schema.Types.Mixed],
  camera_count: { type: Number },
  last_frame_time: { type: Date },
  health_score: { type: Number }
});

export const PiStatus: Model<IPiStatus> = mongoose.models.PiStatus || mongoose.model<IPiStatus>('PiStatus', piStatusSchema, 'pi_status');
