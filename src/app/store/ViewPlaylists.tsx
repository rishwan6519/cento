"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiSearch, FiEdit2, FiTrash2, FiX, FiCheck, FiMonitor } from "react-icons/fi";
import toast from "react-hot-toast";

interface Playlist {
  _id: string;
  name: string;
  type?: string;
  daysOfWeek?: string[];
  startTime?: string;
  endTime?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  globalMinVolume?: number;
  globalMaxVolume?: number;
  selectedDeviceId?: string;
  mediaFiles?: { url?: string; name?: string }[];
  userId?: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  backgroundColor: "#f8fafc",
  color: "#334155",
  fontSize: "0.85rem",
  outline: "none",
  fontFamily: "Inter, sans-serif",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "#334155",
  marginBottom: "6px",
};

// ─── Edit Modal ───────────────────────────────────────────────────────────────
interface EditModalProps {
  playlist: Playlist;
  onClose: () => void;
  onSaved: (updated: Playlist) => void;
}

const EditModal: React.FC<EditModalProps> = ({ playlist, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: playlist.name || "",
    type: playlist.type || "",
    startDate: playlist.startDate || "",
    endDate: playlist.endDate || "",
    startTime: playlist.startTime || "",
    endTime: playlist.endTime || "",
    daysOfWeek: playlist.daysOfWeek || [],
    globalMinVolume: playlist.globalMinVolume ?? 30,
    globalMaxVolume: playlist.globalMaxVolume ?? 80,
    selectedDeviceId: playlist.selectedDeviceId || "",
  });
  const [saving, setSaving] = useState(false);
  const [devices, setDevices] = useState<{ _id: string; name: string; status?: string }[]>([]);

  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") ?? "" : "";

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/assign-device?userId=${userId}`)
      .then(r => r.json())
      .then(d => {
        const assignments = d.data || [];
        setDevices(assignments.map((a: any) => ({
          _id: a.deviceId?._id || a._id,
          name: a.deviceId?.name || "Unknown Device",
          status: a.deviceId?.status || "inactive",
        })));
      })
      .catch(() => setDevices([]));
  }, [userId]);

  const toggleDay = (d: string) =>
    setForm(p => ({
      ...p,
      daysOfWeek: p.daysOfWeek.includes(d)
        ? p.daysOfWeek.filter(x => x !== d)
        : [...p.daysOfWeek, d],
    }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Playlist name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/playlists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: playlist._id, ...form }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Playlist updated!");
        onSaved({ ...playlist, ...form });
      } else {
        toast.error(data.error || "Failed to update playlist");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }}>
      <div style={{
        background: "#fff", borderRadius: "16px", width: "100%", maxWidth: 640,
        maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          background: "#10353C", borderRadius: "16px 16px 0 0",
          padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <p style={{ margin: 0, color: "#fff", fontWeight: 700, fontSize: "1rem" }}>Edit Playlist</p>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.75rem" }}>Update playlist settings</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
            <FiX size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>

          {/* Name + Type */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Playlist name</label>
              <input
                style={inputStyle}
                placeholder="Enter playlist name"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select
                style={{ ...inputStyle, appearance: "none" }}
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              >
                <option value="">Select type</option>
                <option value="audio">Audio</option>
                <option value="video">Video</option>
                <option value="image">Image</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Start date</label>
              <input
                style={inputStyle} type="date"
                value={form.startDate}
                onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label style={labelStyle}>End date</label>
              <input
                style={inputStyle} type="date"
                value={form.endDate}
                onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Times */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Start time</label>
              <input
                style={inputStyle} type="time"
                value={form.startTime}
                onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
              />
            </div>
            <div>
              <label style={labelStyle}>End time</label>
              <input
                style={inputStyle} type="time"
                value={form.endTime}
                onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
              />
            </div>
          </div>

          {/* Days */}
          <div>
            <label style={labelStyle}>Days of the week</label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "6px" }}>
              {DAYS.map(d => {
                const active = form.daysOfWeek.includes(d);
                return (
                  <button
                    key={d}
                    onClick={() => toggleDay(d)}
                    style={{
                      width: 44, height: 36, borderRadius: "6px",
                      border: "1px solid #e2e8f0",
                      background: active ? "#FF5C16" : "#fff",
                      color: active ? "#fff" : "#64748B",
                      fontSize: "0.78rem", fontWeight: 600,
                      cursor: "pointer", transition: "all 0.2s",
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Volume */}
          <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "18px 20px", border: "1px solid #e2e8f0" }}>
            <p style={{ margin: "0 0 14px", fontWeight: 700, fontSize: "0.88rem", color: "#10353C" }}>Global volume settings</p>
            <div style={{ display: "flex", gap: "16px" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Min volume: {form.globalMinVolume}%</label>
                <input
                  type="range" min={0} max={100} value={form.globalMinVolume}
                  onChange={e => setForm(p => ({ ...p, globalMinVolume: Math.min(Number(e.target.value), p.globalMaxVolume - 5) }))}
                  style={{ width: "100%", accentColor: "#3B82F6" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Max volume: {form.globalMaxVolume}%</label>
                <input
                  type="range" min={0} max={100} value={form.globalMaxVolume}
                  onChange={e => setForm(p => ({ ...p, globalMaxVolume: Math.max(Number(e.target.value), p.globalMinVolume + 5) }))}
                  style={{ width: "100%", accentColor: "#EF4444" }}
                />
              </div>
            </div>
          </div>

          {/* Device */}
          {devices.length > 0 && (
            <div>
              <label style={labelStyle}>Select device</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px", marginTop: "6px" }}>
                {devices.map(d => {
                  const isSelected = form.selectedDeviceId === d._id;
                  const isOnline = (d.status || "").toLowerCase() === "active" || (d.status || "").toLowerCase() === "online";
                  return (
                    <div
                      key={d._id}
                      onClick={() => setForm(p => ({ ...p, selectedDeviceId: isSelected ? "" : d._id }))}
                      style={{
                        border: `2px solid ${isSelected ? "#FF5C16" : "#e2e8f0"}`,
                        background: isSelected ? "#fff8f5" : "#fff",
                        borderRadius: "10px", padding: "12px", cursor: "pointer",
                        position: "relative", transition: "all 0.15s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ color: "#FF5C16", background: "#fff5f2", padding: "6px", borderRadius: "6px" }}>
                          <FiMonitor size={14} />
                        </div>
                        <div>
                          <p style={{ margin: "0 0 2px", fontSize: "0.8rem", fontWeight: 700, color: "#10353C" }}>{d.name}</p>
                          <span style={{ fontSize: "0.68rem", fontWeight: 600, color: isOnline ? "#22c55e" : "#ef4444" }}>
                            {isOnline ? "● Online" : "● Offline"}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <div style={{ position: "absolute", top: "8px", right: "8px", color: "#FF5C16" }}>
                          <FiCheck size={13} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 24px", borderTop: "1px solid #f1f5f9",
          display: "flex", justifyContent: "flex-end", gap: "12px",
        }}>
          <button
            onClick={onClose}
            style={{ padding: "10px 24px", background: "#fff", border: "1px solid #e2e8f0", color: "#64748B", borderRadius: "8px", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "10px 28px",
              background: saving ? "#94a3b8" : "#FF5C16",
              border: "none", color: "#fff", borderRadius: "8px",
              fontWeight: 600, fontSize: "0.88rem",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );

  // Portal renders the modal outside the overflow:hidden store-root container
  return createPortal(modalContent, document.body);
};

// ─── Main Component ───────────────────────────────────────────────────────────
interface ViewPlaylistsProps {
  title?: string;
  subtitle?: string;
  type?: 'media' | 'announcement';
}

const ViewPlaylists: React.FC<ViewPlaylistsProps> = ({ 
  title = "View playlist",
  subtitle = "View and edit your playlists here",
  type
}) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") ?? "" : "";

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`/api/playlists?userId=${userId}`)
      .then(r => r.json())
      .then(d => {
        let all = Array.isArray(d) ? d : (d.playlists || d.data || []);
        if (type === 'announcement') {
          all = all.filter((p: any) => p.type === 'announcement');
        } else if (type === 'media') {
          all = all.filter((p: any) => p.type !== 'announcement');
        }
        setPlaylists(all);
      })
      .catch(() => setPlaylists([]))
      .finally(() => setLoading(false));
  }, [userId, type]);

  const getStatusColor = (s: string) => {
    const lower = (s || "").toLowerCase();
    if (lower === "paused") return { color: "#EF4444", bg: "#fef2f2" };
    if (lower === "running" || lower === "active") return { color: "#22C55E", bg: "#f0fdf4" };
    if (lower === "upcoming") return { color: "#EAB308", bg: "#fefce8" };
    return { color: "#64748b", bg: "#f8fafc" };
  };

  const formatSchedule = (p: Playlist) => {
    const days = p.daysOfWeek?.join(", ") || "—";
    const time = p.startTime && p.endTime ? `${p.startTime} to ${p.endTime}` : "";
    return time ? `${days} | ${time}` : days;
  };

  const filtered = playlists.filter(p => {
    const matchSearch = search ? (p.name || "").toLowerCase().includes(search.toLowerCase()) : true;
    const matchStatus = statusFilter ? (p.status || "").toLowerCase() === statusFilter.toLowerCase() : true;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this playlist?")) return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/playlists", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Playlist deleted");
        setPlaylists(prev => prev.filter(p => p._id !== id));
      } else {
        toast.error(data.error || "Failed to delete playlist");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = (updated: Playlist) => {
    setPlaylists(prev => prev.map(p => (p._id === updated._id ? updated : p)));
    setEditingPlaylist(null);
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif" }}>
      <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#10353C", margin: "0 0 4px" }}>{title}</h2>
      <p style={{ fontSize: "0.85rem", color: "#64748B", margin: "0 0 24px" }}>{subtitle}</p>

      <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* Filters */}
        <div style={{ display: "flex", gap: "16px" }}>
          <div style={{ position: "relative", flex: 3 }}>
            <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>
              <FiSearch />
            </div>
            <input
              placeholder="Search by playlist name"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "10px 14px 10px 36px", border: "1px solid #e2e8f0", borderRadius: "8px", outline: "none", fontSize: "0.9rem", color: "#1a2c35", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ flex: 1, position: "relative" }}>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ width: "100%", appearance: "none", padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: "8px", outline: "none", fontSize: "0.9rem", color: "#64748b", fontFamily: "inherit", backgroundColor: "#fff" }}
            >
              <option value="">Status</option>
              <option value="Running">Running</option>
              <option value="Paused">Paused</option>
              <option value="Upcoming">Upcoming</option>
            </select>
            <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#9ca3af" }}>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
          <div style={{ backgroundColor: "#10353C", padding: "16px 20px" }}>
            <h3 style={{ color: "#fff", margin: 0, fontSize: "1rem", fontWeight: 600 }}>Playlist</h3>
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading playlists…</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                  <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 700, color: "#1a2c35", fontSize: "0.75rem", textTransform: "uppercase" }}>PLAYLIST NAME</th>
                  <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 700, color: "#1a2c35", fontSize: "0.75rem", textTransform: "uppercase" }}>SCHEDULE</th>
                  <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 700, color: "#1a2c35", fontSize: "0.75rem", textTransform: "uppercase" }}>PREVIEW</th>
                  <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 700, color: "#1a2c35", fontSize: "0.75rem", textTransform: "uppercase" }}>STATUS</th>
                  <th style={{ padding: "14px 20px", textAlign: "center", fontWeight: 700, color: "#1a2c35", fontSize: "0.75rem", textTransform: "uppercase" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                      {playlists.length === 0 ? "No playlists created yet." : "No playlists match your filter."}
                    </td>
                  </tr>
                ) : filtered.map((item, idx) => {
                  const sc = getStatusColor(item.status || "");
                  const previewFile = item.mediaFiles?.[0];
                  return (
                    <tr key={item._id} style={{ borderBottom: idx !== filtered.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                      <td style={{ padding: "18px 20px", color: "#1e293b", fontWeight: 600 }}>{item.name || "—"}</td>
                      <td style={{ padding: "18px 20px", color: "#475569" }}>{formatSchedule(item)}</td>
                      <td style={{ padding: "18px 20px", color: "#475569" }}>
                        {previewFile?.url ? (
                          <a href={previewFile.url} target="_blank" rel="noreferrer" style={{ color: "#FF5C16", fontWeight: 600, fontSize: "0.8rem" }}>
                            ▶ Preview
                          </a>
                        ) : <span style={{ color: "#cbd5e1" }}>No preview</span>}
                      </td>
                      <td style={{ padding: "18px 20px" }}>
                        <span style={{ background: sc.bg, color: sc.color, padding: "3px 10px", borderRadius: "20px", fontWeight: 600, fontSize: "0.78rem" }}>
                          {item.status || "Active"}
                        </span>
                      </td>
                      <td style={{ padding: "18px 20px" }}>
                        <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
                          <button
                            title="Edit playlist"
                            onClick={() => setEditingPlaylist(item)}
                            style={{
                              background: "#e8f7f8", border: "none", cursor: "pointer",
                              color: "#06b6d4", width: 32, height: 32, borderRadius: "8px",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all 0.15s",
                            }}
                          >
                            <FiEdit2 size={14} />
                          </button>
                          <button
                            title="Delete playlist"
                            onClick={() => handleDelete(item._id)}
                            disabled={deletingId === item._id}
                            style={{
                              background: "#fff0ed", border: "none",
                              cursor: deletingId === item._id ? "not-allowed" : "pointer",
                              color: "#ef4444", width: 32, height: 32, borderRadius: "8px",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              opacity: deletingId === item._id ? 0.5 : 1,
                              transition: "all 0.15s",
                            }}
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingPlaylist && (
        <EditModal
          playlist={editingPlaylist}
          onClose={() => setEditingPlaylist(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};

export default ViewPlaylists;
