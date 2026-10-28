// test algorithm
function mergeAnnouncements(playlists: any[]) {
  // Step 1: Group by scheduleType, frequency, and daysOfWeek
  const groups = new Map<string, any[]>();
  for (const p of playlists) {
    const key = `${p.schedule.scheduleType}_${p.schedule.frequency || ''}_${(p.schedule.daysOfWeek || []).sort().join(',')}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  const result = [];
  
  for (const [key, group] of groups.entries()) {
    // 2D sweep (Dates and Times) is complex.
    // Let's do 1D Date Sweep first.
    let datePoints = new Set<string>();
    for (const p of group) {
      datePoints.add(p.schedule.startDate || "1970-01-01");
      datePoints.add(p.schedule.endDate || "2099-12-31");
    }
    const sortedDates = Array.from(datePoints).sort();

    // For each date segment, find active playlists
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const dStart = sortedDates[i];
      const dEnd = sortedDates[i+1];
      if (dStart === dEnd) continue;

      const activeInDate = group.filter(p => {
        const ps = p.schedule.startDate || "1970-01-01";
        const pe = p.schedule.endDate || "2099-12-31";
        // Check if date interval [ps, pe] overlaps [dStart, dEnd]
        // Actually, dEnd is the next event. The segment is [dStart, dEnd].
        // So an interval covers it if ps <= dStart and pe >= dStart (and effectively >= dEnd if it's the next point, wait, intervals are inclusive of endpoints in dates).
        // Let's just say if ps <= dStart and pe >= dEnd
        return ps <= dStart && pe >= dEnd;
      });

      if (activeInDate.length === 0) continue;

      // Now we have a set of playlists sharing exactly the same Date Range and DaysOfWeek.
      // We can do a 1D Time Sweep!
      let timePoints = new Set<string>();
      timePoints.add("00:00");
      timePoints.add("23:59");
      
      for (const p of activeInDate) {
        if (p.schedule.startTime) timePoints.add(p.schedule.startTime);
        if (p.schedule.endTime) timePoints.add(p.schedule.endTime);
      }
      
      const sortedTimes = Array.from(timePoints).sort();
      
      for (let j = 0; j < sortedTimes.length - 1; j++) {
        const tStart = sortedTimes[j];
        const tEnd = sortedTimes[j+1];
        if (tStart === tEnd) continue;
        
        const activeInTime = activeInDate.filter(p => {
          const ts = p.schedule.startTime || "00:00";
          const te = p.schedule.endTime || "23:59";
          return ts <= tStart && te >= tEnd;
        });

        if (activeInTime.length === 0) continue;

        // Combine files
        const combinedFiles: any[] = [];
        let order = 1;
        for (const p of activeInTime) {
          for (const f of p.announcements) {
            combinedFiles.push({ ...f, displayOrder: order++ });
          }
        }

        // Add to result
        result.push({
          id: `merged-${dStart}-${dEnd}-${tStart}-${tEnd}`,
          versionId: activeInTime[0].versionId, // Just take first
          name: activeInTime.map(p => p.name).join(' + '),
          schedule: {
            ...activeInTime[0].schedule,
            startDate: dStart === "1970-01-01" ? null : dStart,
            endDate: dEnd === "2099-12-31" ? null : dEnd,
            startTime: tStart,
            endTime: tEnd
          },
          announcements: combinedFiles
        });
      }
    }
  }
  
  return result;
}
