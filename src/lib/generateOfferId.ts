import { connectToDatabase } from "@/lib/db";
import Offer from "@/models/Offer";
import VideoJobModel from "@/models/VideoJob";
import GoogleFlowJobModel from "@/models/GoogleFlowJob";
import MediaItemModel from "@/models/MediaItems";
import CloudbasesJobModel from "@/models/CloudbasesJob";

/**
 * Generates a unique 6-digit random number string (e.g. "482910")
 * and verifies it does not already exist across Offers, Video Jobs, Google Flow Jobs, Media Items, or Cloudbases Jobs.
 */
export async function generateUniqueOfferId(): Promise<string> {
  await connectToDatabase();

  const maxAttempts = 50;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate a random 6-digit number between 100000 and 999999
    const candidate = String(Math.floor(100000 + Math.random() * 900000));

    const [offerExists, videoJobExists, googleJobExists, mediaExists, cloudbasesExists] = await Promise.all([
      Offer.findOne({ offerId: candidate }).select("_id").lean().catch(() => null),
      VideoJobModel.findOne({ offerId: candidate }).select("_id").lean().catch(() => null),
      GoogleFlowJobModel.findOne({ offerId: candidate }).select("_id").lean().catch(() => null),
      MediaItemModel.findOne({ offerId: candidate }).select("_id").lean().catch(() => null),
      CloudbasesJobModel.findOne({ offerId: candidate }).select("_id").lean().catch(() => null),
    ]);

    if (!offerExists && !videoJobExists && !googleJobExists && !mediaExists && !cloudbasesExists) {
      return candidate;
    }
  }

  // Fallback if max attempts exceeded (extremely unlikely)
  return String(Math.floor(100000 + Math.random() * 900000));
}
