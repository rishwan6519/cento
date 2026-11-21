import mongoose, { Schema, Document } from 'mongoose';

export interface IIdempotencyRecord extends Document {
  key: string;
  userId: string;
  endpoint: string;
  responseStatus: number;
  responseBody: any;
  createdAt: Date;
}

const IdempotencyRecordSchema: Schema = new Schema(
  {
    key: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
    },
    responseStatus: {
      type: Number,
      required: true,
    },
    responseBody: {
      type: Schema.Types.Mixed,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 60 * 60 * 24 * 7, // Retain keys for 7 days
    },
  },
  {
    timestamps: false,
  }
);

IdempotencyRecordSchema.index({ key: 1, userId: 1 }, { unique: true });

const IdempotencyRecord =
  mongoose.models.IdempotencyRecord ||
  mongoose.model<IIdempotencyRecord>('IdempotencyRecord', IdempotencyRecordSchema);

export default IdempotencyRecord;

