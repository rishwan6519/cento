import mongoose, { Schema, Document } from 'mongoose';

export enum UserRole {
  User = 'user',
  SuperUser = 'superUser',
  Admin = 'admin',
}

export interface UserDocument extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: Object.values(UserRole), default: UserRole.User, required: true },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);

export default User;
