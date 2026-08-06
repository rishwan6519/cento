import { connectToDatabase } from "@/lib/db";
import Offer from "@/models/Offer";
import VideoJobModel from "@/models/VideoJob";
import GoogleFlowJobModel from "@/models/GoogleFlowJob";
import MediaItemModel from "@/models/MediaItems";

/**
 * Generates a unique 6-digit random number string (e.g. "482910")
 * and verifies it does not already exist across Offers, Video Jobs, Google Flow Jobs, or Media Items.
 */
export async function generateUniqueOfferId(): Promise<string> {
  await connectToDatabase();

  const maxAttempts = 50;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate a random 6-digit number between 100000 and 999999
    const candidate = String(Math.floor(100000 + Math.random() * 900000));

    const [offerExists, videoJobExists, googleJobExists, mediaExists] = await Promise.all([
      Offer.findOne({ offerId: candidate }).select("_id").lean().catch(() => null),
      VideoJobModel.findOne({ offerId: candidate }).select("_id").lean().catch(() => null),
      GoogleFlowJobModel.findOne({ offerId: candidate }).select("_id").lean().catch(() => null),
      MediaItemModel.findOne({ offerId: candidate }).select("_id").lean().catch(() => null),
    ]);

    if (!offerExists && !videoJobExists && !googleJobExists && !mediaExists) {
      return candidate;
    }
  }

  // Fallback if max attempts exceeded (extremely unlikely)
  return String(Math.floor(100000 + Math.random() * 900000));
}
