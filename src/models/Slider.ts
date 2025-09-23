import mongoose, { Schema, Document } from "mongoose";

interface SliderItem {
  url: string;
  description: string;
}

export interface ISlider extends Document {
  userId: string;
  sliderName: string;        // New field for slider set name
  sliders: SliderItem[];     // Array of images + descriptions
  assignedDevices: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const SliderSchema = new Schema<ISlider>(
  {
    userId: { type: String, required: true, unique: true },
    sliderName: { type: String, required: true, default: "My Slider" }, // default name
    sliders: [
      {
        url: { type: String, required: true },
        description: { type: String, default: "" },
      },
    ],
    assignedDevices: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Device",
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.Slider ||
  mongoose.model<ISlider>("Slider", SliderSchema);
