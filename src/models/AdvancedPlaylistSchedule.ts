import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IAdvancedPlaylistSchedule extends Document {
  playlistId: Types.ObjectId | any;
  deviceIds: (Types.ObjectId | any)[];
  userId?: Types.ObjectId | any;
  startDate: Date;
  endDate: Date;
  startTime: string;   // HH:mm format
  endTime: string;     // HH:mm format
  priority: number;    // optional priority flag (secondary tiebreaker after duration)
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const advancedPlaylistScheduleSchema = new Schema<IAdvancedPlaylistSchedule>(
  {
    playlistId: {
      type: Schema.Types.ObjectId,
      ref: 'PlaylistConfig',
      required: [true, 'Playlist ID is required'],
      index: true,
    },
    deviceIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Device',
        required: [true, 'At least one Device ID is required'],
      },
    ],
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    startDate: {
      type: Date,
      required: [true, 'Start Date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End Date is required'],
    },
    startTime: {
      type: String,
      required: [true, 'Start Time is required in HH:mm format'],
      trim: true,
    },
    endTime: {
      type: String,
      required: [true, 'End Time is required in HH:mm format'],
      trim: true,
    },
    priority: {
      type: Number,
      required: false,
      default: 0,
    },
    isActive: {
      type: Boolean,
      required: false,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast performance when devices request playback schedules
advancedPlaylistScheduleSchema.index({ deviceIds: 1, isActive: 1, startDate: 1, endDate: 1 });

// Clear cached model in development to cleanly pick up schema modifications
if (mongoose.models.AdvancedPlaylistSchedule) {
  delete (mongoose.models as any).AdvancedPlaylistSchedule;
}

const AdvancedPlaylistSchedule: Model<IAdvancedPlaylistSchedule> =
  mongoose.model<IAdvancedPlaylistSchedule>(
    'AdvancedPlaylistSchedule',
    advancedPlaylistScheduleSchema
  );

export default AdvancedPlaylistSchedule;
