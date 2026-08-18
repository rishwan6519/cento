import mongoose, { Schema, Document } from 'mongoose';

export interface IPlaylistDistribution extends Document {
  serialNumber: string;
  distribution: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const PlaylistDistributionSchema = new Schema<IPlaylistDistribution>({
  serialNumber: { type: String, required: true, unique: true },
  distribution: { type: Map, of: Number, required: true },
}, {
  timestamps: true
});

// Clear cached model in dev to pick up schema changes
if (mongoose.models.PlaylistDistribution) {
  delete (mongoose.models as any).PlaylistDistribution;
}

export default mongoose.model<IPlaylistDistribution>('PlaylistDistribution', PlaylistDistributionSchema);
