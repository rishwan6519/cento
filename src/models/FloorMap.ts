
import mongoose from "mongoose";

const FloorMapSchema = new mongoose.Schema({
  name: { type: String, required: true },
  imageUrl: { type: String, required: true },
  userId: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.models.FloorMap || mongoose.model("FloorMap", FloorMapSchema);
