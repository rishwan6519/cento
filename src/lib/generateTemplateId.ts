import { connectToDatabase } from '@/lib/db';
import VideoTemplate from '@/models/VideoTemplate';

/**
 * Generates a unique 5-digit template ID number (e.g. 14905, 58219).
 * Verifies that the candidate ID does not already exist across VideoTemplate documents.
 */
export async function generateUniqueTemplateId(): Promise<number> {
  await connectToDatabase();

  const maxAttempts = 100;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate a random 5-digit number between 10000 and 99999
    const candidate = Math.floor(10000 + Math.random() * 90000);
    const exists = await VideoTemplate.exists({ templateId: candidate });
    if (!exists) {
      return candidate;
    }
  }

  // Fallback sequential starting above highest 5-digit number
  const highest = await VideoTemplate.findOne({ templateId: { $gte: 10000 } })
    .sort({ templateId: -1 })
    .lean();
  return highest?.templateId ? Number(highest.templateId) + 1 : 10001;
}

export default generateUniqueTemplateId;
