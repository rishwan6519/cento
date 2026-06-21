import mongoose from 'mongoose';


export interface DeviceTypeDocument extends Document {
  name: string;
  type: 'audio' | 'video';
  imageUrl: string;
  handMovements?: string[];
  bodyMovements?: string[];
  screenSize: {
    width: number;
    
  };
  blockCodingEnabled?: boolean;
}
const deviceTypeSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  type: {
    type: String,
    enum: ['audio', 'video'],
    default: 'audio'
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
      default: 0
    },
    height: { 
      type: Number, 
      default: 0
    }
  },
  blockCodingEnabled: { 
    type: Boolean, 
    default: false 
  }
}, {
  timestamps: true
});

export const DeviceType = mongoose.models.DeviceType || 
  mongoose.model<DeviceTypeDocument>('DeviceType', deviceTypeSchema);