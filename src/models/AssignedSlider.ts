// models/AssignedSlider.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IAssignedSlider extends Document {
  userId: mongoose.Types.ObjectId;
  deviceId: mongoose.Types.ObjectId;
  sliderId: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;
  status: 'active' | 'inactive';
  assignedAt: Date;
}

const AssignedSliderSchema: Schema = new Schema({
  userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  deviceId: { type: mongoose.Types.ObjectId, ref: 'Device', required: true },
  sliderId: { type: mongoose.Types.ObjectId, ref: 'Slider', required: true },
  assignedBy: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  assignedAt: { type: Date, default: Date.now },
});

export default mongoose.models.AssignedSlider || mongoose.model<IAssignedSlider>('AssignedSlider', AssignedSliderSchema);
