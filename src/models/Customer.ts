import mongoose, { Schema, Document } from 'mongoose';

export interface CustomerDocument extends Document {
  organizationName: string;
  contactName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  pinCode: string;
  city: string;
  resellerId?: mongoose.Types.ObjectId;
}

const CustomerSchema: Schema = new Schema({
  organizationName: { type: String, required: true },
  contactName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  addressLine1: { type: String, required: true },
  addressLine2: { type: String },
  pinCode: { type: String, required: true },
  city: { type: String, required: true },
  resellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { 
  timestamps: true 
});

const Customer = mongoose.models.Customer || mongoose.model<CustomerDocument>('Customer', CustomerSchema);

export default Customer;
