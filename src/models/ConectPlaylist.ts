import mongoose from 'mongoose';

const devicePlaylistSchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  playlistIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Playlist'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add index for faster queries
devicePlaylistSchema.index({ deviceId: 1 });

const DevicePlaylist = mongoose.models.DevicePlaylist || mongoose.model('DevicePlaylist', devicePlaylistSchema);

export default DevicePlaylist;