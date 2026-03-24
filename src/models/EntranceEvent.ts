import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEntranceEvent {
  metadata: {
    camera_id: string;
    zone_name: string;
    pi_id?: string;
  };
  action: 'Entered' | 'Exited';
  person_id: number;
  timestamp: Date;
  created_at: Date;
}

export type IEntranceEventDocument = IEntranceEvent & Document;

const entranceEventSchema = new Schema<IEntranceEvent>({
  metadata: {
    camera_id: {
      type: String,
      required: true
    },
    zone_name: {
      type: String,
      required: true
    },
    pi_id: {
      type: String,
      default: 'unknown'
    }
  },
  action: {
    type: String,
    required: true,
    enum: ['Entered', 'Exited']
  },
  person_id: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Create index for efficient querying by camera and timestamp
entranceEventSchema.index({ 'metadata.camera_id': 1, timestamp: -1 });

// Use specific collection name 'entrance_events'
export const EntranceEvent: Model<IEntranceEvent> = mongoose.models.EntranceEvent || mongoose.model<IEntranceEvent>('EntranceEvent', entranceEventSchema, 'entrance_events');
