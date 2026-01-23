import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettings {
  key: string;
  value: string;
}

export type ISettingsDocument = ISettings & Document;

const settingsSchema = new Schema<ISettings>({
  key: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: String,
    required: true
  }
});

export const Settings: Model<ISettings> = mongoose.models.Settings || mongoose.model<ISettings>('Settings', settingsSchema);
