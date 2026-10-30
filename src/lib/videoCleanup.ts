import { connectToDatabase } from '@/lib/db';
import MediaItemModel from '@/models/MediaItems';
import { existsSync } from 'fs';
import { unlink, rm } from 'fs/promises';
import { join } from 'path';

/**
 * Automatically purges unapproved promo videos that were created more than 30 days ago.
 * Deletes physical video files from disk and removes the documents from MongoDB.
 */
export async function cleanupExpiredUnapprovedVideos(daysCutoff: number = 30): Promise<{ deletedCount: number; errors: string[] }> {
  const result = { deletedCount: 0, errors: [] as string[] };
  try {
    await connectToDatabase();
    const cutoffDate = new Date(Date.now() - daysCutoff * 24 * 60 * 60 * 1000);

    // Find any promo video created more than 30 days ago whose approvalStatus is NOT approved or success
    const expiredItems = await MediaItemModel.find({
      type: 'video',
      approvalStatus: { $nin: ['approved', 'success'] },
      createdAt: { $lt: cutoffDate },
    }).lean();

    if (!expiredItems || expiredItems.length === 0) {
      return result;
    }

    console.log(`[videoCleanup] Found ${expiredItems.length} unapproved videos older than ${daysCutoff} days to purge.`);

    for (const item of expiredItems) {
      try {
        // 1. Delete physical video file on disk
        if (item.url) {
          const rawUrl = String(item.url).trim();
          const cleanPath = rawUrl.replace(/^https?:\/\/[^\/]+\//i, '').replace(/^\/+/, '');
          const fileName = cleanPath.split(/[/\\]/).pop() || '';
          const candidates = [
            join(process.cwd(), cleanPath),
            join(process.cwd(), 'uploads', 'rendered', fileName),
            join(process.cwd(), 'uploads', cleanPath.replace(/^uploads[\/\\]/, '')),
          ];

          for (const cand of candidates) {
            if (existsSync(cand)) {
              try {
                await unlink(cand);
                console.log(`[videoCleanup] Deleted physical file: ${cand}`);
              } catch (fErr: any) {
                console.warn(`[videoCleanup] Failed to unlink file ${cand}:`, fErr?.message);
              }
            }
          }
        }

        // 2. Clean up temp render dir for jobId if any
        if (item.jobId) {
          const jobTempDir = join(process.cwd(), 'uploads', 'temp', 'render_jobs', item.jobId);
          if (existsSync(jobTempDir)) {
            await rm(jobTempDir, { recursive: true, force: true }).catch(() => {});
          }
        }

        // 3. Delete document from MongoDB
        await MediaItemModel.deleteOne({ _id: item._id });
        result.deletedCount++;
      } catch (delErr: any) {
        result.errors.push(`Failed to delete item ${item._id}: ${delErr?.message}`);
      }
    }

    console.log(`[videoCleanup] Successfully cleaned up ${result.deletedCount} expired unapproved videos.`);
  } catch (err: any) {
    console.error('[videoCleanup] Error in cleanupExpiredUnapprovedVideos:', err);
    result.errors.push(err?.message || String(err));
  }

  return result;
}
