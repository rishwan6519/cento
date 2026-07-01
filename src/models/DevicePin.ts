import mongoose from 'mongoose';

const devicePinSchema = new mongoose.Schema({
  pin: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  serialNumber: {
    type: String,
    required: true,
    trim: true
  },
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Auto-delete after 24 hours (TTL index)
  }
});

const DevicePin = mongoose.models.DevicePin || mongoose.model('DevicePin', devicePinSchema);

export default DevicePin;
