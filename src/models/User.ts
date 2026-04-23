// import mongoose, { Schema, Document } from 'mongoose';

// export enum UserRole {
//   User = 'user',
//   SuperUser = 'superUser',
//   Admin = 'admin',
//   Developer = 'developer',
// }

// export interface UserDocument extends Document {
//   controllerId?: mongoose.Types.ObjectId;
//   username: string;
//   password: string;
//   role: UserRole;
//   blockCoding?: boolean;
//   peopleDetection?: boolean;
//   platform?: boolean;
// }

// const UserSchema: Schema = new Schema({
//   controllerId: {
//     type: mongoose.Schema.Types.ObjectId,
//     required: false
//   },
//   username: { 
//     type: String, 
//     required: [true, 'Username is required'],
//     unique: true, 
//     trim: true
//   },
//   password: { 
//     type: String, 
//     required: [true, 'Password is required']
//   },
//   blockCoding: { 
//     type: Boolean, 
//     default: false 
//   },
//   peopleDetection: { 
//     type: Boolean, 
//     default: false 
//   },
//   platform: { 
//     type: Boolean, 
//     default: false 
//   },
//   role: { 
//     type: String, 
//     enum: Object.values(UserRole), 
//     default: UserRole.User
//   }
// }, { 
//   timestamps: true 
// });



// const User = mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);

// export default User;



import mongoose, { Schema, Document } from 'mongoose';

export enum UserRole {
  User = 'user',
  SuperUser = 'superUser',
  Reseller = 'reseller',
  Admin = 'admin',
  Developer = 'developer',
  AccountAdmin = 'account_admin',
  AccountMarketing = 'account_marketing',
  Store = 'store',
}

export interface UserDocument extends Document {
  controllerId?: mongoose.Types.ObjectId;
  username: string;
  password: string;
  role: UserRole;
  blockCoding?: boolean;
  peopleDetection?: boolean;
  platform?: boolean;
  storeName?: string;
  storeLocation?: string;
  customerId?: mongoose.Types.ObjectId;
  operatorName?: string;
  phone?: string;
  email?: string;
  companyName?: string;
  location?: string;
  hasAllStoreAccess?: boolean;
  assignedStoreId?: mongoose.Types.ObjectId;
  mediaProvisioning?: boolean;
  provisionedFiles?: { name: string; url: string }[];
}

const UserSchema: Schema = new Schema({
  controllerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  username: { 
    type: String, 
    required: [true, 'Username is required'],
    unique: true, 
    trim: true
  },
  password: { 
    type: String, 
    required: [true, 'Password is required']
  },
  blockCoding: { 
    type: Boolean, 
    default: false 
  },
  peopleDetection: { 
    type: Boolean, 
    default: false 
  },
  platform: { 
    type: Boolean, 
    default: false 
  },
  storeName: {               // Added storeName field
    type: String,
    required: false
  },
  storeLocation: {
    type: String,
    required: false
  },
  operatorName: { type: String, required: false },
  phone: { type: String, required: false },
  email: { type: String, required: false },
  companyName: { type: String, required: false },
  location: { type: String, required: false },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: false
  },
  role: { 
    type: String, 
    enum: Object.values(UserRole), 
    default: UserRole.User
  },
  hasAllStoreAccess: {
    type: Boolean,
    default: false
  },
  assignedStoreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  mediaProvisioning: {
    type: Boolean,
    default: false
  },
  provisionedFiles: {
    type: [{ name: String, url: String }],
    default: []
  }
}, { 
  timestamps: true 
});

// Delete cached model to force re-registration with updated schema (needed for enum changes in dev)
if (mongoose.models.User) {
  delete (mongoose.models as any).User;
}
const User = mongoose.model<UserDocument>('User', UserSchema);

export default User;