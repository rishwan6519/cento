import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IOfferType extends Document {
  userId?: any;
  categoryId?: string;
  offertypeId: string;
  offertypename: string;
  createdAt: Date;
  updatedAt: Date;
}

const offerTypeSchema = new Schema<IOfferType>({
  userId: {
    type: Schema.Types.Mixed,
    required: false,
    index: true,
  },
  categoryId: {
    type: String,
    required: false,
    trim: true,
    default: 'offer',
  },
  offertypeId: {
    type: String,
    required: [true, 'offertypeId is required'],
    unique: true,
    trim: true,
  },
  offertypename: {
    type: String,
    required: [true, 'offertypename is required'],
    trim: true,
  }
}, {
  timestamps: true
});

if (mongoose.models.OfferType) {
  delete (mongoose.models as any).OfferType;
}

const OfferType: Model<IOfferType> = mongoose.model<IOfferType>('OfferType', offerTypeSchema);

export default OfferType;
