import mongoose, { Schema, Document } from 'mongoose';

export interface IMfaChallenge extends Document {
  challengeId: string;
  userId: string;
  method: 'sms' | 'email' | 'authenticator';
  code: string;
  destinationHint: string;
  verified: boolean;
  expiresAt: Date;
  createdAt: Date;
}

const MfaChallengeSchema: Schema = new Schema(
  {
    challengeId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    method: { type: String, enum: ['sms', 'email', 'authenticator'], default: 'sms' },
    code: { type: String, required: true },
    destinationHint: { type: String, required: true },
    verified: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // MongoDB TTL auto-cleanup
  },
  { timestamps: true }
);

export default mongoose.models.MfaChallenge ||
  mongoose.model<IMfaChallenge>('MfaChallenge', MfaChallengeSchema);
