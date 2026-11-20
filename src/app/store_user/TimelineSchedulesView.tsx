"use client";

import React, { useState, useEffect } from "react";
import { FaClock, FaCalendarAlt, FaTv, FaPlay, FaImage, FaVolumeUp, FaTimes } from "react-icons/fa";
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
  allPlaylistNames?: string[];
  playlistId: string;
  scheduleId: string;
  media: MediaInstance[];
}

interface TimelineData {
  date: string;
  versionId: string;
  data: TimelineWindow[];
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
    items: { key: string; label: string }[];
    percentages: Record<string, number>;
  }>({ open: false, slotIdx: null, start: "", end: "", items: [], percentages: {} });
  const [selectedMedia, setSelectedMedia] = useState<MediaInstance | null>(null);
  const [expandedSlots, setExpandedSlots] = useState<Record<number, boolean>>({});
  const [editedQueues, setEditedQueues] = useState<Record<number, MediaInstance[]>>({});

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

    updateTime();
    const interval = setInterval(updateTime, 1000);

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

  // Media type / Category-wise distribution handler (Classic / Original behavior)
  const handleOpenDistModal = (block: any) => {
    const queue = editedQueues[block.originalIndex] || [];
    const catSet = new Set<string>();

    // 1. Pull categories from backend availableCategories
    if (block.availableCategories && block.availableCategories.length > 0) {
      block.availableCategories.forEach((cat: string) => {
        if (cat && cat.trim()) catSet.add(cat.trim().toLowerCase());
      });
    }

    // 2. Also inspect media queue items for videoCategory / type
    queue.forEach(med => {
      const vCat = (med as any).videoCategory || (med as any).type;
      if (vCat && vCat !== 'unknown') {
        catSet.add(vCat.toLowerCase());
      }
    });

    // 3. Include any existing allocated percentages
    const existingPcts = block.allocatedPercentages || {};
    Object.keys(existingPcts).forEach(cat => {
      if (cat && cat.trim()) catSet.add(cat.trim().toLowerCase());
    });

    // Default fallbacks if empty
    if (catSet.size === 0) {
      catSet.add('generic');
      catSet.add('offer');
    }

    const formatCatLabel = (cat: string) => {
      if (cat === 'uncategorized' || cat === 'unknown') return 'Uncategorized';
      return cat.charAt(0).toUpperCase() + cat.slice(1);
    };

    const categories = Array.from(catSet);
    const items = categories.map(c => ({
      key: c,
      label: formatCatLabel(c)
    }));

    const percentages: Record<string, number> = {};
    let hasExisting = false;

    items.forEach(item => {
      const matchKey = Object.keys(existingPcts).find(k => k.toLowerCase() === item.key.toLowerCase());
      if (matchKey !== undefined && existingPcts[matchKey] !== undefined) {
        percentages[item.key] = Number(existingPcts[matchKey]);
        hasExisting = true;
      }
    });

    if (!hasExisting) {
      const split = Math.floor((100 / (items.length || 1)) * 100) / 100;
      items.forEach(item => percentages[item.key] = split);
    } else {
      items.forEach(item => {
        if (percentages[item.key] === undefined) percentages[item.key] = 0;
      });
    }

    setDistModal({
      open: true,
      slotIdx: block.originalIndex,
      start: block.start,
      end: block.end,
      items,
      percentages
    });
  };

  const handlePercentageChange = (key: string, value: number) => {
    let newVal = Math.max(0, Math.min(100, value));
    const newPcts = { ...distModal.percentages, [key]: newVal };
    const otherItems = distModal.items.filter(item => item.key !== key);
    
    if (otherItems.length > 0) {
      const remaining = Math.max(0, 100 - newVal);
      const split = Math.round((remaining / otherItems.length) * 10) / 10;
      let runningSum = newVal;
      otherItems.forEach((item, idx) => {
        if (idx === otherItems.length - 1) {
          newPcts[item.key] = Math.max(0, Math.round((100 - runningSum) * 10) / 10);
        } else {
          newPcts[item.key] = split;
          runningSum += split;
        }
      });
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

    const endOfDaySeconds = 86400;
    if (currentSeconds < endOfDaySeconds) {
      blocks.push({
        isGap: true,
        originalIndex: -1,
        start: formatSecondsToTime(currentSeconds),
        end: "24:00",
        durationSeconds: endOfDaySeconds - currentSeconds
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
        .tsv-container {
          background: #ffffff;
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 10px 30px rgba(11, 40, 48, 0.04);
          border: 1px dashed #d6e6e9;
          max-width: 100%;
          box-sizing: border-box;
        }
        .tsv-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px dashed #eaf2f3;
          gap: 20px;
        }
        .tsv-title-wrap h2 {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0b2830;
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
        }
        .tsv-title-wrap p {
          font-size: 0.85rem;
          color: #64848d;
          margin: 4px 0 0 0;
        }
        .tsv-controls {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .tsv-control-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .tsv-control-group label {
          font-size: 0.72rem;
          font-weight: 700;
          color: #8cabb3;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .tsv-select, .tsv-input {
          background: #f8fafb;
          border: 1px solid #eaeef0;
          border-radius: 10px;
          padding: 10px 16px;
          font-size: 0.88rem;
          color: #162b30;
          font-weight: 600;
          outline: none;
          min-width: 180px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }
        .tsv-select:focus, .tsv-input:focus {
          border-color: #11b5bb;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(17, 181, 187, 0.1);
        }
        .tsv-action-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          gap: 12px;
          flex-wrap: wrap;
        }
        .tsv-version-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #e6f7f8;
          color: #11b5bb;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          border: 1px solid rgba(17, 181, 187, 0.2);
        }
        .tsv-save-btn {
          background: #11b5bb;
          color: #ffffff;
          border: none;
          border-radius: 10px;
          padding: 10px 20px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .tsv-save-btn:hover {
          background: #0e9da2;
        }
        .tsv-save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .tsv-timeline-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
          position: relative;
          padding-left: 20px;
        }
        .tsv-timeline-list::before {
          content: "";
          position: absolute;
          left: 6px;
          top: 8px;
          bottom: 8px;
          width: 2px;
          background: repeating-linear-gradient(to bottom, #cbd5e1, #cbd5e1 4px, transparent 4px, transparent 8px);
        }
        .tsv-block {
          position: relative;
        }
        .tsv-block-marker {
          position: absolute;
          left: -20px;
          top: 18px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #ffffff;
          border: 3px solid #11b5bb;
          z-index: 2;
        }
        .tsv-block--gap .tsv-block-marker {
          border-color: #cbd5e1;
        }
        .tsv-block-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.01);
          transition: all 0.2s ease;
          overflow: hidden;
        }
        .tsv-block-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 16px;
        }
        .tsv-block-time {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.95rem;
          font-weight: 750;
          color: #0b2830;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .tsv-block-info {
          text-align: right;
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .tsv-playlist-name-wrap {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
          max-width: 100%;
        }
        .tsv-playlist-name {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0b2830;
          word-break: break-word;
          max-width: 100%;
        }
        .tsv-multi-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #f0fdfa;
          color: #0d9488;
          border: 1px solid #99f6e4;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
          white-space: nowrap;
        }
        .tsv-block-duration {
          font-size: 0.75rem;
          color: #64848d;
          font-weight: 500;
          margin-top: 4px;
          display: block;
        }
        .tsv-block-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
          margin-top: 8px;
        }
        .tsv-edit-dist-btn {
          background: #f8fafb;
          color: #11b5bb;
          border: 1px solid #c8e7e8;
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        .tsv-edit-dist-btn:hover {
          background: #11b5bb;
          color: white;
        }
        .tsv-accordion-toggle {
          background: rgba(17, 181, 187, 0.1);
          border: none;
          color: #11b5bb;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 8px;
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        .tsv-accordion-toggle:hover {
          background: rgba(17, 181, 187, 0.2);
        }
        .tsv-accordion-content {
          margin-top: 16px;
          border-top: 1px dashed #e2e8f0;
          padding-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .tsv-history-btn {
          width: 100%;
          padding: 10px;
          background: #f8fafb;
          color: #64848d;
          font-weight: 700;
          font-size: 0.8rem;
          border: 1px solid #eaeef0;
          border-radius: 12px;
          margin-bottom: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .tsv-media-list-item {
          display: flex;
          align-items: center;
          gap: 14px;
          background: #f8fafb;
          border: 1px solid #eaeef0;
          border-radius: 12px;
          padding: 12px 16px;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }
        .tsv-media-list-item--current {
          border: 2px solid #11b5bb;
          background: #f0fdfd;
        }
        .tsv-media-list-item--past {
          background: #f1f5f9;
          border-color: #e2e8f0;
        }
        .tsv-status-badge {
          font-size: 0.65rem;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
          margin-left: 6px;
          display: inline-block;
        }
        .tsv-status-badge--past {
          background: #cbd5e1;
          color: #475569;
        }
        .tsv-status-badge--current {
          background: #11b5bb;
          color: white;
        }
        .tsv-media-drag-handle {
          color: #94a3b8;
          display: flex;
          align-items: center;
          cursor: grab;
          flex-shrink: 0;
        }
        .tsv-media-list-item__icon {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          background: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-size: 1.1rem;
          flex-shrink: 0;
        }
        .tsv-media-list-item__details {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }
        .tsv-media-list-item__name {
          font-size: 0.88rem;
          font-weight: 700;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tsv-media-list-item__time {
          font-size: 0.75rem;
          color: #64848d;
          font-weight: 500;
          margin-top: 3px;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 4px;
        }
        .tsv-media-list-item__duration {
          background: #e2e8f0;
          color: #475569;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          flex-shrink: 0;
        }
        .tsv-load-more-btn {
          background: #f8fafb;
          border: 1px solid #e2e8f0;
          padding: 10px;
          width: 100%;
          border-radius: 8px;
          font-weight: 700;
          color: #64848d;
          cursor: pointer;
        }
        .tsv-empty {
          text-align: center;
          padding: 40px 20px;
          background: #f8fafb;
          border-radius: 16px;
          border: 1px dashed #cbd5e1;
          color: #64748b;
        }
        .tsv-gap-message {
          font-size: 0.8rem;
          color: #94a3b8;
          margin: 6px 0 0 0;
        }

        /* Modals & Overlays */
        .tsv-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(11, 40, 48, 0.6);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          box-sizing: border-box;
        }
        .tsv-dist-modal {
          background: #ffffff;
          border-radius: 20px;
          width: 100%;
          max-width: 580px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        .tsv-dist-modal-header {
          padding: 22px 24px;
          background: #0f172a;
          color: #ffffff;
        }
        .tsv-dist-modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }
        .tsv-dist-row {
          display: grid;
          grid-template-columns: 140px 1fr 75px;
          align-items: center;
          gap: 16px;
        }
        .tsv-dist-label {
          font-weight: 700;
          color: #334155;
          text-transform: capitalize;
          font-size: 0.9rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .tsv-dist-slider {
          width: 100%;
          accent-color: #11b5bb;
          cursor: pointer;
        }
        .tsv-dist-input-wrap {
          position: relative;
        }
        .tsv-dist-number-input {
          width: 100%;
          padding: 8px 14px 8px 8px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          text-align: center;
          font-weight: 700;
          color: #0f172a;
          font-size: 0.9rem;
          box-sizing: border-box;
        }
        .tsv-dist-pct-sign {
          position: absolute;
          right: 6px;
          top: 8px;
          color: #94a3b8;
          font-size: 0.8rem;
          font-weight: 700;
          pointer-events: none;
        }
        .tsv-dist-modal-footer {
          padding: 16px 24px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          flex-wrap: wrap;
        }
        .tsv-dist-cancel-btn {
          padding: 10px 20px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #64748b;
          font-weight: 700;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tsv-dist-save-btn {
          padding: 10px 24px;
          background: #11b5bb;
          border: none;
          color: #ffffff;
          font-weight: 700;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tsv-dist-save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Preview Modal */
        .tsv-modal {
          background: #ffffff;
          border-radius: 20px;
          width: 100%;
          max-width: 600px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        .tsv-modal-header {
          padding: 18px 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .tsv-modal-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #0b2830;
          margin: 0;
        }
        .tsv-close-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }
        .tsv-modal-body {
          padding: 24px;
          overflow-y: auto;
        }
        .tsv-preview-container {
          width: 100%;
          height: 280px;
          background: #0b2830;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }
        .tsv-preview-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .tsv-preview-fallback {
          text-align: center;
          color: #94a3b8;
        }
        .tsv-modal-meta {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .tsv-meta-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .tsv-meta-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: #8cabb3;
          text-transform: uppercase;
        }
        .tsv-meta-value {
          font-size: 0.95rem;
          font-weight: 600;
          color: #0b2830;
        }

        /* Responsive Breakpoints */
        @media (max-width: 768px) {
          .tsv-container {
            padding: 16px 12px;
            border-radius: 14px;
          }
          .tsv-header {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
            margin-bottom: 18px;
            padding-bottom: 16px;
          }
          .tsv-title-wrap h2 {
            font-size: 1.25rem;
          }
          .tsv-controls {
            flex-direction: column;
            gap: 12px;
            width: 100%;
          }
          .tsv-control-group {
            width: 100%;
          }
          .tsv-select, .tsv-input {
            min-width: 0;
            width: 100%;
          }
          .tsv-action-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }
          .tsv-save-btn {
            width: 100%;
            justify-content: center;
          }
          .tsv-timeline-list {
            padding-left: 14px;
            gap: 18px;
          }
          .tsv-timeline-list::before {
            left: 5px;
          }
          .tsv-block-marker {
            left: -14px;
            width: 12px;
            height: 12px;
            top: 16px;
          }
          .tsv-block-card {
            padding: 14px 12px;
            border-radius: 14px;
          }
          .tsv-block-header {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }
          .tsv-block-time {
            width: 100%;
            justify-content: flex-start;
          }
          .tsv-block-info {
            text-align: left;
            align-items: flex-start;
            width: 100%;
          }
          .tsv-playlist-name-wrap {
            justify-content: flex-start;
            width: 100%;
          }
          .tsv-playlist-name {
            font-size: 0.95rem;
          }
          .tsv-block-actions {
            justify-content: stretch;
            width: 100%;
          }
          .tsv-block-actions button {
            flex: 1 1 auto;
            justify-content: center;
            text-align: center;
          }
          .tsv-media-list-item {
            padding: 10px 12px;
            gap: 10px;
            flex-wrap: wrap;
          }
          .tsv-media-list-item__icon {
            width: 32px;
            height: 32px;
            font-size: 0.95rem;
          }
          .tsv-media-list-item__details {
            flex: 1 1 180px;
          }
          .tsv-dist-modal-header {
            padding: 18px 16px;
          }
          .tsv-dist-modal-body {
            padding: 16px;
          }
          .tsv-dist-row {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
            background: #f8fafc;
            padding: 12px;
            border-radius: 10px;
            border: 1px solid #f1f5f9;
          }
          .tsv-dist-input-wrap {
            width: 100px;
            align-self: flex-end;
          }
          .tsv-dist-modal-footer {
            padding: 14px 16px;
            flex-direction: column;
          }
          .tsv-dist-cancel-btn, .tsv-dist-save-btn {
            width: 100%;
            text-align: center;
            justify-content: center;
          }
          .tsv-modal-meta {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .tsv-preview-container {
            height: 200px;
          }
        }
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

        {loading && <div className="tsv-loading" style={{ textAlign: 'center', padding: '40px', color: '#11b5bb', fontWeight: 600 }}>Generating full-day timeline...</div>}
        {error && <div className="tsv-error" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>{error}</div>}

        {!loading && !error && timeline && (
          <>
            <div className="tsv-action-bar">
              <div className="tsv-version-badge">
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
                <FaCalendarAlt size={36} className="mb-3 text-slate-300 mx-auto" style={{ display: 'block', margin: '0 auto 12px auto' }} />
                <p className="font-semibold" style={{ margin: 0 }}>No playback schedules configured for this day.</p>
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
                          <div className="tsv-playlist-name" style={{ color: '#94a3b8' }}>Schedule Gap</div>
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
                            <div className="tsv-playlist-name-wrap">
                              <div 
                                className="tsv-playlist-name"
                                title={block.allPlaylistNames && block.allPlaylistNames.length > 1 ? block.allPlaylistNames.join(', ') : block.playlistName}
                              >
                                {block.playlistName || 'Scheduled Timeline Slot'}
                              </div>
                              {block.allPlaylistNames && block.allPlaylistNames.length > 1 && (
                                <span className="tsv-multi-tag" title={block.allPlaylistNames.join(', ')}>
                                  ⚡ {block.allPlaylistNames.length} Playlists Connected
                                </span>
                              )}
                            </div>
                            <span className="tsv-block-duration">
                              Total duration: {formatDuration(block.durationSeconds)}
                            </span>
                            <div className="tsv-block-actions">
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
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
                              Drag to reorder playlist queue
                            </div>
                            
                            {(() => {
                               const queue = editedQueues[block.originalIndex] || [];
                               const pastItems = queue.filter(med => getItemStatus(med) === "PAST");
                               const upcomingItems = queue.filter(med => getItemStatus(med) !== "PAST");
                               
                               return (
                                 <>
                                   {/* Played History Section */}
                                   {pastItems.length > 0 && (
                                     <div style={{ marginBottom: '16px' }}>
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
                                                <div className="tsv-media-list-item__details">
                                                  <div className="tsv-media-list-item__name" title={med.name}>
                                                    {med.name}
                                                  </div>
                                                  <div className="tsv-media-list-item__time">
                                                    <span>#{mIdx + 1} | {med.startTime} - {med.endTime}</span>
                                                    <span className="tsv-status-badge tsv-status-badge--past">Played</span>
                                                    <span className="tsv-status-badge" style={{ background: '#f8fafb', border: '1px solid #e2e8f0', color: '#64748b', textTransform: 'capitalize' }}>{med.videoCategory || 'other'}</span>
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
                                             const globalIdx = pastItems.length + mIdx + 1;
                                             
                                             return (
                                               <Draggable key={`${med.id}-${mIdx}`} draggableId={`${med.id}-${mIdx}`} index={mIdx} isDragDisabled={!isDraggable}>
                                                 {(provided, snapshot) => (
                                                   <div 
                                                     ref={provided.innerRef} 
                                                     {...provided.draggableProps} 
                                                     className={`tsv-media-list-item ${snapshot.isDragging ? 'shadow-lg' : ''} ${status === 'CURRENT' ? 'tsv-media-list-item--current' : ''}`} 
                                                     style={{ ...provided.draggableProps.style, cursor: isDraggable ? 'default' : 'not-allowed' }}
                                                     onClick={() => setSelectedMedia(med)}
                                                   >
                                                     <div className="tsv-media-drag-handle" {...provided.dragHandleProps} style={{ opacity: isDraggable ? 1 : 0.3 }}>
                                                        <div style={{display: 'flex', flexDirection: 'column', gap: '3px'}}>
                                                           <div style={{width: '20px', height: '2px', background: '#cbd5e1'}}/>
                                                           <div style={{width: '20px', height: '2px', background: '#cbd5e1'}}/>
                                                           <div style={{width: '20px', height: '2px', background: '#cbd5e1'}}/>
                                                        </div>
                                                     </div>
                                                     <div className="tsv-media-list-item__icon">{med.type.startsWith("image") ? <FaImage /> : <FaPlay />}</div>
                                                     <div className="tsv-media-list-item__details">
                                                       <div className="tsv-media-list-item__name" title={med.name}>{med.name}</div>
                                                       <div className="tsv-media-list-item__time">
                                                          <span>#{globalIdx} | {med.startTime} - {med.endTime}</span>
                                                          {status === 'CURRENT' && <span className="tsv-status-badge tsv-status-badge--current">Playing Now</span>}
                                                          <span className="tsv-status-badge" style={{ background: '#e0e7ff', color: '#4f46e5', textTransform: 'capitalize' }}>{med.videoCategory || 'other'}</span>
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
                                       <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No media items in this slot.</div>
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

      {/* Distribution Modal (Media Type / Category Wise) */}
      {distModal.open && (
        <div className="tsv-modal-overlay" onClick={() => setDistModal({ ...distModal, open: false })}>
          <div className="tsv-dist-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tsv-dist-modal-header">
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                     <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ✨ Smart Category Distribution
                     </h3>
                     <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                        Time Slot: <strong style={{ color: '#fff' }}>{distModal.start} - {distModal.end}</strong>
                     </p>
                  </div>
                  <button 
                     onClick={() => setDistModal({ ...distModal, open: false })}
                     style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                  >
                     <FaTimes size={18} />
                  </button>
               </div>
            </div>
            
            <div className="tsv-dist-modal-body">
               <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                     Adjust the visual slider for each media type / category (e.g. Offer, Generic). The system automatically balances the remaining categories to keep the total perfectly at 100%.
                  </p>
               </div>
              
              {distModal.items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No categories found in this slot.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {distModal.items.map(item => (
                    <div key={item.key} className="tsv-dist-row">
                      <label className="tsv-dist-label" title={item.label}>
                         {item.label}
                      </label>
                      <input 
                        type="range"
                        className="tsv-dist-slider"
                        value={distModal.percentages[item.key] || 0}
                        onChange={(e) => handlePercentageChange(item.key, parseFloat(e.target.value) || 0)}
                        min={0}
                        max={100}
                        step={1}
                      />
                      <div className="tsv-dist-input-wrap">
                         <input 
                            type="number"
                            className="tsv-dist-number-input"
                            value={Math.round(distModal.percentages[item.key] || 0)}
                            onChange={(e) => handlePercentageChange(item.key, parseFloat(e.target.value) || 0)}
                            min={0}
                            max={100}
                         />
                         <span className="tsv-dist-pct-sign">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: '#334155' }}>Total Allocation</span>
                <div style={{ background: Math.abs(Object.values(distModal.percentages).reduce((a, b) => a + b, 0) - 100) > 0.1 ? '#fef2f2' : '#ecfdf5', padding: '6px 16px', borderRadius: '20px', border: `1px solid ${Math.abs(Object.values(distModal.percentages).reduce((a, b) => a + b, 0) - 100) > 0.1 ? '#fecaca' : '#a7f3d0'}` }}>
                   <span style={{ fontWeight: 800, color: Math.abs(Object.values(distModal.percentages).reduce((a, b) => a + b, 0) - 100) > 0.1 ? '#ef4444' : '#10b981', fontSize: '1.05rem' }}>
                     {Object.values(distModal.percentages).reduce((a, b) => a + b, 0).toFixed(0)}%
                   </span>
                </div>
              </div>
            </div>
            
            <div className="tsv-dist-modal-footer">
              <button 
                onClick={() => setDistModal({ ...distModal, open: false })}
                className="tsv-dist-cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveDistribution}
                disabled={isSaving || Math.abs(Object.values(distModal.percentages).reduce((a, b) => a + b, 0) - 100) > 0.1}
                className="tsv-dist-save-btn"
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
                  <span className="tsv-meta-value truncate" title={selectedMedia.name} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
