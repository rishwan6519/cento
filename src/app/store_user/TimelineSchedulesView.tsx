"use client";

import React, { useState, useEffect } from "react";
import { FaClock, FaCalendarAlt, FaTv, FaChevronRight, FaPlay, FaImage, FaVolumeUp, FaTimes } from "react-icons/fa";

interface MediaInstance {
  id: string;
  name: string;
  url: string;
  type: string;
  durationSeconds: number;
  startTime: string;
  endTime: string;
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
  windows: TimelineWindow[];
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
  const [error, setError] = useState<string>("");
  const [selectedMedia, setSelectedMedia] = useState<MediaInstance | null>(null);

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

  // Helper to parse "HH:mm" to seconds from midnight
  const parseTimeToSeconds = (timeStr: string): number => {
    const [h, m] = timeStr.split(":").map(Number);
    return (h || 0) * 3600 + (m || 0) * 60;
  };

  // Helper to construct timeline blocks including gaps
  const getTimelineBlocks = () => {
    if (!timeline || !timeline.windows) return [];
    
    const blocks: any[] = [];
    let currentSeconds = 0; // Starts at 00:00 midnight

    timeline.windows.forEach((win) => {
      const winStartSeconds = parseTimeToSeconds(win.start);
      
      // If there is a gap before the window starts
      if (winStartSeconds > currentSeconds) {
        blocks.push({
          isGap: true,
          start: formatSecondsToTime(currentSeconds),
          end: win.start,
          durationSeconds: winStartSeconds - currentSeconds
        });
      }

      // Add the schedule window
      blocks.push({
        ...win,
        isGap: false
      });

      currentSeconds = parseTimeToSeconds(win.end);
    });

    // Add trailing gap if last window ends before midnight (24:00)
    const midnightSeconds = 24 * 3600;
    if (currentSeconds < midnightSeconds) {
      blocks.push({
        isGap: true,
        start: formatSecondsToTime(currentSeconds),
        end: "24:00",
        durationSeconds: midnightSeconds - currentSeconds
      });
    }

    return blocks;
  };

  // Helper to convert seconds back to "HH:mm"
  const formatSecondsToTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  // Format seconds to human-readable duration
  const formatDuration = (totalSeconds: number) => {
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
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
        }

