import mongoose from 'mongoose';

const deviceTypeSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  imageUrl: { 
    type: String, 
    required: true 
  },
  handMovements: [{ 
    type: String 
  }],
  bodyMovements: [{ 
    type: String 
  }],
  screenSize: {
    width: { 
      type: Number, 
      required: true 
    }
  }
}, {
  timestamps: true
});

export const DeviceType = mongoose.models.DeviceType || 
  mongoose.model('DeviceType', deviceTypeSchema);