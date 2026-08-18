import { NextRequest, NextResponse } from 'next/server';
import { advancedPlaylistScheduleService } from '@/services/advancedPlaylistSchedule.service';
import { connectToDatabase } from '@/lib/db';
import PlaylistDistribution from '@/models/PlaylistDistribution';
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

    if (!serialNumber) {
      return NextResponse.json({ error: 'Serial number is required' }, { status: 400 });
    }

    // 1. Fetch the base timeline data from the original service
    const baseData = await advancedPlaylistScheduleService.getDailyTimelineForDevice(serialNumber, targetDate);
    
    if (!baseData) {
      return NextResponse.json({ error: 'Device not found or no schedule' }, { status: 404 });
    }

    const transformedTimeline = [];

    // 2. Iterate through each time slot and process distribution
    for (const slot of baseData.timeline) {
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

      // Check for distribution config for this device
      let distConfig: Record<string, number> | null = null;
      try {
        const distDoc = await PlaylistDistribution.findOne({ serialNumber: serialNumber }).lean() as any;
        if (distDoc && distDoc.distribution) {
          const distObj = distDoc.distribution instanceof Map
            ? Object.fromEntries(distDoc.distribution)
            : distDoc.distribution;
          if (Object.keys(distObj).length > 0) {
            distConfig = distObj;
          }
        }
      } catch { /* ignore */ }

      let unrolledMedias: any[] = [];
      let finalAllocatedPercentages: Record<string, number> = {};

      if (distConfig && slot.medias.length > 0 && slotDurationSec > 0) {
        // Group files by videoCategory
        const filesByCategory: Record<string, any[]> = {};
        for (const m of slot.medias) {
          const cat = (m.videoCategory || m.type || 'unknown').toLowerCase();
          if (!filesByCategory[cat]) filesByCategory[cat] = [];
          filesByCategory[cat].push(m);
        }

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
              
              generatedItems.push({ ...m, duration: dur });
              catElapsed += dur;
              
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
            unrolledMedias.push({ ...mediaItem });
            
            let dur = Number(mediaItem.duration) || 12;
            if (dur < 1) dur = 1; // Enforce minimum 1s duration
            accumulatedSec += dur;
            index++;
            
            // Safety breaks
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
        start: slot.start,
        end: slot.end,
        allocatedPercentages: Object.keys(finalAllocatedPercentages).length > 0 ? finalAllocatedPercentages : undefined,
        medias: unrolledMedias
      });
    }

    // 4. Return the new set exactly as requested
    return NextResponse.json({
      success: true,
      serverDate: baseData.serverDate,
      serverTime: baseData.serverTime,
      versionId: baseData.versionId,
      count: transformedTimeline.length,
      data: transformedTimeline
    }, { status: 200 });

  } catch (error) {
    console.error('Error in devices timeline route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
