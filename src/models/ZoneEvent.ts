import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IZoneEvent {
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

export type IZoneEventDocument = IZoneEvent & Document;

const zoneEventSchema = new Schema<IZoneEvent>({
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
zoneEventSchema.index({ 'metadata.camera_id': 1, timestamp: -1 });

// Use specific collection name 'zone_events' to match existing data
export const ZoneEvent: Model<IZoneEvent> = mongoose.models.ZoneEvent || mongoose.model<IZoneEvent>('ZoneEvent', zoneEventSchema, 'zone_events');
