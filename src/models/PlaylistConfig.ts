import mongoose from 'mongoose';

const playlistFileSchema = new mongoose.Schema({
  mediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaItem' },
  fileId: { type: mongoose.Schema.Types.Mixed },   // raw id or filename
  name: { type: String, required: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  path: { type: String, required: false },
  type: { type: String, required: false },
  shuffle: { type: Boolean, default: false },
  displayOrder: { type: Number, required: true },
  delay: { type: Number, default: 0 },
  maxVolume: { type: Number, default: 100 },
  minVolume: { type: Number, default: 0 },
  backgroundImageEnabled: { type: Boolean, default: false },
  backgroundImage: { type: String, default: null },
});

const playlistConfigSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  type: { type: String, required: false, default: 'media' },
  contentType: { type: String, required: false, default: 'playlist' },
  startTime: { type: String, required: false },
  endTime: { type: String, required: false },
  shuffle: { type: Boolean, default: false },
  startDate: { type: String, required: false },
  endDate: { type: String, required: false },
  daysOfWeek: [{ type: String, required: false }],
  priority: { type: Number, required: false, default: 0 },
  files: [playlistFileSchema],
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  // Extra fields from store frontends
  description: { type: String, required: false },
  deviceIds: [{ type: mongoose.Schema.Types.Mixed }],
  selectedDeviceId: { type: mongoose.Schema.Types.Mixed, required: false },
  globalMinVolume: { type: Number, default: 30 },
  globalMaxVolume: { type: Number, default: 80 },
  backgroundAudio: {
    enabled: { type: Boolean, default: false },
    file: { type: mongoose.Schema.Types.Mixed, default: null },
    volume: { type: Number, default: 50 }
  }
}, {
  timestamps: true
});

// Clear cached model in dev to pick up schema changes
if (mongoose.models.PlaylistConfig) {
  delete (mongoose.models as any).PlaylistConfig;
}
const PlaylistConfig = mongoose.model('PlaylistConfig', playlistConfigSchema);

export default PlaylistConfig;