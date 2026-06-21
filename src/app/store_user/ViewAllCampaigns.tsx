"use client";
import React, { useState, useEffect } from "react";
import { FaEdit, FaTrash, FaPlus, FaSearch, FaArrowLeft } from "react-icons/fa";
import { ViewKey } from "./page";

interface Props {
  onNavigate: (view: ViewKey) => void;
  onEdit?: (playlist: any) => void;
}

export default function ViewAllCampaigns({ onNavigate, onEdit }: Props) {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [search, setSearch] = useState("");
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") ?? "" : "";

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    Promise.all([
      fetch(`/api/playlists?userId=${userId}`).then(r => r.json()).catch(() => []),
      fetch(`/api/announcement/playlist?userId=${userId}`).then(r => r.json()).catch(() => [])
    ])
      .then(([playlistData, announcementData]) => {
        const regularPlaylists = Array.isArray(playlistData) ? playlistData : (playlistData.playlists || playlistData.data || []);
        const announcementPlaylists = Array.isArray(announcementData) ? announcementData : (announcementData.playlists || announcementData.data || []);

        const all = [...regularPlaylists, ...announcementPlaylists].sort((a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        setPlaylists(all);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const filtered = playlists.filter(p => {
    const annTypes = ["announcement", "Instant Announcement", "offer", "alert", "info"];
    const type = (p.type || "").toLowerCase();
    if (filter === "media" && annTypes.some(t => type.includes(t.toLowerCase()))) return false;
    if (filter === "announcement" && !annTypes.some(t => type.includes(t.toLowerCase()))) return false;

    // End Date Filter
    if (dateFilter && p.endDate) {
      const d = new Date(p.endDate);
      if (!isNaN(d.getTime())) {
        const pYear = d.getFullYear();
        const pMonth = String(d.getMonth() + 1).padStart(2, '0');
        const pDay = String(d.getDate()).padStart(2, '0');
        const formattedPDate = `${pYear}-${pMonth}-${pDay}`;
        if (formattedPDate !== dateFilter) return false;
      } else {
        return false;
      }
    }

    if (search && !(p.name || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-AU') : "—";
  const getStatus = (p: any) => {
    return p.isAssigned ? "Assigned" : "—";
  };
  const getStatusColor = (s: string) => s === "Assigned" ? "#16A34A" : "#64848D";

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this playlist?")) return;
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
      await fetch(`/api/playlists?id=${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      setPlaylists(prev => prev.filter(p => (p._id || p.id) !== id));
    } catch { }
  };

  const showTypeColumn = filter === "all" || filter === "announcement";

  return (
    <div className="su-vc-view">
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
        <button onClick={() => onNavigate("dashboard")} style={{ background: "none", border: "none", cursor: "pointer", color: "#162B30", display: "flex", alignItems: "center", padding: 0 }}>
          <FaArrowLeft size={18} />
        </button>
        <h1 className="su-vc-title" style={{ margin: 0 }}>View All Campaigns</h1>
      </div>
      <p className="su-vc-subtitle" style={{ marginLeft: "30px" }}>View your playlists and announcements here</p>

      {/* Top Bar */}
      <div className="su-vc-top">
        <div className="su-vc-filters">
          <div className="su-vc-search-wrap">
            <FaSearch size={12} className="su-vc-search-icon" />
            <input type="text" placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} className="su-vc-search" />
          </div>
          <select className="su-vc-filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">Campaign Type</option>
            <option value="media">Media Playlist</option>
            <option value="announcement">Announcement Playlist</option>
          </select>
          <div className="su-vc-date-filter">
            <span className="su-vc-date-label">End Date:</span>
            <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="su-vc-filter-select" />
            {dateFilter && <button onClick={() => setDateFilter("")} className="su-vc-clear-date">Clear</button>}
          </div>
        </div>
        <button className="su-vc-create-btn" onClick={() => onNavigate("mediaManagement")}>
          <FaPlus size={12} /> Create new
        </button>
      </div>

      {/* Table */}
      <div className="su-vc-table-wrap">
        <div className="su-vc-table-header"><h2>{filter === "all" ? "All Campaigns" : filter === "media" ? "Media Playlists" : "Announcements"}</h2></div>
        {loading ? (
          <div className="su-vc-empty">Loading campaigns…</div>
        ) : filtered.length === 0 ? (
          <div className="su-vc-empty">No records found.</div>
        ) : (
          <>
            <table className="su-vc-table">
              <thead><tr>
                {showTypeColumn && <th>CAMPAIGN TYPE</th>}
                <th>NAME</th><th>SCHEDULE</th><th>PREVIEW</th><th>STATUS</th><th>ACTION</th>
              </tr></thead>
              <tbody>
                {filtered.map(p => {
                  const id = p._id || p.id;
                  const status = getStatus(p);
                  const days = Array.isArray(p.daysOfWeek) ? p.daysOfWeek.join(",") : "";
                  const time = p.startTime && p.endTime ? `${p.startTime} to ${p.endTime}` : "";
                  const schedule = [days, time].filter(Boolean).join(" | ") || "—";
                  const hasMedia = p.mediaIds?.length || p.announcements?.length;
                  const preview = hasMedia ? `Display file link - uploaded by ${p.userId?.username || "user"}` : "—";
                  const isAnn = !!p.announcements || ["announcement", "Instant Announcement", "offer", "alert", "info"].some(t => (p.type || "").toLowerCase().includes(t.toLowerCase()));

                  return (
                    <tr key={id}>
                      {showTypeColumn && (
                        <td>
                          <span className={`su-vc-type-badge ${isAnn ? 'su-vc-type--ann' : 'su-vc-type--media'}`}>
                            {isAnn ? 'Announcement Playlist' : 'Media Playlist'}
                          </span>
                        </td>
                      )}
                      <td style={{ fontWeight: 600, color: "#162B30" }}>{p.name || "Playlist name"}</td>
                      <td>{schedule}</td>
                      <td style={{ fontSize: ".8rem", color: "#64848D" }}>{preview}</td>
                      <td><span className="su-vc-status" style={{ color: getStatusColor(status), background: status === "Assigned" ? "#F0FDF4" : "transparent" }}>{status}</span></td>
                      <td>
                        <div className="su-vc-actions">
                          <button className="su-vc-action-btn su-vc-action-btn--edit" onClick={() => onEdit && onEdit(p)}><FaEdit size={12} /></button>
                          <button className="su-vc-action-btn su-vc-action-btn--del" onClick={() => handleDelete(id)}><FaTrash size={11} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="su-vc-footer">
              <span>Showing {filtered.length} of {playlists.length} campaigns</span>
            </div>
          </>
        )}
      </div>

      <style>{`
        .su-vc-view{display:flex;flex-direction:column;gap:24px}
        .su-vc-title{font-size:1.5rem;font-weight:700;color:#162B30;margin:0}
        .su-vc-subtitle{font-size:.88rem;color:#64848D;margin:0}
        .su-vc-top{display:flex;align-items:center;justify-content:space-between;background:#fff;padding:16px 24px;border-radius:12px;border:1px solid #EAEFEF;flex-wrap:wrap;gap:12px}
        .su-vc-filters{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
        .su-vc-search-wrap{position:relative;display:flex;align-items:center}
        .su-vc-search-icon{position:absolute;left:12px;color:#A4B6B9}
        .su-vc-search{padding:10px 14px 10px 32px;border:1px solid #EAEFEF;border-radius:8px;font-size:.85rem;outline:none;min-width:200px}
        .su-vc-filter-select{padding:10px 16px;border:1px solid #EAEFEF;border-radius:8px;font-size:.85rem;outline:none;color:#445459;background:#fff}
        .su-vc-create-btn{background:#F05A28;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:.88rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px}
        .su-vc-table-wrap{background:#fff;border-radius:12px;overflow:hidden;border:1px solid #EAEFEF}
        .su-vc-table-header{background:#0B2830;padding:18px 24px}
        .su-vc-table-header h2{font-size:1.1rem;font-weight:700;color:#fff;margin:0}
        .su-vc-table{width:100%;border-collapse:collapse}
        .su-vc-table thead tr{border-bottom:1px solid #EAEFEF}
        .su-vc-table th{padding:14px 24px;text-align:left;font-size:.75rem;font-weight:700;color:#162B30;text-transform:uppercase;letter-spacing:.04em}
        .su-vc-table td{padding:16px 24px;font-size:.85rem;color:#445459;border-bottom:1px solid #F4F7F8}
        .su-vc-table tbody tr:hover td{background:#FAFCFC}
        .su-vc-status{padding:4px 12px;border-radius:12px;font-size:.75rem;font-weight:700}
        .su-vc-actions{display:flex;gap:10px}
        .su-vc-action-btn{width:30px;height:30px;border-radius:6px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center}
        .su-vc-action-btn--edit{background:#EAF6F8;color:#11B5BB}
        .su-vc-action-btn--del{background:#FFF2F2;color:#DC2626}
        .su-vc-footer{padding:14px 24px;border-top:1px solid #EAEFEF;font-size:.82rem;color:#A4B6B9}
        .su-vc-empty{padding:48px;text-align:center;color:#A4B6B9;font-size:.9rem}
        .su-vc-type-badge{padding:4px 10px;border-radius:6px;font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.02em}
        .su-vc-type--ann{background:#FFF2F2;color:#DC2626;border:1px solid #FEE2E2}
        .su-vc-type--media{background:#EAF6F8;color:#11B5BB;border:1px solid #CFE9EC}
        .su-vc-date-filter{display:flex;align-items:center;gap:8px}
        .su-vc-date-label{font-size:.8rem;font-weight:600;color:#64848D}
        .su-vc-clear-date{background:none;border:none;color:#DC2626;font-size:.75rem;font-weight:600;cursor:pointer}
      `}</style>
    </div>
  );
}
