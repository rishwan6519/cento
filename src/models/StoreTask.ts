import mongoose, { Schema, Document } from 'mongoose';

export interface IStoreTask extends Document {
  storeId: string;
  title: string;
  note?: string;
  category: 'group' | 'priority' | 'role_specific' | 'manager_only';
  role?: string;
  dueDate?: Date;
  assigneeId?: string;
  assigneeName?: string;
  status: 'open' | 'claimed' | 'completed';
  claimedBy?: string;
  completedBy?: string;
  completedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const StoreTaskSchema: Schema = new Schema(
  {
    storeId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    note: { type: String },
    category: {
      type: String,
      required: true,
      enum: ['group', 'priority', 'role_specific', 'manager_only'],
      default: 'group',
      index: true,
    },
    role: { type: String },
    dueDate: { type: Date },
    assigneeId: { type: String, index: true },
    assigneeName: { type: String },
    status: {
      type: String,
      required: true,
      enum: ['open', 'claimed', 'completed'],
      default: 'open',
      index: true,
    },
    claimedBy: { type: String },
    completedBy: { type: String },
    completedAt: { type: Date },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

const StoreTask =
  mongoose.models.StoreTask || mongoose.model<IStoreTask>('StoreTask', StoreTaskSchema);

export default StoreTask;

