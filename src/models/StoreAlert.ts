import mongoose, { Schema, Document } from 'mongoose';

export interface IStoreAlert extends Document {
  userId: string;
  storeId: string;
  category:
    | 'swap_decided'
    | 'task_assigned'
    | 'priority_task'
    | 'availability_due'
    | 'hours_to_confirm'
    | 'check_in_outcome'
    | 'store_announcement'
    | 'roster_published';
  title: string;
  body: string;
  read: boolean;
  targetScreen?: string;
  targetArgument?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StoreAlertSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    storeId: { type: String, required: true, index: true },
    category: {
      type: String,
      required: true,
      enum: [
        'swap_decided',
        'task_assigned',
        'priority_task',
        'availability_due',
        'hours_to_confirm',
        'check_in_outcome',
        'store_announcement',
        'roster_published',
      ],
      index: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    read: { type: Boolean, default: false, index: true },
    targetScreen: { type: String },
    targetArgument: { type: String },
  },
  { timestamps: true }
);

const StoreAlert =
  mongoose.models.StoreAlert || mongoose.model<IStoreAlert>('StoreAlert', StoreAlertSchema);

export default StoreAlert;

