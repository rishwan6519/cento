import { NextRequest, NextResponse } from 'next/server';
import { advancedPlaylistScheduleService } from '@/services/advancedPlaylistSchedule.service';
import { connectToDatabase } from '@/lib/db';
import PlaylistDistribution from '@/models/PlaylistDistribution';
import TimeSlotDistribution from '@/models/TimeSlotDistribution';
import ManualTimelineOverride from '@/models/ManualTimelineOverride';
import mongoose from 'mongoose';

// Helper: Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const dynamic = 'force-dynamic';

const parseTimeToMinutes = (timeStr: string) => {
  const parts = timeStr.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
};

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const serialNumber = req.nextUrl.searchParams.get('serialNumber');
    const targetDate = req.nextUrl.searchParams.get('date') || undefined;
    const maxItemsParam = req.nextUrl.searchParams.get('maxItems');
    const isAppFormat = req.nextUrl.searchParams.get('format') === 'app';
    const MAX_ITEMS = maxItemsParam ? parseInt(maxItemsParam, 10) : Infinity;

    if (!serialNumber) {
      return NextResponse.json({ error: 'Serial number is required' }, { status: 400 });
    }

    const filterForApp = (timelineData: any[]) => {
      if (!isAppFormat) return timelineData;
      return timelineData.map(block => ({
        start: block.start,
        end: block.end,
        medias: (block.medias || block.media || []).map((m: any) => ({
          path: m.path,
          startTime: m.startTime,
          endTime: m.endTime
        }))
      }));
    };

    // CHECK FOR MANUAL OVERRIDE FIRST
    const overrideDateStr = targetDate || new Date().toLocaleString("en-US", { timeZone: "Australia/Melbourne" }).slice(0, 10);
    const existingOverride = await ManualTimelineOverride.findOne({ serialNumber, date: overrideDateStr });

    if (existingOverride) {
      console.log(`[devices/timeline] Serving MANUAL OVERRIDE for ${serialNumber} on ${overrideDateStr}`);
      return NextResponse.json({
        success: true,
        serverDate: overrideDateStr,
        serverTime: {
          australian: new Date().toLocaleTimeString('en-US', { timeZone: 'Australia/Melbourne', hour12: false }),
          timeZone: 'Australia/Melbourne',
          utcOffset: '+10:00'
        },
        versionId: existingOverride.versionId,
        count: existingOverride.data.length,
        data: filterForApp(existingOverride.data)
      }, { status: 200 });
    }

    // 1. Fetch the base timeline data from the original service
    const baseData = await advancedPlaylistScheduleService.getDailyTimelineForDevice(serialNumber, targetDate);

    if (!baseData) {
      return NextResponse.json({ error: 'Device not found or no schedule' }, { status: 404 });
    }

    const transformedTimeline = [];

    // 2. Iterate through each time slot and process distribution
    let blockIdx = 0;
    for (const slot of baseData.timeline) {
      // Increment at the end or use it directly
      const currentBlockIdx = blockIdx++;
      const startMins = parseTimeToMinutes(slot.start);
      let endMins = parseTimeToMinutes(slot.end);

      // Handle midnight crossover if any
      if (endMins <= startMins && slot.end === '00:00') {
        endMins += 24 * 60;
      } else if (endMins < startMins) {
        endMins += 24 * 60;
      }

      let slotDurationSec = (endMins - startMins) * 60;
      if (slot.end === '23:59') {
        slotDurationSec += 60; // Include the final minute fully
      }

      // Pre-calculate true durations for all medias in this slot
      for (const media of slot.medias) {
        if (!media.duration || media.duration <= 0) {
          media.duration = 12; // fallback to 12s if missing
        }
      }

      // Check for distribution config for this specific time slot
      let distConfig: Record<string, number> | null = null;
      try {
        const slotDistDoc = await TimeSlotDistribution.findOne({ serialNumber, start: slot.start, end: slot.end }).lean() as any;
        
        let distDocToUse = slotDistDoc;
        
        if (!distDocToUse) {
           // Fallback to global distribution
           distDocToUse = await PlaylistDistribution.findOne({ serialNumber }).lean() as any;
        }
        
        if (distDocToUse && distDocToUse.distribution) {
          const distObj = distDocToUse.distribution instanceof Map
            ? Object.fromEntries(distDocToUse.distribution)
            : distDocToUse.distribution;
          if (Object.keys(distObj).length > 0) {
            distConfig = distObj;
          }
        }
      } catch (e) {
        console.error('[devices/timeline] error fetching distribution', e);
      }
      
      let finalAllocatedPercentages: Record<string, number> = {};
      let unrolledMedias: any[] = [];
      const filesByCategory: Record<string, any[]> = {};
      
      for (const m of slot.medias) {
        const cat = (m.videoCategory || 'uncategorized').toLowerCase();
        if (!filesByCategory[cat]) filesByCategory[cat] = [];
        filesByCategory[cat].push(m);
      }

      if (distConfig && slot.medias.length > 0 && slotDurationSec > 0) {
        // --- REQUIREMENT 1: Handle Missing Categories ---

        // --- REQUIREMENT 1: Handle Missing Categories ---
        const validCategories = Object.keys(distConfig).filter(cat => filesByCategory[cat] && filesByCategory[cat].length > 0);
        let activeDistConfig: Record<string, number> = {};

        if (validCategories.length > 0) {
          let missingPct = 0;
          for (const [cat, pct] of Object.entries(distConfig)) {
            const numPct = Number(pct);
            if (!validCategories.includes(cat)) {
              missingPct += numPct;
            } else {
              activeDistConfig[cat] = numPct;
            }
          }
          if (missingPct > 0) {
            const split = missingPct / validCategories.length;
            for (const cat of validCategories) {
              activeDistConfig[cat] += split;
            }
          }
        }

        if (Object.keys(activeDistConfig).length > 0) {
          const allGeneratedItems: any[] = [];

          // Distribute slot duration among categories based on active DEVICE config
          for (const [type, fractionPct] of Object.entries(activeDistConfig)) {
            const catFiles = filesByCategory[type];
            finalAllocatedPercentages[type] = fractionPct;

            const allocatedSeconds = Math.floor(slotDurationSec * (fractionPct / 100));
            let catElapsed = 0;
            const generatedItems: any[] = [];

            // Random bag logic for selecting videos within this category
            let currentBag = shuffleArray(catFiles);

            while (catElapsed < allocatedSeconds) {
              if (currentBag.length === 0) {
                currentBag = shuffleArray(catFiles);
              }
              const m = currentBag.pop();
              let dur = Number(m.duration) || 12;
              if (dur < 1) dur = 1; // Enforce minimum 1s duration

              // Adjust duration if it exceeds remaining allocated time
              const remaining = allocatedSeconds - catElapsed;
              if (dur > remaining) dur = remaining;

              if (dur <= 0) break;

              const cleanM = {
                 fileId: typeof m.fileId === 'object' && m.fileId !== null ? (m.fileId._id?.toString() || m.fileId.toString()) : m.fileId,
                 name: m.name,
                 path: m.path,
                 type: m.type,
                 shuffle: m.shuffle || false,
                 displayOrder: m.displayOrder || 0,
                 delay: m.delay || 0,
                 maxVolume: m.maxVolume || 100,
                 minVolume: m.minVolume || 0,
                 backgroundImageEnabled: m.backgroundImageEnabled || false,
                 backgroundImage: m.backgroundImage || null,
                 _id: m._id ? m._id.toString() : undefined,
                 url: m.url || m.path,
                 fileCategory: m.fileCategory,
                 videoCategory: m.videoCategory,
                 duration: dur
              };

              generatedItems.push(cleanM);
              catElapsed += dur;

              if (generatedItems.length >= MAX_ITEMS) {
                 break;
              }
              if (generatedItems.length > 5000) {
                console.warn('[devices/timeline] Hard cap of 5000 items reached for category', type);
                break;
              }
            }

            allGeneratedItems.push(...generatedItems);
          }

          // True random shuffle of the entire generated timeline (Professional Random Mix)
          unrolledMedias = shuffleArray(allGeneratedItems);
        }
      }

      if (unrolledMedias.length === 0) {
        // Fallback to strict sequential repeating loop if no config or config was totally invalid
        let accumulatedSec = 0;
        let index = 0;

        if (slot.medias.length > 0 && slotDurationSec > 0) {
          while (accumulatedSec < slotDurationSec) {
            const mediaItem = slot.medias[index % slot.medias.length];

            let dur = Number(mediaItem.duration) || 12;
            if (dur < 1) dur = 1; // Enforce minimum 1s duration

            const cleanMedia = {
                 fileId: typeof mediaItem.fileId === 'object' && mediaItem.fileId !== null ? (mediaItem.fileId._id?.toString() || mediaItem.fileId.toString()) : mediaItem.fileId,
                 name: mediaItem.name,
                 path: mediaItem.path,
                 type: mediaItem.type,
                 shuffle: mediaItem.shuffle || false,
                 displayOrder: mediaItem.displayOrder || 0,
                 delay: mediaItem.delay || 0,
                 maxVolume: mediaItem.maxVolume || 100,
                 minVolume: mediaItem.minVolume || 0,
                 backgroundImageEnabled: mediaItem.backgroundImageEnabled || false,
                 backgroundImage: mediaItem.backgroundImage || null,
                 _id: mediaItem._id ? mediaItem._id.toString() : undefined,
                 url: mediaItem.url || mediaItem.path,
                 fileCategory: mediaItem.fileCategory,
                 videoCategory: mediaItem.videoCategory,
                 duration: dur
            };

            unrolledMedias.push(cleanMedia);

            accumulatedSec += dur;
            index++;

            // Safety breaks
            if (unrolledMedias.length >= MAX_ITEMS) {
               break;
            }
            if (unrolledMedias.length > 5000) {
              console.warn('[devices/timeline] Hard cap of 5000 items reached in fallback loop');
              break;
            }
            if (dur <= 0 && index > slot.medias.length * 2) {
              console.warn('[devices/timeline] Infinite loop protection hit.');
              break;
            }
          }
        }
      }

      // --- REQUIREMENT 3: Calculate start and end times for each item ---
      const addSecondsToTime = (timeStr: string, secondsToAdd: number): string => {
        const parts = timeStr.split(':');
        let h = parseInt(parts[0] || '0', 10);
        let m = parseInt(parts[1] || '0', 10);
        let s = parseInt(parts[2] || '0', 10);

        s += secondsToAdd;
        m += Math.floor(s / 60);
        s = s % 60;
        h += Math.floor(m / 60);
        m = m % 60;

        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(h)}:${pad(m)}:${pad(s)}`;
      };

      let currentStartTime = slot.start.length === 5 ? `${slot.start}:00` : slot.start;
      for (const item of unrolledMedias) {
        item.startTime = currentStartTime;
        currentStartTime = addSecondsToTime(currentStartTime, Number(item.duration) || 12);
        item.endTime = currentStartTime;
      }

      transformedTimeline.push({
        originalIndex: currentBlockIdx,
        start: slot.start,
        end: slot.end,
        durationSeconds: slotDurationSec,
        playlistName: slot.playlist?.name,
        isGap: false,
        allocatedPercentages: Object.keys(finalAllocatedPercentages).length > 0 ? finalAllocatedPercentages : undefined,
        medias: unrolledMedias,
        availableCategories: Object.keys(filesByCategory || {})
      });
    }

    // 4. Return the new set exactly as requested
    return NextResponse.json({
      success: true,
      serverDate: baseData.serverDate,
      serverTime: baseData.serverTime,
      versionId: baseData.versionId,
      count: transformedTimeline.length,
      data: filterForApp(transformedTimeline)
    }, { status: 200 });

  } catch (error) {
    console.error('Error in devices timeline route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
