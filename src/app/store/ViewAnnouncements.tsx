"use client";
import React, { useState } from "react";
import { FiSearch, FiEdit2, FiTrash2 } from "react-icons/fi";

const ViewAnnouncements: React.FC = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchAnnouncements = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/playlists?userId=${userId}`);
        const data = await res.json();
        if (data && Array.isArray(data)) {
          setAnnouncements(data.filter((item: any) => item.type === 'offer' || item.type === 'alert' || item.type === 'info' || item.type === 'announcement' || item.type === 'Instant Announcement'));
        } else if (data && data.data && Array.isArray(data.data)) {
          setAnnouncements(data.data.filter((item: any) => item.type === 'offer' || item.type === 'alert' || item.type === 'info' || item.type === 'announcement' || item.type === 'Instant Announcement'));
        } else {
          setAnnouncements([]);
        }
      } catch (err) {
        console.error(err);
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, []);

  const getStatusColor = (s: string) => {
    if (s === "Paused") return "#EF4444";
    if (s === "Running") return "#22C55E";
    if (s === "Upcoming") return "#EAB308";
    return "#64748b";
  };

  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = a.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = status ? (a.status === status) : true;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ fontFamily: "Inter, sans-serif" }}>
      <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#10353C", margin: "0 0 4px" }}>View announcement</h2>
      <p style={{ fontSize: "0.85rem", color: "#64748B", margin: "0 0 24px" }}>View your announcement here</p>

      <div style={{
        backgroundColor: "#fff",
        borderRadius: "12px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "24px"
      }}>
        
        {/* Filters Top Bar */}
        <div style={{ display: "flex", gap: "16px" }}>
          <div style={{ position: "relative", flex: 3 }}>
            <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>
              <FiSearch />
            </div>
            <input 
              placeholder="Search by announcement name" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px 10px 36px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                outline: "none",
                fontSize: "0.9rem",
                color: "#1a2c35",
                fontFamily: "inherit"
              }}
            />
          </div>
          <div style={{ flex: 1, position: "relative" }}>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                width: "100%",
                appearance: "none",
                padding: "10px 14px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                outline: "none",
                fontSize: "0.9rem",
                color: "#64748b",
                fontFamily: "inherit",
                backgroundColor: "#fff"
              }}
            >
              <option value="">Status</option>
              <option value="Running">Running</option>
              <option value="Paused">Paused</option>
              <option value="Upcoming">Upcoming</option>
            </select>
            <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#9ca3af" }}>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div style={{
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          overflow: "hidden"
        }}>
          <div style={{ backgroundColor: "#10353C", padding: "16px 20px" }}>
            <h3 style={{ color: "#fff", margin: 0, fontSize: "1rem", fontWeight: 600 }}>Playlist</h3>
          </div>
          
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 700, color: "#1a2c35", fontSize: "0.75rem", textTransform: "uppercase", width: "20%" }}>ANNOUNCEMENT NAME</th>
                <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 700, color: "#1a2c35", fontSize: "0.75rem", textTransform: "uppercase", width: "20%" }}>SCHEDULE</th>
                <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 700, color: "#1a2c35", fontSize: "0.75rem", textTransform: "uppercase", width: "35%" }}>PREVIEW</th>
                <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 700, color: "#1a2c35", fontSize: "0.75rem", textTransform: "uppercase", width: "15%" }}>STATUS</th>
                <th style={{ padding: "14px 20px", textAlign: "center", fontWeight: 700, color: "#1a2c35", fontSize: "0.75rem", textTransform: "uppercase", width: "10%" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#64748B" }}>Loading...</td>
                </tr>
              ) : filteredAnnouncements.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#64748B", fontStyle: "italic" }}>Not announcement file available</td>
                </tr>
              ) : filteredAnnouncements.map((item, idx) => {
                const scheduleStr = item.daysOfWeek?.join(".") + " | " + (item.startTime || "") + " to " + (item.endTime || "");
                return (
                  <tr key={item._id} style={{ borderBottom: idx !== filteredAnnouncements.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <td style={{ padding: "18px 20px", color: "#475569", fontWeight: 600 }}>{item.name}</td>
                    <td style={{ padding: "18px 20px", color: "#475569" }}>{scheduleStr === " |  to " ? "Immediate" : scheduleStr}</td>
                    <td style={{ padding: "18px 20px", color: "#475569" }}>
                      {item.mediaIds && item.mediaIds.length > 0 ? (
                        <span style={{color: '#06b6d4', textDecoration: 'underline', cursor: 'pointer'}}>Preview Audio</span>
                      ) : "[No media]"}
                    </td>
                    <td style={{ padding: "18px 20px", color: getStatusColor(item.status || "Running"), fontWeight: 600 }}>{item.status || "Running"}</td>
                    <td style={{ padding: "18px 20px" }}>
                      <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
                        <button style={{ background: "none", border: "none", cursor: "pointer", color: "#06b6d4" }}><FiEdit2 size={16} /></button>
                        <button style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><FiTrash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ViewAnnouncements;