        .tsv-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px dashed #eaf2f3;
        }

        .tsv-title-wrap h2 {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0b2830;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .tsv-title-wrap p {
          font-size: 0.85rem;
          color: #64848d;
          margin-top: 4px;
        }

        .tsv-controls {
          display: flex;
          gap: 16px;
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
        }

        .tsv-select:focus, .tsv-input:focus {
          border-color: #11b5bb;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(17, 181, 187, 0.1);
        }

        .tsv-version-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #e6f7f8;
          color: #11b5bb;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          margin-bottom: 20px;
          border: 1px solid rgba(17, 181, 187, 0.2);
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
          background: repeating-linear-gradient(
            to bottom,
            #cbd5e1,
            #cbd5e1 4px,
            transparent 4px,
            transparent 8px
          );
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
        }

        .tsv-block-card:hover {
          box-shadow: 0 8px 20px rgba(11, 40, 48, 0.05);
          border-color: #cbd5e1;
        }

        .tsv-block-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .tsv-block-time {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.95rem;
          font-weight: 750;
          color: #0b2830;
        }

        .tsv-block-info {
          text-align: right;
        }

        .tsv-playlist-name {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0b2830;
        }

        .tsv-block-duration {
          font-size: 0.75rem;
          color: #64848d;
          font-weight: 500;
          margin-top: 2px;
        }

        /* Scrollable Media Track */
        .tsv-media-track-container {
          overflow-x: auto;
          padding: 4px 0 10px;
          display: flex;
          align-items: center;
          gap: 12px;
          scrollbar-width: thin;
        }

        .tsv-media-track-container::-webkit-scrollbar {
          height: 6px;
        }
        .tsv-media-track-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .tsv-media-card {
          background: #f8fafb;
          border: 1px solid #eaeef0;
          border-radius: 12px;
          padding: 12px 16px;
          min-width: 180px;
          max-width: 220px;
          flex-shrink: 0;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tsv-media-card:hover {
          transform: translateY(-2px);
          background: #ffffff;
          border-color: #11b5bb;
          box-shadow: 0 4px 12px rgba(17, 181, 187, 0.08);
        }

        .tsv-media-card__header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.7rem;
          font-weight: 700;
          color: #8cabb3;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .tsv-media-card__name {
          font-size: 0.88rem;
          font-weight: 700;
          color: #162b30;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tsv-media-card__time {
          font-size: 0.72rem;
          color: #64848d;
          font-weight: 500;
          margin-top: 6px;
        }

        .tsv-media-card__duration {
          display: inline-block;
          background: #e2e8f0;
          color: #475569;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          margin-top: 8px;
        }

        .tsv-track-arrow {
          color: #94a3b8;
          flex-shrink: 0;
        }

        /* Gap Card Styles */
        .tsv-block--gap .tsv-block-card {
          background: repeating-linear-gradient(
            45deg,
            #f8fafc,
            #f8fafc 10px,
            #f1f5f9 10px,
            #f1f5f9 20px
          );
          border: 1px dashed #cbd5e1;
        }

        .tsv-gap-message {
          font-size: 0.88rem;
          color: #64748b;
          font-weight: 600;
          margin-top: 4px;
        }

        /* Preview Modal */
        .tsv-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(11, 40, 48, 0.6);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .tsv-modal {
          background: #ffffff;
          border-radius: 20px;
          width: 100%;
          max-width: 500px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          animation: tsv-scale-up 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes tsv-scale-up {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .tsv-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #f1f5f9;
        }

        .tsv-modal-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: #0b2830;
        }

        .tsv-close-btn {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s ease;
        }

        .tsv-close-btn:hover {
          color: #ef4444;
        }

        .tsv-modal-body {
          padding: 24px;
        }

        .tsv-preview-container {
          background: #0f172a;
          border-radius: 12px;
          aspect-ratio: 16 / 9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          overflow: hidden;
          margin-bottom: 16px;
        }

        .tsv-preview-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .tsv-preview-fallback {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .tsv-preview-fallback p {
          font-size: 0.88rem;
          color: #94a3b8;
        }

        .tsv-modal-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          background: #f8fafb;
          border-radius: 12px;
          padding: 16px;
          border: 1px solid #eaeef0;
        }

        .tsv-meta-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .tsv-meta-label {
          font-size: 0.68rem;
          font-weight: 700;
          color: #8cabb3;
          text-transform: uppercase;
        }

        .tsv-meta-value {
          font-size: 0.88rem;
          font-weight: 700;
          color: #162b30;
        }

        /* Empty & Loading States */
        .tsv-loading, .tsv-empty, .tsv-error {
          padding: 60px 20px;
          text-align: center;
          background: #f8fafb;
          border-radius: 16px;
          border: 1px dashed #eaeef0;
          color: #64848d;
        }

        .tsv-loading-spinner {
          width: 36px;
          height: 36px;
          border: 4px solid rgba(17, 181, 187, 0.1);
          border-top-color: #11b5bb;
          border-radius: 50%;
          animation: tsv-spin 0.8s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes tsv-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="tsv-container">
        {/* Header Controls */}
        <div className="tsv-header">
          <div className="tsv-title-wrap">
            <h2>
              <FaClock style={{ color: "#11b5bb" }} />
              Timelines / Schedules
            </h2>
            <p>View the continuous daily playback schedule timeline for store devices.</p>
          </div>

          <div className="tsv-controls">
            <div className="tsv-control-group">
              <label>Select Device</label>
              <select
                className="tsv-select"
                value={selectedDeviceSn}
                onChange={(e) => setSelectedDeviceSn(e.target.value)}
              >
                {devices.length === 0 && <option value="">No devices available</option>}
                {devices.map((dev) => (
                  <option key={dev.id} value={dev.sn}>
                    {dev.name} ({dev.sn})
                  </option>
                ))}
              </select>
            </div>

            <div className="tsv-control-group">
              <label>Target Date</label>
              <input
                type="date"
                className="tsv-input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="tsv-loading">
            <div className="tsv-loading-spinner" />
            <p className="font-semibold">Generating full-day timeline...</p>
          </div>
        )}

        {error && (
          <div className="tsv-error">
            <p className="font-bold text-red-500 mb-2">Error Loading Timeline</p>
            <p>{error}</p>
          </div>
        )}

        {/* Timeline Content */}
        {!loading && !error && timeline && (
          <>
            <div className="tsv-version-badge">
              <FaTv />
              <span>Timeline version ID: {timeline.versionId}</span>
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
                            <div className="tsv-playlist-name">{block.playlistName}</div>
                            <span className="tsv-block-duration">
                              Total duration: {formatDuration(block.durationSeconds)}
                            </span>
                          </div>
                        </div>

                        {/* Media track scroll queue */}
                        <div className="tsv-media-track-container">
                          {block.media.map((med: MediaInstance, mIdx: number) => (
                            <React.Fragment key={`${med.id}-${mIdx}`}>
                              <div
                                className="tsv-media-card"
                                onClick={() => setSelectedMedia(med)}
                              >
                                <div className="tsv-media-card__header">
                                  {med.type.startsWith("image") ? <FaImage /> : <FaPlay />}
                                  <span>{med.type.split("/")[0] || "media"}</span>
                                </div>
                                <div className="tsv-media-card__name" title={med.name}>
                                  {med.name}
                                </div>
                                <div className="tsv-media-card__time">
                                  {med.startTime} - {med.endTime}
                                </div>
                                <span className="tsv-media-card__duration">
                                  {med.durationSeconds}s
                                </span>
                              </div>
                              {mIdx < block.media.length - 1 && (
                                <FaChevronRight className="tsv-track-arrow" />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

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
