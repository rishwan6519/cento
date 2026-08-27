"use client";
import React, { useState, useEffect } from "react";
import { FaEdit, FaTrash, FaPlus, FaSearch, FaArrowLeft, FaEye } from "react-icons/fa";
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
  const [previewFiles, setPreviewFiles] = useState<any[] | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [viewingPlaylist, setViewingPlaylist] = useState<any>(null);
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
    const hasDevices = (p.deviceIds && p.deviceIds.length > 0) || p.selectedDeviceId;
    return (p.isAssigned && hasDevices) ? "Assigned" : "";
  };
  const getStatusColor = (s: string) => s === "Assigned" ? "#16A34A" : "#64848D";

  const handleDelete = async (p: any) => {
    if (!confirm("Delete this playlist?")) return;
    try {
      const id = p._id || p.id;
      const isAnn = !!p.announcements || ["announcement", "Instant Announcement", "offer", "alert", "info"].some(t => (p.type || "").toLowerCase().includes(t.toLowerCase()));
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
      
      const endpoint = isAnn 
        ? `/api/announcement/playlist/id?id=${id}` 
        : `/api/playlists?id=${id}`;

      await fetch(endpoint, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      setPlaylists(prev => prev.filter(item => (item._id || item.id) !== id));
    } catch { }
  };

  const getFileIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('video') || t.includes('mp4')) return '🎬';
    if (t.includes('audio') || t.includes('mp3') || t.includes('wav')) return '🎵';
    if (t.includes('image') || t.includes('jpg') || t.includes('png')) return '🖼️';
    return '📄';
  };

  const getPreviewUrl = (f: any) => {
    return f?.url || f?.fileUrl || f?.path || f?.file || (typeof f === 'string' ? f : '');
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
                <th>NAME</th><th>CREATED ON</th><th>SCHEDULE</th><th>PREVIEW</th><th>STATUS</th><th>ACTION</th>
              </tr></thead>
              <tbody>
                {filtered.map(p => {
                  const id = p._id || p.id;
                  const status = getStatus(p);
                  const daysArr = Array.isArray(p.daysOfWeek) ? p.daysOfWeek : [];
                  const time = p.startTime && p.endTime ? `${p.startTime} - ${p.endTime}` : "";
                  const filesArr = p.files || p.announcements || [];
                  const fileCount = filesArr.length;
                  const isAnn = !!p.announcements || ["announcement", "Instant Announcement", "offer", "alert", "info"].some(t => (p.type || "").toLowerCase().includes(t.toLowerCase()));

                  return (
                    <tr key={id} style={{ cursor: 'pointer' }} onClick={() => setViewingPlaylist(p)}>
                      {showTypeColumn && (
                        <td>
                          <span className={`su-vc-type-badge ${isAnn ? 'su-vc-type--ann' : 'su-vc-type--media'}`}>
                            {isAnn ? 'Announcement Playlist' : 'Media Playlist'}
                          </span>
                        </td>
                      )}
                      <td style={{ fontWeight: 600, color: "#162B30" }}>{p.name || "Playlist name"}</td>
                      <td style={{ fontSize: '0.8rem', color: '#64848D', fontWeight: 600 }}>
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "—"}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {daysArr.length > 0 ? daysArr.map((d: string) => (
                              <span key={d} style={{ background: '#EAF6F8', color: '#11B5BB', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>
                                {d.substring(0,3)}
                              </span>
                            )) : <span style={{ color: "#A4B6B9", fontSize: '0.75rem' }}>No days selected</span>}
                          </div>
                          {time && <span style={{ fontSize: '0.75rem', color: '#64848D', fontWeight: 600 }}>{time}</span>}
                        </div>
                      </td>
                      <td style={{ fontSize: ".8rem", color: "#64848D" }}>
                        {fileCount > 0 ? (
                          <span style={{ color: '#11B5BB', fontWeight: 600 }}>{fileCount} file{fileCount !== 1 ? 's' : ''}</span>
                        ) : "—"}
                      </td>
                      <td><span className="su-vc-status" style={{ color: getStatusColor(status), background: status === "Assigned" ? "#F0FDF4" : "transparent" }}>{status}</span></td>
                      <td>
                        <div className="su-vc-actions">
                          <button className="su-vc-action-btn su-vc-action-btn--edit" onClick={(e) => { e.stopPropagation(); onEdit && onEdit(p); }}><FaEdit size={12} /></button>
                          <button className="su-vc-action-btn su-vc-action-btn--del" onClick={(e) => { e.stopPropagation(); handleDelete(p); }}><FaTrash size={11} /></button>
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

      {/* ── Playlist Detail Modal (Read-Only) ── */}
      {viewingPlaylist && (
        <div className="su-vc-modal-overlay" onClick={() => setViewingPlaylist(null)}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 640, maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #0B3D44, #155E68)', padding: '20px 24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>{viewingPlaylist.name}</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>
                  {(() => {
                    const isAnn = !!viewingPlaylist.announcements || ["announcement"].some(t => (viewingPlaylist.type || "").toLowerCase().includes(t));
                    return isAnn ? 'Announcement Playlist' : 'Media Playlist';
                  })()}
                </p>
              </div>
              <button onClick={() => setViewingPlaylist(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {/* Schedule info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '16px 24px', background: '#F8FAFB', borderBottom: '1px solid #EAEFEF' }}>
              <div style={{ background: '#fff', padding: '12px 14px', borderRadius: 10, border: '1px solid #E8ECEE' }}>
                <p style={{ fontSize: '0.62rem', fontWeight: 700, color: '#8CA3AB', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>📅 Date Range</p>
                <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', margin: 0 }}>
                  {viewingPlaylist.startDate ? new Date(viewingPlaylist.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                  {' → '}
                  {viewingPlaylist.endDate ? new Date(viewingPlaylist.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                </p>
              </div>
              <div style={{ background: '#fff', padding: '12px 14px', borderRadius: 10, border: '1px solid #E8ECEE' }}>
                <p style={{ fontSize: '0.62rem', fontWeight: 700, color: '#8CA3AB', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>⏰ Active Hours</p>
                <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', margin: 0 }}>
                  {viewingPlaylist.startTime || '00:00'} – {viewingPlaylist.endTime || '23:59'}
                </p>
              </div>
              <div style={{ gridColumn: '1 / -1', background: '#fff', padding: '12px 14px', borderRadius: 10, border: '1px solid #E8ECEE' }}>
                <p style={{ fontSize: '0.62rem', fontWeight: 700, color: '#8CA3AB', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>🗓️ Active Days</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(viewingPlaylist.daysOfWeek || []).length > 0 ? (viewingPlaylist.daysOfWeek || []).map((d: string) => (
                    <span key={d} style={{ background: '#EAF6F8', color: '#11B5BB', padding: '3px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, textTransform: 'capitalize' }}>{d}</span>
                  )) : <span style={{ fontSize: '0.78rem', color: '#8CA3AB' }}>Everyday</span>}
                </div>
              </div>
            </div>

            {/* Files list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#8CA3AB', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Files ({(viewingPlaylist.files || viewingPlaylist.announcements || []).length})
              </p>
              {(viewingPlaylist.files || viewingPlaylist.announcements || []).length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#A4B6B9', background: '#F8FAFB', borderRadius: 12, border: '1.5px dashed #D6E6E9' }}>No files in this playlist.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(viewingPlaylist.files || viewingPlaylist.announcements || []).map((f: any, idx: number) => {
                    const file = f.file || f;
                    const name = file.name || (file.path || '').split('/').pop() || 'Unknown';
                    const type = file.type || '';
                    const path = getPreviewUrl(file);
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#fff', border: '1.5px solid #E8ECEE', borderRadius: 12, transition: 'border-color 0.2s' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F5F7F8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                          {getFileIcon(type || name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, fontSize: '0.82rem', color: '#162B30', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</p>
                          <p style={{ fontSize: '0.68rem', color: '#94A3B8', margin: '2px 0 0', textTransform: 'uppercase', fontWeight: 600 }}>{type || 'file'}{f.delay ? ` • Delay: ${f.delay}s` : ''}</p>
                        </div>
                        {path && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewFiles([file]);
                              setPreviewIndex(0);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #F05A28, #E04818)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, boxShadow: '0 2px 8px rgba(240,90,40,0.25)' }}
                          >
                            <FaEye size={11} /> Preview
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid #EAEFEF', display: 'flex', justifyContent: 'flex-end', gap: 12, background: '#fff' }}>
              <button onClick={() => setViewingPlaylist(null)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #EAEFEF', background: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', color: '#445459' }}>Close</button>
              <button onClick={() => { setViewingPlaylist(null); onEdit && onEdit(viewingPlaylist); }} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#F05A28', color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Edit Playlist</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFiles && previewFiles.length > 0 && (
        <div className="su-vc-modal-overlay">
          <div className="su-vc-modal">
            <div className="su-vc-modal-header">
              <h3>Media Preview</h3>
              <button onClick={() => setPreviewFiles(null)} className="su-vc-modal-close">✕</button>
            </div>
            <div className="su-vc-modal-content">
              {(() => {
                const current = previewFiles[previewIndex];
                const file = current?.fileId || current;
                let type = (file?.type || '').toLowerCase();
                const path = file?.url || file?.fileUrl || file?.path || file?.file || (typeof file === 'string' ? file : '');
                const name = file?.name || "Unknown file";

                if (!type && path) {
                  if (path.match(/\.(mp4|webm|ogg)(\?.*)?$/i) || path.includes('video')) type = 'video';
                  else if (path.match(/\.(mp3|wav|ogg|m4a)(\?.*)?$/i) || path.includes('audio')) type = 'audio';
                  else type = 'image';
                }

                if (type.includes('image')) {
                  return <img src={path} alt="Preview" className="su-vc-modal-media" />;
                } else if (type.includes('video')) {
                  return <video src={path} controls className="su-vc-modal-media" style={{ width: "100%" }} />;
                } else if (type.includes('audio')) {
                  return <audio src={path} controls style={{ width: "100%" }} />;
                } else {
                  return <p style={{ fontWeight: 700, color: "#64848D" }}>Preview not available for this file type</p>;
                }
              })()}
              <p style={{ marginTop: "16px", fontSize: ".85rem", fontWeight: 700, color: "#162B30" }}>{(previewFiles[previewIndex]?.fileId || previewFiles[previewIndex])?.name || "Unknown file"}</p>
            </div>
            
            {previewFiles.length > 1 && (
              <div className="su-vc-modal-footer">
                <button 
                  onClick={() => setPreviewIndex(prev => (prev > 0 ? prev - 1 : previewFiles.length - 1))}
                  className="su-vc-modal-btn"
                >
                  Previous
                </button>
                <span style={{ fontSize: ".85rem", fontWeight: 700, color: "#64848D" }}>{previewIndex + 1} of {previewFiles.length}</span>
                <button 
                  onClick={() => setPreviewIndex(prev => (prev < previewFiles.length - 1 ? prev + 1 : 0))}
                  className="su-vc-modal-btn su-vc-modal-btn-primary"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
        .su-vc-modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(4px)}
        .su-vc-modal{background:#fff;border-radius:24px;width:100%;max-width:600px;overflow:hidden;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1)}
        .su-vc-modal-header{background:#0B2830;padding:16px 24px;display:flex;align-items:center;justify-content:space-between}
        .su-vc-modal-header h3{color:#fff;margin:0;font-size:1.1rem}
        .su-vc-modal-close{background:none;border:none;color:rgba(255,255,255,0.7);font-size:1.5rem;cursor:pointer}
        .su-vc-modal-close:hover{color:#fff}
        .su-vc-modal-content{padding:32px;background:#FAFCFC;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:300px}
        .su-vc-modal-media{max-height:400px;border-radius:12px;box-shadow:0 1px 3px 0 rgba(0,0,0,0.1);max-width:100%}
        .su-vc-modal-footer{padding:16px 32px;background:#fff;border-top:1px solid #EAEFEF;display:flex;align-items:center;justify-content:space-between}
        .su-vc-modal-btn{padding:8px 16px;border-radius:8px;font-size:.85rem;font-weight:700;cursor:pointer;border:1px solid #EAEFEF;background:#fff;color:#162B30}
        .su-vc-modal-btn-primary{background:#F05A28;color:#fff;border:none}
      `}</style>
    </div>
  );
}
