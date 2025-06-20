import mongoose from 'mongoose';

const countEntrySchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true
  },
  in_count: {
    type: Number,
    default: 0
  },
  out_count: {
    type: Number,
    default: 0
  },
  history: [{
    action: {
      type: String,
      enum: ['Entered', 'Exited'],
      required: true
    },
    id: {
      type: Number,
      required: true
    },
    time: {
      type: String,
      required: true
    }
  }]
});

const zoneSchema = new mongoose.Schema({
  camera_id: {
    type: String,
    required: true
  },
  zone_id: {
    type: Number,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  counts: [countEntrySchema]
});


// Add compound index for efficient queries
zoneSchema.index({ camera_id: 1, zone_id: 1, date: 1 }, { unique: true });


export const ZoneCount = mongoose.models.ZoneCount || mongoose.model('ZoneCount', zoneSchema);