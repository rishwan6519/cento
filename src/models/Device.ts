import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Device name is required'],
    trim: true
  },
  serialNumber: {
    type: String,
    required: [true, 'Serial number is required'],
    unique: true,
    trim: true
  },
  typeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeviceType',
    required: [true, 'Device type is required']
  },
  imageUrl: {
    type: String,
    required: false
  },
    color: {
        type: String,
        required: false
    },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Add indexes
deviceSchema.index({ serialNumber: 1 }, { unique: true });
deviceSchema.index({ typeId: 1 });

const Device = mongoose.models.Device || mongoose.model('Device', deviceSchema);

export default Device;