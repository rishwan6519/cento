import mongoose from 'mongoose';

const playlistFileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  path: { type: String, required: true },
  type: { type: String, required: true },
  shuffle: { type: Boolean, default: false },
  displayOrder: { type: Number, required: true },
  delay: { type: Number, default: 0 },

  backgroundImageEnabled: { type: Boolean, default: false },
  backgroundImage: { type: String, default: null },
});

const playlistConfigSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, required: true },
  // contentType: { type: String, required: true },  //<-- REMOVED
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  shuffle: { type: Boolean, default: false },
  startDate: { type: String, required: false },
  endDate: { type: String, required: false },
  daysOfWeek: [{ type: String, required: false }],
  files: [playlistFileSchema],
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