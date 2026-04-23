import mongoose, { Schema, Document } from 'mongoose';

export interface DeviceAssignmentDocument extends Document {
  deviceId: mongoose.Types.ObjectId;
  resellerId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  status: 'assigned' | 'disconnected';
  assignedAt: Date;
  disconnectedAt?: Date;
}

const DeviceAssignmentSchema: Schema = new Schema(
  {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: true,
    },
    resellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    status: {
      type: String,
      enum: ['assigned', 'disconnected'],
      default: 'assigned',
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    disconnectedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Only one active (assigned) record per device at a time
DeviceAssignmentSchema.index({ deviceId: 1, status: 1 });

const DeviceAssignment =
  mongoose.models.DeviceAssignment ||
  mongoose.model<DeviceAssignmentDocument>('DeviceAssignment', DeviceAssignmentSchema);

export default DeviceAssignment;
