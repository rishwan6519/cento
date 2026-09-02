import mongoose from 'mongoose';

const deviceScreenshotSchema = new mongoose.Schema({
  serialNumber: {
    type: String,
    required: [true, 'Serial number is required'],
    index: true,
  },
  url: {
    type: String,
    required: [true, 'Screenshot URL is required'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true
});

// Clear cached model in dev to pick up schema changes
if (mongoose.models.DeviceScreenshot) {
  delete (mongoose.models as any).DeviceScreenshot;
}
const DeviceScreenshot = mongoose.model('DeviceScreenshot', deviceScreenshotSchema);

export default DeviceScreenshot;
