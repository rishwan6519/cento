import mongoose, { Schema, Document } from 'mongoose';

export enum UserRole {
  User = 'user',
  SuperUser = 'superUser',
  Admin = 'admin',
  Developer = 'developer',
}

export interface UserDocument extends Document {
  controllerId?: mongoose.Types.ObjectId;
  username: string;
  password: string;
  role: UserRole;
  blockCoding?: boolean;
  peopleDetection?: boolean;
  platform?: boolean;
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
  role: { 
    type: String, 
    enum: Object.values(UserRole), 
    default: UserRole.User
  }
}, { 
  timestamps: true 
});



const User = mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);

export default User;
