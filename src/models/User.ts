import mongoose, { Schema, Document } from 'mongoose';

export enum UserRole {
  User = 'user',
  SuperUser = 'superUser',
  Admin = 'admin',
}

export interface UserDocument extends Document {
  controllerId?: mongoose.Types.ObjectId;
  username: string;
  password: string;
  role: UserRole;
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
