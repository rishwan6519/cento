"use client";
import React, { useState, useEffect } from "react";
import { FaEdit, FaTrash, FaPlus, FaSearch } from "react-icons/fa";
import { ViewKey } from "./page";

interface Props { 
  onNavigate: (view: ViewKey) => void; 
  onEdit?: (playlist: any) => void;
}

export default function ViewAllCampaigns({ onNavigate, onEdit }: Props) {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") ?? "" : "";

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetch(`/api/playlists?userId=${userId}`).then(r => r.json())
      .then(data => {
        const all = Array.isArray(data) ? data : (data.playlists || data.data || []);
        setPlaylists(all);
      }).catch(() => setPlaylists([]))
      .finally(() => setLoading(false));
  }, [userId]);

  const filtered = playlists.filter(p => {
    const t = (p.type || "").toLowerCase();
    if (filter === "media" && t === "announcement") return false;
    if (filter === "announcement" && t !== "announcement") return false;
    if (search && !(p.name || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-AU') : "—";
  const getStatus = (p: any) => {
    if (!p.endDate) return "Active";
    return new Date(p.endDate) > new Date() ? "Running" : "Completed";
  };
  const getStatusColor = (s: string) => s === "Running" ? "#16A34A" : s === "Completed" ? "#A4B6B9" : "#F59E0B";

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this playlist?")) return;
    try {
      await fetch(`/api/playlists?id=${id}`, { method: "DELETE" });
      setPlaylists(prev => prev.filter(p => (p._id || p.id) !== id));
    } catch {}
  };

  return (
    <div className="su-vc-view">
      <h1 className="su-vc-title">View campaigns</h1>
      <p className="su-vc-subtitle">View your playlists and announcements here</p>

      {/* Top Bar */}
      <div className="su-vc-top">
        <div className="su-vc-filters">
          <div className="su-vc-search-wrap">
            <FaSearch size={12} className="su-vc-search-icon" />
            <input type="text" placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} className="su-vc-search" />
          </div>
          <select className="su-vc-filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All types</option>
            <option value="media">Media playlists</option>
            <option value="announcement">Announcements</option>
          </select>
        </div>
        <button className="su-vc-create-btn" onClick={() => onNavigate("mediaManagement")}>
          <FaPlus size={12} /> Create new
        </button>
      </div>

      {/* Table */}
      <div className="su-vc-table-wrap">
        <div className="su-vc-table-header"><h2>Playlist</h2></div>
        {loading ? (
          <div className="su-vc-empty">Loading playlists…</div>
        ) : filtered.length === 0 ? (
          <div className="su-vc-empty">No playlists found. Create one to get started.</div>
        ) : (
          <>
            <table className="su-vc-table">
              <thead><tr>
                <th>NAME</th><th>SCHEDULE</th><th>PREVIEW</th><th>STATUS</th><th>ACTION</th>
              </tr></thead>
              <tbody>
                {filtered.map(p => {
                  const id = p._id || p.id;
                  const status = getStatus(p);
                  const days = Array.isArray(p.daysOfWeek) ? p.daysOfWeek.join(",") : "";
                  const time = p.startTime && p.endTime ? `${p.startTime} to ${p.endTime}` : "";
                  const schedule = [days, time].filter(Boolean).join(" | ") || "—";
                  const preview = p.mediaIds?.length ? `Display file link - uploaded by ${p.userId?.username || "user"}` : "—";
                  return (
                    <tr key={id}>
                      <td style={{fontWeight:600,color:"#162B30"}}>{p.name || "Playlist name"}</td>
                      <td>{schedule}</td>
                      <td style={{fontSize:".8rem",color:"#64848D"}}>{preview}</td>
                      <td><span className="su-vc-status" style={{color:getStatusColor(status),background:status==="Running"?"#F0FDF4":status==="Completed"?"#F8FAFB":"#FFFBEB"}}>{status}</span></td>
                      <td>
                        <div className="su-vc-actions">
                          <button className="su-vc-action-btn su-vc-action-btn--edit" onClick={() => onEdit && onEdit(p)}><FaEdit size={12}/></button>
                          <button className="su-vc-action-btn su-vc-action-btn--del" onClick={()=>handleDelete(id)}><FaTrash size={11}/></button>
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
      `}</style>
    </div>
  );
}
