import mongoose from 'mongoose';

const playlistFileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  path: { type: String, required: true },
  type: { type: String, required: true },
  displayOrder: { type: Number, required: true },
  delay: { type: Number, default: 0 },
  backgroundImageEnabled: { type: Boolean, default: false },
  backgroundImage: { type: String, default: null }
});

const backgroundAudioSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  file: { type: String, default: null },
  volume: { type: Number, default: 50 }
});

const playlistConfigSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  files: [playlistFileSchema],
  backgroundAudio: backgroundAudioSchema,
  status: { 
    type: String, 
    enum: ['active', 'inactive'], 
    default: 'active' 
  }
}, {
  timestamps: true
});

const PlaylistConfig = mongoose.models.PlaylistConfig || 
  mongoose.model('PlaylistConfig', playlistConfigSchema);

export default PlaylistConfig;