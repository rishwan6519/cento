import mongoose, { Schema, Document } from 'mongoose';

export interface NotificationDocument extends Document {
  storeUserId: mongoose.Types.ObjectId;
  title: string;
  body: string;
  action: string;
  offerId?: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    storeUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Store user ID is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    body: {
      type: String,
      required: [true, 'Body is required'],
      trim: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
    },
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      required: false,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast lookups by store user
NotificationSchema.index({ storeUserId: 1, createdAt: -1 });

const Notification =
  mongoose.models.StoreNotification ||
  mongoose.model<NotificationDocument>('StoreNotification', NotificationSchema);

export default Notification;
