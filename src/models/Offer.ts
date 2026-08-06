import mongoose, { Schema, Document } from 'mongoose';

export interface OfferDocument extends Document {
  storeUserId: mongoose.Types.ObjectId;
  offerId?: string;
  offerName: string;
  offerDescription: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OfferSchema: Schema = new Schema(
  {
    storeUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Store user ID is required'],
    },
    offerId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    offerName: {
      type: String,
      required: [true, 'Offer name is required'],
      trim: true,
    },
    offerDescription: {
      type: String,
      required: [true, 'Offer description is required'],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for duplicate active offer name check per store user
OfferSchema.index({ storeUserId: 1, offerName: 1 });

const Offer =
  mongoose.models.Offer || mongoose.model<OfferDocument>('Offer', OfferSchema);

export default Offer;
