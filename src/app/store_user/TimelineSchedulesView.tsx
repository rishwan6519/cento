"use client";

import React, { useState, useEffect } from "react";
import { FaClock, FaCalendarAlt, FaTv, FaChevronRight, FaPlay, FaImage, FaVolumeUp, FaTimes } from "react-icons/fa";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface MediaInstance {
  id: string;
  name: string;
  url: string;
  type: string;
  durationSeconds: number;
  startTime: string;
  endTime: string;
  videoCategory?: string;
}

interface TimelineWindow {
  start: string;
  end: string;
  durationSeconds: number;
  playlistName: string;
  playlistId: string;
  scheduleId: string;
  media: MediaInstance[];
}

interface TimelineData {
  date: string;
  versionId: string;
  data: TimelineWindow[]; // Backend uses "data", not "windows"
}

interface DeviceOption {
  id: string;
  name: string;
  sn: string;
}

export default function TimelineSchedulesView() {
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [selectedDeviceSn, setSelectedDeviceSn] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [isToday, setIsToday] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<Record<number, boolean>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [visibleLimits, setVisibleLimits] = useState<Record<number, number>>({});
  const [distModal, setDistModal] = useState<{
    open: boolean;
    slotIdx: number | null;
    start: string;
    end: string;
    categories: string[];
    percentages: Record<string, number>;
  }>({ open: false, slotIdx: null, start: "", end: "", categories: [], percentages: {} });
  const [selectedMedia, setSelectedMedia] = useState<MediaInstance | null>(null);
  const [expandedSlots, setExpandedSlots] = useState<Record<number, boolean>>({});
  const [editedQueues, setEditedQueues] = useState<Record<number, MediaInstance[]>>({});
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  // Initialize date to today (Melbourne time)
  useEffect(() => {
    const melbourneToday = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Australia/Melbourne" })
    );
    const dateStr = melbourneToday.toISOString().slice(0, 10);
    setSelectedDate(dateStr);
  }, []);

  // Fetch store user devices
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    const fetchDevices = async () => {
      try {
        const res = await fetch(`/api/assign-device?userId=${userId}`);
        const data = await res.json();
        if (data?.success && Array.isArray(data.data)) {
          const mapped: DeviceOption[] = data.data.map((a: any) => ({
            id: a.deviceId?._id || a._id,
            name: a.deviceId?.name || "Unknown Device",
            sn: a.deviceId?.serialNumber || "N/A"
          })).filter((d: any) => d.sn !== "N/A");

          setDevices(mapped);
          if (mapped.length > 0) {
            setSelectedDeviceSn(mapped[0].sn);
          }
        }
      } catch (err) {
        console.error("Error fetching devices:", err);
      }
    };

    fetchDevices();
  }, []);

  useEffect(() => {
    const updateTime = () => {
      // Get current time in Australia/Melbourne
      const d = new Date();
      const melbourneTimeStr = d.toLocaleTimeString("en-US", { timeZone: "Australia/Melbourne", hour12: false });
      const [h, m, s] = melbourneTimeStr.split(":").map(Number);
      setCurrentTimeSec((h || 0) * 3600 + (m || 0) * 60 + (s || 0));
      
      const melbourneDate = new Date(
        d.toLocaleString("en-US", { timeZone: "Australia/Melbourne" })
      );
      const melbourneDateStr = melbourneDate.toISOString().slice(0, 10);
      setIsToday(selectedDate === melbourneDateStr);
    };

    updateTime(); // Initial update
    const interval = setInterval(updateTime, 1000); // Tick every second

    return () => clearInterval(interval);
  }, [selectedDate]);

  const getItemStatus = (med: MediaInstance) => {
    if (!isToday) return "FUTURE";
    const start = parseTimeToSeconds(med.startTime);
    const end = parseTimeToSeconds(med.endTime);
    if (currentTimeSec > end) return "PAST";
    if (currentTimeSec >= start && currentTimeSec <= end) return "CURRENT";
    return "FUTURE";
  };

  // Fetch timeline data when device or date changes
  useEffect(() => {
    if (!selectedDeviceSn || !selectedDate) return;

    const fetchTimeline = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/devices/timeline?serialNumber=${selectedDeviceSn}&date=${selectedDate}`);
        const data = await res.json();
        if (res.ok) {
          setTimeline(data);
          const initialQueues: Record<number, MediaInstance[]> = {};
          if (data.data) {
             data.data.forEach((slot: any, idx: number) => {
                initialQueues[idx] = (slot.medias || slot.media || []).map((m: any) => ({
                   id: m._id || m.fileId,
                   name: m.name,
                   url: m.url || m.path,
                   type: m.type || m.videoCategory || 'unknown',
                   videoCategory: m.videoCategory || 'other',
                   durationSeconds: m.duration || 12,
                   startTime: m.startTime,
                   endTime: m.endTime
                }));
             });
          }
          setEditedQueues(initialQueues);
          setExpandedSlots({ 0: true });
        } else {
          setError(data.error || "Failed to load timeline");
        }
      } catch (err) {
        setError("Network error fetching timeline");
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [selectedDeviceSn, selectedDate]);

  const handleOpenDistModal = (block: any) => {
    const queue = editedQueues[block.originalIndex] || [];
    const catSet = new Set<string>();
    
    // 1. Pull all possible categories available on the device for this slot (provided by backend)
    if (block.availableCategories && block.availableCategories.length > 0) {
      block.availableCategories.forEach((cat: string) => catSet.add(cat));
    } else {
      // Fallback if backend doesn't provide it
      queue.forEach(med => {
        const vCat = (med as any).videoCategory;
        if (vCat) {
          catSet.add(vCat.toLowerCase());
        } else {
          catSet.add('uncategorized');
        }
      });
    }

    // 2. Also ensure any already-configured categories are visible, even if they have 0 files right now
    const existingPcts = block.allocatedPercentages || {};
    Object.keys(existingPcts).forEach(cat => catSet.add(cat));
    
    const categories = Array.from(catSet);
    const percentages: Record<string, number> = {};
    
    if (Object.keys(existingPcts).length > 0) {
      categories.forEach(cat => percentages[cat] = existingPcts[cat] || 0);
    } else {
      const split = Math.floor((100 / (categories.length || 1)) * 100) / 100;
      categories.forEach(cat => percentages[cat] = split);
    }
    
    setDistModal({
      open: true,
      slotIdx: block.originalIndex,
      start: block.start,
      end: block.end,
      categories,
      percentages
    });
  };

  const handlePercentageChange = (cat: string, value: number) => {
    let newVal = value;
    if (newVal < 0) newVal = 0;
    if (newVal > 100) newVal = 100;
    
    const newPcts = { ...distModal.percentages, [cat]: newVal };
    const otherCats = distModal.categories.filter(c => c !== cat);
    
    if (otherCats.length > 0) {
      const remaining = 100 - newVal;
      const split = Math.floor((remaining / otherCats.length) * 100) / 100;
      otherCats.forEach(c => newPcts[c] = split);
    }
    
    setDistModal({ ...distModal, percentages: newPcts });
  };

  const handleSaveDistribution = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/devices/timeline/distribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serialNumber: selectedDeviceSn,
          date: selectedDate,
          start: distModal.start,
          end: distModal.end,
          distribution: distModal.percentages
        })
      });
      
      const resData = await res.json();
      if (res.ok) {
        alert("Distribution saved successfully! The timeline for this day will now regenerate.");
        setDistModal({ ...distModal, open: false });
        setTimeline(null);
        setTimeout(() => {
           window.location.reload();
        }, 500);
      } else {
        alert("Failed to save distribution: " + (resData.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Network error while saving distribution");
    } finally {
      setIsSaving(false);
    }
  };

  const parseTimeToSeconds = (timeStr: string): number => {
    const [h, m] = timeStr.split(":").map(Number);
    return (h || 0) * 3600 + (m || 0) * 60;
  };

  const handleSaveTimeline = async () => {
    setIsSaving(true);
    try {
      const fullDataPayload = timeline?.data.map((win: any, idx: number) => ({
           ...win,
           medias: editedQueues[idx] || win.medias || win.media || []
      }));
      const res = await fetch('/api/devices/timeline/override', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           serialNumber: selectedDeviceSn,
           date: selectedDate,
           data: fullDataPayload
         })
      });
      const resData = await res.json();
      if (res.ok) {
        alert(`Queue overrides saved successfully!`);
        setTimeline({ ...timeline, versionId: resData.versionId } as any);
      } else {
        alert(`Failed to save: ${resData.error || "Unknown error"}`);
      }
    } catch (err) {
      alert("Network error while saving timeline.");
    } finally {
      setIsSaving(false);
    }
  };

  const getTimelineBlocks = () => {
    if (!timeline || !timeline.data) return [];
    
    const blocks: any[] = [];
    let currentSeconds = 0; 

    timeline.data.forEach((win: any, idx: number) => {
      const winStartSeconds = parseTimeToSeconds(win.start);
      
      if (winStartSeconds > currentSeconds) {
        blocks.push({
          isGap: true,
          originalIndex: -1,
          start: formatSecondsToTime(currentSeconds),
          end: win.start,
          durationSeconds: winStartSeconds - currentSeconds
        });
      }

      blocks.push({
        ...win,
        isGap: false,
        originalIndex: idx
      });

      currentSeconds = parseTimeToSeconds(win.end);
    });

    const midnightSeconds = 24 * 3600;
    if (currentSeconds < midnightSeconds) {
      blocks.push({
        isGap: true,
        originalIndex: -1,
        start: formatSecondsToTime(currentSeconds),
        end: "24:00",
        durationSeconds: midnightSeconds - currentSeconds
      });
    }

    return blocks;
  };

  const onDragEnd = (result: any, slotIdx: number) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    if (sourceIndex === destinationIndex) return;
    
    const block = getTimelineBlocks().find(b => b.originalIndex === slotIdx);
    const queue = editedQueues[slotIdx] || [];
    
    // Protect the currently playing item from being dragged or displaced
    const upcomingItems = queue.filter(med => getItemStatus(med) !== "PAST");
    if (upcomingItems.length > 0 && getItemStatus(upcomingItems[0]) === "CURRENT") {
      if (sourceIndex === 0 || destinationIndex === 0) {
         // Reject drag if trying to drag the CURRENT item or drop above it
         return;
      }
    }

    const pastCount = queue.length - upcomingItems.length;
    const actualSourceIndex = sourceIndex + pastCount;
    const actualDestIndex = destinationIndex + pastCount;
    
    const newQueue = Array.from(queue);
    const [reorderedItem] = newQueue.splice(actualSourceIndex, 1);
    newQueue.splice(actualDestIndex, 0, reorderedItem);

    // Recalculate start and end times for the entire queue
    const addSeconds = (timeStr: string, secondsToAdd: number): string => {
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

    let currentStartTime = block?.start.length === 5 ? `${block.start}:00` : (block?.start || '00:00:00');
    for (const item of newQueue) {
      item.startTime = currentStartTime;
      currentStartTime = addSeconds(currentStartTime, item.durationSeconds || 12);
      item.endTime = currentStartTime;
    }

    setEditedQueues({ ...editedQueues, [slotIdx]: newQueue });
  };

  const formatSecondsToTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  const formatDuration = (totalSeconds: number) => {
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
  };

  const loadMoreItems = (idx: number) => {
      setVisibleLimits(prev => ({...prev, [idx]: (prev[idx] || 50) + 50}));
  };

  return (
    <div className="timeline-schedules-view">
      <style>{`
        .tsv-container { background: #ffffff; border-radius: 20px; padding: 28px; box-shadow: 0 10px 30px rgba(11, 40, 48, 0.04); border: 1px dashed #d6e6e9; }
        .tsv-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px dashed #eaf2f3; }
        .tsv-title-wrap h2 { font-size: 1.5rem; font-weight: 800; color: #0b2830; display: flex; align-items: center; gap: 10px; }
        .tsv-title-wrap p { font-size: 0.85rem; color: #64848d; margin-top: 4px; }
        .tsv-controls { display: flex; gap: 16px; }
        .tsv-control-group { display: flex; flex-direction: column; gap: 6px; }
        .tsv-control-group label { font-size: 0.72rem; font-weight: 700; color: #8cabb3; text-transform: uppercase; letter-spacing: 0.05em; }
        .tsv-select, .tsv-input { background: #f8fafb; border: 1px solid #eaeef0; border-radius: 10px; padding: 10px 16px; font-size: 0.88rem; color: #162b30; font-weight: 600; outline: none; min-width: 180px; cursor: pointer; transition: all 0.2s ease; }
        .tsv-select:focus, .tsv-input:focus { border-color: #11b5bb; background: #ffffff; box-shadow: 0 0 0 3px rgba(17, 181, 187, 0.1); }
        .tsv-version-badge { display: inline-flex; align-items: center; gap: 6px; background: #e6f7f8; color: #11b5bb; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; margin-bottom: 20px; border: 1px solid rgba(17, 181, 187, 0.2); }
        .tsv-timeline-list { display: flex; flex-direction: column; gap: 24px; position: relative; padding-left: 20px; }
        .tsv-timeline-list::before { content: ""; position: absolute; left: 6px; top: 8px; bottom: 8px; width: 2px; background: repeating-linear-gradient(to bottom, #cbd5e1, #cbd5e1 4px, transparent 4px, transparent 8px); }
        .tsv-block { position: relative; }
        .tsv-block-marker { position: absolute; left: -20px; top: 18px; width: 14px; height: 14px; border-radius: 50%; background: #ffffff; border: 3px solid #11b5bb; z-index: 2; }
        .tsv-block--gap .tsv-block-marker { border-color: #cbd5e1; }
        .tsv-block-card { background: #ffffff; border-radius: 16px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.01); transition: all 0.2s ease; }
        .tsv-block-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
        .tsv-block-time { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; font-weight: 750; color: #0b2830; }
        .tsv-block-info { text-align: right; }
        .tsv-playlist-name { font-size: 1.05rem; font-weight: 700; color: #0b2830; }
        .tsv-block-duration { font-size: 0.75rem; color: #64848d; font-weight: 500; margin-top: 2px; }
        .tsv-accordion-content { margin-top: 16px; border-top: 1px dashed #e2e8f0; padding-top: 16px; display: flex; flex-direction: column; gap: 10px; }
        .tsv-history-btn { width: 100%; padding: 10px; background: #f8fafb; color: #64848d; font-weight: 700; font-size: 0.8rem; border: 1px solid #eaeef0; border-radius: 12px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .tsv-edit-dist-btn { background: #f8fafb; color: #11b5bb; border: 1px solid #c8e7e8; padding: 6px 12px; border-radius: 8px; font-weight: 700; font-size: 0.75rem; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px; }
        .tsv-edit-dist-btn:hover { background: #11b5bb; color: white; }
        .tsv-media-list-item { display: flex; align-items: center; gap: 16px; background: #f8fafb; border: 1px solid #eaeef0; border-radius: 12px; padding: 12px 16px; }
        .tsv-media-list-item--current { border: 2px solid #11b5bb; background: #f0fdfd; }
        .tsv-media-list-item--past { background: #f1f5f9; border-color: #e2e8f0; }
        .tsv-status-badge { font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-left: 8px; }
        .tsv-status-badge--past { background: #cbd5e1; color: #475569; }
        .tsv-status-badge--current { background: #11b5bb; color: white; }
        .tsv-media-drag-handle { color: #94a3b8; display: flex; align-items: center; cursor: grab; }
        .tsv-media-list-item__icon { width: 40px; height: 40px; border-radius: 8px; background: #e2e8f0; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 1.2rem; flex-shrink: 0; }
        .tsv-media-list-item__details { flex: 1; min-width: 0; }
        .tsv-media-list-item__time { font-size: 0.75rem; color: #64848d; font-weight: 500; margin-top: 4px; }
        .tsv-media-list-item__duration { background: #e2e8f0; color: #475569; font-size: 0.75rem; font-weight: 700; padding: 4px 8px; border-radius: 6px; flex-shrink: 0; }
        .tsv-accordion-toggle { background: rgba(17, 181, 187, 0.1); border: none; color: #11b5bb; font-size: 0.85rem; font-weight: 700; cursor: pointer; padding: 8px 12px; border-radius: 8px; }
        .tsv-modal-overlay { position: fixed; inset: 0; background: rgba(11, 40, 48, 0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .tsv-load-more-btn { background: #f8fafb; border: 1px solid #e2e8f0; padding: 10px; width: 100%; border-radius: 8px; font-weight: 700; color: #64748b; cursor: pointer; }
      `}</style>

      <div className="tsv-container">
        <div className="tsv-header">
          <div className="tsv-title-wrap">
            <h2><FaClock style={{ color: "#11b5bb" }} /> Timelines / Schedules</h2>
            <p>View the continuous daily playback schedule timeline for store devices.</p>
          </div>
          <div className="tsv-controls">
            <div className="tsv-control-group">
              <label>Select Device</label>
              <select className="tsv-select" value={selectedDeviceSn} onChange={(e) => setSelectedDeviceSn(e.target.value)}>
                {devices.map((dev) => <option key={dev.id} value={dev.sn}>{dev.name} ({dev.sn})</option>)}
              </select>
            </div>
            <div className="tsv-control-group">
              <label>Target Date</label>
              <input type="date" className="tsv-input" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
          </div>
        </div>

        {loading && <div className="tsv-loading">Generating full-day timeline...</div>}
        {error && <div className="tsv-error">{error}</div>}

        {!loading && !error && timeline && (
          <>
            <div className="flex justify-between items-center mb-5">
              <div className="tsv-version-badge !mb-0">
                <FaTv />
                <span>Timeline version ID: {timeline.versionId}</span>
              </div>
              
              <button 
                className="tsv-save-btn" 
                onClick={handleSaveTimeline}
                disabled={isSaving || getTimelineBlocks().length === 0}
              >
                {isSaving ? "Saving..." : "Save Overrides to Device"}
              </button>
            </div>

            {getTimelineBlocks().length === 0 ? (
              <div className="tsv-empty">
                <FaCalendarAlt size={36} className="mb-3 text-slate-300 mx-auto" />
                <p className="font-semibold">No playback schedules configured for this day.</p>
              </div>
            ) : (
              <div className="tsv-timeline-list">
                {getTimelineBlocks().map((block: any, idx: number) => {
                  if (block.isGap) {
                    return (
                      <div key={`gap-${idx}`} className="tsv-block tsv-block--gap">
                        <div className="tsv-block-marker" />
                        <div className="tsv-block-card">
                          <div className="tsv-block-header">
                            <div className="tsv-block-time">
                              <FaClock style={{ color: "#94a3b8" }} />
                              <span>{block.start} ─── {block.end}</span>
                            </div>
                            <span className="tsv-block-duration">
                              Duration: {formatDuration(block.durationSeconds)}
                            </span>
                          </div>
                          <div className="tsv-playlist-name text-slate-400">Schedule Gap</div>
                          <p className="tsv-gap-message">
                            No schedules active. Screen will play default fallback or go offline.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={`win-${idx}`} className="tsv-block">
                      <div className="tsv-block-marker" />
                      <div className="tsv-block-card">
                        <div className="tsv-block-header">
                          <div className="tsv-block-time">
                            <FaClock style={{ color: "#11b5bb" }} />
                            <span>{block.start} ─── {block.end}</span>
                          </div>
                          <div className="tsv-block-info">
                            <div className="tsv-playlist-name">{block.playlistName || 'Scheduled Timeline Slot'}</div>
                            <span className="tsv-block-duration block mb-3">
                              Total duration: {formatDuration(block.durationSeconds)}
                            </span>
                            <div className="flex justify-end gap-2">
                              <button 
                                className="tsv-edit-dist-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDistModal(block);
                                }}
                              >
                                ⚙️ Edit Distribution
                              </button>
                              <button 
                                 className="tsv-accordion-toggle"
                                 onClick={() => setExpandedSlots({...expandedSlots, [block.originalIndex]: !expandedSlots[block.originalIndex]})}
                              >
                                 {expandedSlots[block.originalIndex] ? 'Collapse Queue ▲' : 'Edit Timeline Queue ▼'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Accordion Vertical Media List with Drag and Drop */}
                        {expandedSlots[block.originalIndex] && (
                          <div className="tsv-accordion-content">
                            <div className="text-xs font-bold text-slate-400 uppercase mb-2">Drag to reorder playlist queue</div>
                            
                            {(() => {
                               const queue = editedQueues[block.originalIndex] || [];
                               const pastItems = queue.filter(med => getItemStatus(med) === "PAST");
                               const upcomingItems = queue.filter(med => getItemStatus(med) !== "PAST");
                               
                               return (
                                 <>
                                   {/* Played History Section */}
                                   {pastItems.length > 0 && (
                                     <div className="mb-4">
                                       <button 
                                          className="tsv-history-btn"
                                          onClick={() => setShowHistory({...showHistory, [block.originalIndex]: !showHistory[block.originalIndex]})}
                                       >
                                          <FaClock />
                                          {showHistory[block.originalIndex] ? 'Hide' : 'Show'} Played History ({pastItems.length} items)
                                       </button>
                                       
                                       {showHistory[block.originalIndex] && (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                                            {pastItems.map((med: MediaInstance, mIdx: number) => (
                                              <div key={`${med.id}-past-${mIdx}`} className="tsv-media-list-item tsv-media-list-item--past cursor-not-allowed">
                                                <div className="tsv-media-drag-handle" style={{ opacity: 0.3 }}>
                                                   <div style={{display: 'flex', flexDirection: 'column', gap: '3px'}}>
                                                      <div style={{width: '20px', height: '2px', background: '#cbd5e1'}}/>
                                                      <div style={{width: '20px', height: '2px', background: '#cbd5e1'}}/>
                                                      <div style={{width: '20px', height: '2px', background: '#cbd5e1'}}/>
                                                   </div>
                                                </div>
                                                <div className="tsv-media-list-item__icon">
                                                  {med.type.startsWith("image") ? <FaImage /> : <FaPlay />}
                                                </div>
                                                <div className="tsv-media-list-item__details" style={{ overflow: 'hidden' }}>
                                                  <div className="tsv-media-list-item__name text-sm font-bold text-slate-800 truncate" title={med.name}>
                                                    {med.name}
                                                  </div>
                                                  <div className="tsv-media-list-item__time">
                                                    <span>#{mIdx + 1} | {med.startTime} - {med.endTime}</span>
                                                    <span className="tsv-status-badge tsv-status-badge--past">Played</span>
                                                  </div>
                                                </div>
                                                <div className="tsv-media-list-item__duration">
                                                  {med.durationSeconds}s
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                       )}
                                     </div>
                                   )}
                                   
                                   {/* Upcoming / Current Items Section (Draggable) */}
                                   <DragDropContext onDragEnd={(result) => onDragEnd(result, block.originalIndex)}>
                                     <Droppable droppableId={`drop-${block.originalIndex}`}>
                                       {(provided) => (
                                         <div {...provided.droppableProps} ref={provided.innerRef} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                           {upcomingItems.slice(0, visibleLimits[block.originalIndex] || 50).map((med, mIdx) => {
                                             const status = getItemStatus(med);
                                             const isDraggable = status === "FUTURE";
                                             const globalIdx = pastItems.length + mIdx + 1; // For queue position display
                                             
                                             return (
                                               <Draggable key={`${med.id}-${mIdx}`} draggableId={`${med.id}-${mIdx}`} index={mIdx} isDragDisabled={!isDraggable}>
                                                 {(provided, snapshot) => (
                                                   <div ref={provided.innerRef} {...provided.draggableProps} className={`tsv-media-list-item ${snapshot.isDragging ? 'shadow-lg' : ''} ${status === 'CURRENT' ? 'tsv-media-list-item--current' : ''}`} style={{ ...provided.draggableProps.style, cursor: isDraggable ? 'default' : 'not-allowed' }}>
                                                     <div className="tsv-media-drag-handle" {...provided.dragHandleProps} style={{ opacity: isDraggable ? 1 : 0.3 }}>
                                                        <div style={{display: 'flex', flexDirection: 'column', gap: '3px'}}>
                                                           <div style={{width: '20px', height: '2px', background: '#cbd5e1'}}/>
                                                           <div style={{width: '20px', height: '2px', background: '#cbd5e1'}}/>
                                                           <div style={{width: '20px', height: '2px', background: '#cbd5e1'}}/>
                                                        </div>
                                                     </div>
                                                     <div className="tsv-media-list-item__icon">{med.type.startsWith("image") ? <FaImage /> : <FaPlay />}</div>
                                                     <div className="tsv-media-list-item__details" style={{ overflow: 'hidden' }}>
                                                       <div className="font-bold truncate" title={med.name}>{med.name}</div>
                                                       <div className="tsv-media-list-item__time">
                                                          <span>#{globalIdx} | {med.startTime} - {med.endTime}</span>
                                                          {status === 'CURRENT' && <span className="tsv-status-badge tsv-status-badge--current">Playing Now</span>}
                                                       </div>
                                                     </div>
                                                     <div className="tsv-media-list-item__duration">{med.durationSeconds}s</div>
                                                   </div>
                                                 )}
                                               </Draggable>
                                             );
                                           })}
                                           {provided.placeholder}
                                         </div>
                                       )}
                                     </Droppable>
                                   </DragDropContext>
                                   
                                   {upcomingItems.length > (visibleLimits[block.originalIndex] || 50) && (
                                      <button className="tsv-load-more-btn" onClick={() => loadMoreItems(block.originalIndex)}>
                                        Load More Media (Showing {visibleLimits[block.originalIndex]} of {upcomingItems.length})
                                      </button>
                                   )}
                                   {upcomingItems.length === 0 && pastItems.length === 0 && (
                                       <div className="text-slate-400 text-sm">No media items in this slot.</div>
                                   )}
                                 </>
                               );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Distribution Modal */}
      {distModal.open && (
        <div className="tsv-modal-overlay">
          <div className="tsv-modal" style={{ padding: '0', position: 'relative', background: '#fff', borderRadius: '24px', maxWidth: '550px', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(to right, #0f172a, #1e293b)', padding: '24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
               <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                     ✨ Smart Playlist Distribution
                  </h3>
                  <p style={{ margin: '8px 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                     Time Slot: <strong style={{ color: '#fff' }}>{distModal.start} - {distModal.end}</strong>
                  </p>
               </div>
               <button onClick={() => setDistModal({ ...distModal, open: false })} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <FaTimes />
               </button>
            </div>
            
            <div style={{ padding: '24px' }}>
               <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                     Adjust the visual slider for any category. The system will <strong>automatically balance</strong> the remaining categories to keep the total perfectly at 100%.
                  </p>
               </div>
              
              {distModal.categories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No categories found in this slot.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {distModal.categories.map(cat => (
                    <div key={cat} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 70px', alignItems: 'center', gap: '16px' }}>
                      <label style={{ fontWeight: 700, color: '#334155', textTransform: 'capitalize', fontSize: '0.9rem' }}>
                         {cat === 'unknown' ? 'Uncategorized' : cat}
                      </label>
                      <input 
                        type="range"
                        value={distModal.percentages[cat] || 0}
                        onChange={(e) => handlePercentageChange(cat, parseFloat(e.target.value) || 0)}
                        min={0}
                        max={100}
                        step={1}
                        style={{ width: '100%', accentColor: '#11b5bb', cursor: 'pointer' }}
                      />
                      <div style={{ position: 'relative' }}>
                         <input 
                           type="number"
                           value={Math.round(distModal.percentages[cat] || 0)}
                           onChange={(e) => handlePercentageChange(cat, parseFloat(e.target.value) || 0)}
                           min={0}
                           max={100}
                           style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px', textAlign: 'center', fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}
                         />
                         <span style={{ position: 'absolute', right: '-12px', top: '8px', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700 }}>%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: '#334155' }}>Total Allocation</span>
                <div style={{ background: Math.abs(Object.values(distModal.percentages).reduce((a, b) => a + b, 0) - 100) > 0.1 ? '#fef2f2' : '#ecfdf5', padding: '6px 16px', borderRadius: '20px', border: `1px solid ${Math.abs(Object.values(distModal.percentages).reduce((a, b) => a + b, 0) - 100) > 0.1 ? '#fecaca' : '#a7f3d0'}` }}>
                   <span style={{ fontWeight: 800, color: Math.abs(Object.values(distModal.percentages).reduce((a, b) => a + b, 0) - 100) > 0.1 ? '#ef4444' : '#10b981', fontSize: '1.1rem' }}>
                     {Object.values(distModal.percentages).reduce((a, b) => a + b, 0).toFixed(0)}%
                   </span>
                </div>
              </div>
            </div>
            
            <div style={{ padding: '20px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setDistModal({ ...distModal, open: false })}
                style={{ padding: '10px 20px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#64748b', fontWeight: 700, borderRadius: '10px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveDistribution}
                disabled={isSaving || Math.abs(Object.values(distModal.percentages).reduce((a, b) => a + b, 0) - 100) > 0.1}
                style={{ padding: '10px 24px', background: '#11b5bb', border: 'none', color: '#ffffff', fontWeight: 700, borderRadius: '10px', cursor: (isSaving || Math.abs(Object.values(distModal.percentages).reduce((a, b) => a + b, 0) - 100) > 0.1) ? 'not-allowed' : 'pointer', opacity: (isSaving || Math.abs(Object.values(distModal.percentages).reduce((a, b) => a + b, 0) - 100) > 0.1) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {isSaving ? "Saving..." : "Save & Regenerate Timeline"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {selectedMedia && (
        <div className="tsv-modal-overlay" onClick={() => setSelectedMedia(null)}>
          <div className="tsv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tsv-modal-header">
              <h3 className="tsv-modal-title">Media Playout Details</h3>
              <button className="tsv-close-btn" onClick={() => setSelectedMedia(null)}>
                <FaTimes size={18} />
              </button>
            </div>
            <div className="tsv-modal-body">
              <div className="tsv-preview-container">
                {selectedMedia.type.startsWith("image") && selectedMedia.url ? (
                  <img
                    src={selectedMedia.url}
                    alt={selectedMedia.name}
                    className="tsv-preview-image"
                  />
                ) : selectedMedia.type.startsWith("video") && selectedMedia.url ? (
                  <video
                    src={selectedMedia.url}
                    controls
                    className="tsv-preview-image"
                    autoPlay
                    muted
                  />
                ) : (
                  <div className="tsv-preview-fallback">
                    {selectedMedia.type.startsWith("audio") ? (
                      <>
                        <FaVolumeUp size={48} style={{ color: "#11b5bb" }} />
                        <p>Audio File (No Visual Preview)</p>
                      </>
                    ) : (
                      <>
                        <FaTv size={48} style={{ color: "#64848d" }} />
                        <p>No Preview Available</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="tsv-modal-meta">
                <div className="tsv-meta-item">
                  <span className="tsv-meta-label">Name</span>
                  <span className="tsv-meta-value truncate" title={selectedMedia.name}>
                    {selectedMedia.name}
                  </span>
                </div>
                <div className="tsv-meta-item">
                  <span className="tsv-meta-label">Playout Span</span>
                  <span className="tsv-meta-value">
                    {selectedMedia.startTime} - {selectedMedia.endTime}
                  </span>
                </div>
                <div className="tsv-meta-item">
                  <span className="tsv-meta-label">Type</span>
                  <span className="tsv-meta-value uppercase">{selectedMedia.type}</span>
                </div>
                <div className="tsv-meta-item">
                  <span className="tsv-meta-label">Play Duration</span>
                  <span className="tsv-meta-value">{selectedMedia.durationSeconds}s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
