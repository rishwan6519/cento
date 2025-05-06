import mongoose from 'mongoose';


export interface DeviceTypeDocument extends Document {
  name: string;
  imageUrl: string;
  handMovements?: string[];
  bodyMovements?: string[];
  screenSize: {
    width: number;
    
  };
}
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
  mongoose.model<DeviceTypeDocument>('DeviceType', deviceTypeSchema);