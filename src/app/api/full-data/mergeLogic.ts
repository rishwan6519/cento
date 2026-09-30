export function mergeAnnouncements(playlists: any[]) {
  // Helper to add 1 day to YYYY-MM-DD
  function getNextDay(dateStr: string) {
    if (!dateStr || dateStr.startsWith('2099')) return "2099-12-31";
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  // Helper to subtract 1 day from YYYY-MM-DD
  function getPrevDay(dateStr: string) {
    if (!dateStr || dateStr.startsWith('1970')) return "1970-01-01";
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  const groups = new Map<string, any[]>();
  for (const p of playlists) {
    const key = `${p.schedule.scheduleType}_${p.schedule.frequency || ''}_${(p.schedule.daysOfWeek || []).sort().join(',')}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  const result: any[] = [];
  
  for (const group of groups.values()) {
    let datePoints = new Set<string>();
    for (const p of group) {
      datePoints.add(p.schedule.startDate || "1970-01-01");
      datePoints.add(getNextDay(p.schedule.endDate || "2099-12-31"));
    }
    const sortedDates = Array.from(datePoints).sort();

    for (let i = 0; i < sortedDates.length - 1; i++) {
      const dStart = sortedDates[i];
      const dEndNext = sortedDates[i+1];
      const dEnd = getPrevDay(dEndNext);

      if (dStart > dEnd) continue;

      const activeInDate = group.filter(p => {
        const ps = p.schedule.startDate || "1970-01-01";
        const pe = p.schedule.endDate || "2099-12-31";
        return ps <= dStart && pe >= dEnd;
      });

      if (activeInDate.length === 0) continue;

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

        const combinedFiles: any[] = [];
        let order = 1;
        for (const p of activeInTime) {
          for (const f of p.announcements) {
            combinedFiles.push({ ...f, displayOrder: order++ });
          }
        }

        const base = activeInTime[0];
        result.push({
          id: `merged-${Buffer.from(`${dStart}-${dEnd}-${tStart}-${tEnd}`).toString('hex').substring(0,8)}`,
          versionId: base.versionId,
          name: activeInTime.map(p => p.name).join(' + '),
          schedule: {
            ...base.schedule,
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
