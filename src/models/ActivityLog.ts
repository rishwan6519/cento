import mongoose, { Schema, Document } from 'mongoose';

export interface ActivityLogDocument extends Document {
  userId: mongoose.Types.ObjectId;
  action: string;
  entityType?: string;
  entityId?: mongoose.Types.ObjectId | string;
  details?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityLogSchema: Schema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true
  },
  entityType: {
    type: String,
    required: false
  },
  entityId: {
    type: mongoose.Schema.Types.Mixed, // Can be ObjectId or String depending on the entity
    required: false
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  }
}, {
  timestamps: true
});

if (mongoose.models.ActivityLog) {
  delete (mongoose.models as any).ActivityLog;
}

const ActivityLog = mongoose.model<ActivityLogDocument>('ActivityLog', ActivityLogSchema);

export default ActivityLog;
