"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  FaCalendarAlt, FaPlus, FaChevronLeft, FaChevronRight, FaTimes,
  FaFacebook, FaInstagram, FaWhatsapp, FaEnvelope, FaYoutube, FaTiktok,
  FaVideo, FaImage, FaTrash, FaEye, FaClock, FaCheckCircle,
  FaSpinner, FaShareSquare, FaCopy, FaFilm
} from "react-icons/fa";

export type SocialChannel = "facebook" | "instagram" | "whatsapp" | "email" | "youtube" | "tiktok";
export type PostStatus = "draft" | "scheduled" | "published" | "failed" | "cancelled";

export interface SocialPost {
  _id: string;
  storeUserId: string;
  channel: SocialChannel;
  message: string;
  mediaType: "none" | "image" | "video";
  mediaUrl?: string;
  thumbnailUrl?: string;
  templateId?: string;
  publishMode: "now" | "schedule";
  scheduledAt?: string;
  timezone: string;
  status: PostStatus;
  externalPostId?: string;
  targetAccountId?: string;
  targetAccountName?: string;
  createdAt: string;
}

export interface PlannerDay {
  date: string;
  weekday: string;
  day_num: number;
  is_today: boolean;
  in_month: boolean;
  posts: SocialPost[];
}

const CHANNELS: { id: SocialChannel; label: string; icon: any; color: string; bg: string }[] = [
  { id: "facebook", label: "Facebook", icon: FaFacebook, color: "#1877F2", bg: "rgba(24, 119, 242, 0.12)" },
  { id: "instagram", label: "Instagram", icon: FaInstagram, color: "#E4405F", bg: "rgba(228, 64, 95, 0.12)" },
  { id: "whatsapp", label: "WhatsApp", icon: FaWhatsapp, color: "#25D366", bg: "rgba(37, 211, 102, 0.12)" },
  { id: "youtube", label: "YouTube Shorts", icon: FaYoutube, color: "#FF0000", bg: "rgba(255, 0, 0, 0.12)" },
  { id: "tiktok", label: "TikTok", icon: FaTiktok, color: "#00F2FE", bg: "rgba(0, 242, 254, 0.12)" },
  { id: "email", label: "Email Newsletter", icon: FaEnvelope, color: "#0D9488", bg: "rgba(13, 148, 136, 0.12)" },
];

export default function SocialSchedulerView({
  onNavigate,
  initialTemplateId,
}: {
  onNavigate?: (view: any) => void;
  initialTemplateId?: string;
}) {
  const [viewMode, setViewMode] = useState<"week" | "month" | "list">("week");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [days, setDays] = useState<PlannerDay[]>([]);
  const [postsList, setPostsList] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Connected Store Social Info
  const [storeSocial, setStoreSocial] = useState<{
    facebookPageName?: string;
    facebookPageId?: string;
    instagramUsername?: string;
    instagramBusinessId?: string;
  } | null>(null);

  // Fetch store social config on mount
  useEffect(() => {
    const uid = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (uid) {
      fetch(`/api/user?userId=${uid}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data) {
            const u = Array.isArray(res.data) ? res.data[0] : res.data;
            if (u?.socialCredentials) {
              setStoreSocial(u.socialCredentials);
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  // Templates for dropdown selector
  const [templates, setTemplates] = useState<any[]>([]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingPost, setViewingPost] = useState<SocialPost | null>(null);
  const [deletingPost, setDeletingPost] = useState<SocialPost | null>(null);

  // Form State
  const [targetChannel, setTargetChannel] = useState<SocialChannel>("facebook");
  const [postMessage, setPostMessage] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId || "");
  const [mediaType, setMediaType] = useState<"video" | "image" | "none">("video");
  const [mediaUrl, setMediaUrl] = useState("");
  const [publishMode, setPublishMode] = useState<"schedule" | "now">("schedule");
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [scheduleTime, setScheduleTime] = useState("10:00");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch templates for quick selection
  useEffect(() => {
    fetch("/api/video-template")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) setTemplates(d.data);
      })
      .catch(() => {});
  }, []);

  // Fetch Planner or List
  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = anchorDate.toISOString().split("T")[0];
      const res = await fetch(
        `/api/social/planner?view=${viewMode === "month" ? "month" : "week"}&channel=${channelFilter}&date=${dateStr}`
      );
      const data = await res.json();
      if (data.success && data.days) {
        setDays(data.days);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, [anchorDate, viewMode, channelFilter]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/social/posts?channel=${channelFilter}&limit=100`);
      const data = await res.json();
      if (data.success && data.data) {
        setPostsList(data.data);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, [channelFilter]);

  useEffect(() => {
    if (viewMode === "list") {
      fetchList();
    } else {
      fetchCalendar();
    }
  }, [viewMode, fetchCalendar, fetchList]);

  // Handle template selection auto-filling
  useEffect(() => {
    if (selectedTemplateId) {
      const match = templates.find((t) => t._id === selectedTemplateId);
      if (match) {
        if (!postMessage) {
          setPostMessage(`🔥 Special In-Store Promotion! Don't miss out on ${match.templateName || "this limited-time deal"}!`);
        }
        if (match.productUrl) setMediaUrl(match.productUrl);
      }
    }
  }, [selectedTemplateId, templates]);

  // Navigate calendar
  const handlePrev = () => {
    setAnchorDate((prev) => {
      const next = new Date(prev);
      if (viewMode === "month") next.setMonth(next.getMonth() - 1);
      else next.setDate(next.getDate() - 7);
      return next;
    });
  };

  const handleNext = () => {
    setAnchorDate((prev) => {
      const next = new Date(prev);
      if (viewMode === "month") next.setMonth(next.getMonth() + 1);
      else next.setDate(next.getDate() + 7);
      return next;
    });
  };

  const handleToday = () => {
    setAnchorDate(new Date());
  };

  // Submit Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postMessage.trim()) {
      showToast("Please enter a caption message", "error");
      return;
    }

    setSubmitting(true);
    try {
      let combinedScheduledAt: string | undefined = undefined;
      if (publishMode === "schedule") {
        combinedScheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
      }

      const storeUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      const payload = {
        storeUserId: storeUserId || undefined,
        channel: targetChannel,
        message: postMessage.trim(),
        mediaType,
        mediaUrl: mediaUrl.trim(),
        templateId: selectedTemplateId || undefined,
        publishMode,
        scheduledAt: combinedScheduledAt,
        timezone: "Asia/Kolkata",
      };

      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast(publishMode === "now" ? "Post published instantly!" : "Post scheduled successfully!");
        setIsCreateOpen(false);
        setPostMessage("");
        setMediaUrl("");
        setSelectedTemplateId("");
        if (viewMode === "list") fetchList();
        else fetchCalendar();
      } else {
        showToast(data.message || "Failed to schedule post", "error");
      }
    } catch {
      showToast("Network error scheduling post", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Post
  const handleDeletePost = async () => {
    if (!deletingPost) return;
    try {
      const res = await fetch(`/api/social/posts/${deletingPost._id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("Post schedule cancelled successfully!");
        setDeletingPost(null);
        if (viewingPost?._id === deletingPost._id) setViewingPost(null);
        if (viewMode === "list") fetchList();
        else fetchCalendar();
      } else {
        showToast(data.message || "Failed to delete post", "error");
      }
    } catch {
      showToast("Network error deleting post", "error");
    }
  };

  const channelMeta = (ch: string) => {
    return CHANNELS.find((c) => c.id === ch) || CHANNELS[0];
  };

  return (
    <div className="smp-root">
      {/* Toast */}
      {toast && (
        <div className={`smp-toast smp-toast--${toast.type}`}>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)}><FaTimes size={12} /></button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="smp-header">
        <div className="smp-header__left">
          <div className="smp-header__icon">
            <FaCalendarAlt size={22} />
          </div>
          <div>
            <h1 className="smp-header__title">Social Media Content Planner &amp; Scheduling</h1>
            <p className="smp-header__subtitle">
              Schedule &amp; broadcast your Storesparc promotional videos and offers across Facebook, Instagram, WhatsApp, and Shorts.
            </p>
            {/* Store Connected Social Accounts Indicator */}
            <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Destination Accounts:</span>
              <span style={{
                fontSize: "0.74rem",
                padding: "3px 10px",
                borderRadius: "12px",
                background: storeSocial?.facebookPageId ? "rgba(24, 119, 242, 0.1)" : "rgba(100, 116, 139, 0.1)",
                color: storeSocial?.facebookPageId ? "#1877F2" : "#64748b",
                fontWeight: 600,
                border: "1px solid " + (storeSocial?.facebookPageId ? "rgba(24, 119, 242, 0.25)" : "rgba(100, 116, 139, 0.2)")
              }}>
                📘 {storeSocial?.facebookPageName || (storeSocial?.facebookPageId ? `FB: ${storeSocial.facebookPageId}` : "FB (Default System Page)")}
              </span>
              <span style={{
                fontSize: "0.74rem",
                padding: "3px 10px",
                borderRadius: "12px",
                background: storeSocial?.instagramBusinessId ? "rgba(228, 64, 95, 0.1)" : "rgba(100, 116, 139, 0.1)",
                color: storeSocial?.instagramBusinessId ? "#E4405F" : "#64748b",
                fontWeight: 600,
                border: "1px solid " + (storeSocial?.instagramBusinessId ? "rgba(228, 64, 95, 0.25)" : "rgba(100, 116, 139, 0.2)")
              }}>
                📸 {storeSocial?.instagramUsername ? `@${storeSocial.instagramUsername.replace(/^@/, '')}` : (storeSocial?.instagramBusinessId ? `IG: ${storeSocial.instagramBusinessId}` : "IG (Default System Account)")}
              </span>
            </div>
          </div>
        </div>

        <div className="smp-header__actions">
          {onNavigate && (
            <button
              className="smp-btn smp-btn--secondary"
              onClick={() => onNavigate("templateEditor")}
              title="Open Visual Canvas Editor"
            >
              <FaFilm size={14} /> Video Studio
            </button>
          )}
          <button
            className="smp-btn smp-btn--primary"
            onClick={() => {
              if (initialTemplateId) setSelectedTemplateId(initialTemplateId);
              setIsCreateOpen(true);
            }}
          >
            <FaPlus size={13} /> Schedule New Post
          </button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="smp-toolbar">
        {/* View switcher */}
        <div className="smp-view-tabs">
          <button
            className={`smp-view-tab ${viewMode === "week" ? "active" : ""}`}
            onClick={() => setViewMode("week")}
          >
            Week View
          </button>
          <button
            className={`smp-view-tab ${viewMode === "month" ? "active" : ""}`}
            onClick={() => setViewMode("month")}
          >
            Month View
          </button>
          <button
            className={`smp-view-tab ${viewMode === "list" ? "active" : ""}`}
            onClick={() => setViewMode("list")}
          >
            List View
          </button>
        </div>

        {/* Date Navigator */}
        {viewMode !== "list" && (
          <div className="smp-date-nav">
            <button className="smp-nav-btn" onClick={handlePrev} aria-label="Previous">
              <FaChevronLeft size={11} />
            </button>
            <button className="smp-today-btn" onClick={handleToday}>Today</button>
            <button className="smp-nav-btn" onClick={handleNext} aria-label="Next">
              <FaChevronRight size={11} />
            </button>
            <span className="smp-date-title">
              {anchorDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
            <span className="smp-tz-badge">Asia/Kolkata</span>
          </div>
        )}

        {/* Channel Filters */}
        <div className="smp-channels-filter">
          <button
            className={`smp-ch-btn ${channelFilter === "all" ? "active" : ""}`}
            onClick={() => setChannelFilter("all")}
          >
            All Channels
          </button>
          {CHANNELS.map((ch) => {
            const Icon = ch.icon;
            return (
              <button
                key={ch.id}
                className={`smp-ch-btn ${channelFilter === ch.id ? "active" : ""}`}
                style={{
                  color: channelFilter === ch.id ? "#fff" : ch.color,
                  borderColor: channelFilter === ch.id ? ch.color : undefined,
                  background: channelFilter === ch.id ? ch.color : undefined,
                }}
                onClick={() => setChannelFilter(ch.id)}
              >
                <Icon size={12} />
                <span>{ch.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content View ── */}
      {loading ? (
        <div className="smp-loading">
          <FaSpinner className="smp-spin" size={28} />
          <p>Loading scheduled social media content…</p>
        </div>
      ) : viewMode === "list" ? (
        /* ── List View Table ── */
        <div className="smp-card">
          <div className="smp-table-wrap">
            <table className="smp-table">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Message / Caption</th>
                  <th>Attached Template ID</th>
                  <th>Media Type</th>
                  <th>Scheduled Date &amp; Time</th>
                  <th>Status</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {postsList.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="smp-empty">
                        <FaCalendarAlt size={32} />
                        <h4>No scheduled posts found</h4>
                        <p>Click "Schedule New Post" above to plan social media promotions.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  postsList.map((post) => {
                    const ch = channelMeta(post.channel);
                    const Icon = ch.icon;
                    return (
                      <tr key={post._id}>
                        <td>
                          <div className="smp-channel-pill" style={{ color: ch.color, background: ch.bg }}>
                            <Icon size={13} />
                            <span>{ch.label}</span>
                          </div>
                        </td>
                        <td>
                          <p className="smp-msg-preview">{post.message}</p>
                        </td>
                        <td>
                          {post.templateId ? (
                            <span
                              className="smp-id-badge"
                              title="Click to copy Template ID"
                              onClick={() => {
                                navigator.clipboard.writeText(post.templateId!);
                                showToast(`Copied Template ID: ${post.templateId}`);
                              }}
                            >
                              <code>{post.templateId}</code>
                              <FaCopy size={10} />
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>
                          )}
                        </td>
                        <td>
                          <span className="smp-media-badge">
                            {post.mediaType === "video" ? <FaVideo size={11} /> : <FaImage size={11} />}
                            <span>{post.mediaType.toUpperCase()}</span>
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <strong style={{ fontSize: "0.85rem", color: "#0B2830" }}>
                              {post.scheduledAt
                                ? new Date(post.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                : "Immediate"}
                            </strong>
                            <span style={{ fontSize: "0.75rem", color: "#64848D" }}>
                              {post.scheduledAt
                                ? new Date(post.scheduledAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                                : ""}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`smp-status smp-status--${post.status}`}>
                            {post.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div className="smp-row-actions">
                            <button
                              className="smp-action-btn"
                              title="View Post Details"
                              onClick={() => setViewingPost(post)}
                            >
                              <FaEye size={12} />
                            </button>
                            <button
                              className="smp-action-btn smp-action-btn--danger"
                              title="Delete Post Schedule"
                              onClick={() => setDeletingPost(post)}
                            >
                              <FaTrash size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── Calendar Grid View (Week or Month) ── */
        <div className={`smp-grid smp-grid--${viewMode}`}>
          {days.map((day) => (
            <div
              key={day.date}
              className={`smp-day ${day.is_today ? "smp-day--today" : ""} ${!day.in_month ? "smp-day--outside" : ""}`}
            >
              <div className="smp-day-header">
                <span className="smp-day-weekday">{day.weekday}</span>
                <span className="smp-day-num">{day.day_num}</span>
              </div>

              <div className="smp-day-body">
                {day.posts.length === 0 ? (
                  <div className="smp-day-empty">—</div>
                ) : (
                  day.posts.map((post) => {
                    const ch = channelMeta(post.channel);
                    const Icon = ch.icon;
                    const timeStr = post.scheduledAt
                      ? new Date(post.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "Now";
                    return (
                      <div
                        key={post._id}
                        className={`smp-post-card smp-post-card--${post.status}`}
                        onClick={() => setViewingPost(post)}
                      >
                        <div className="smp-card-top">
                          <span className="smp-card-time">
                            <FaClock size={9} /> {timeStr}
                          </span>
                          <span className="smp-card-channel" style={{ color: ch.color }}>
                            <Icon size={12} />
                          </span>
                        </div>

                        <p className="smp-card-msg">{post.message}</p>

                        {post.templateId && (
                          <div className="smp-card-tpl">
                            <span>ID: {post.templateId.slice(0, 10)}…</span>
                          </div>
                        )}

                        <div className="smp-card-bottom">
                          <span className={`smp-pill smp-pill--${post.status}`}>
                            {post.status}
                          </span>
                          {post.mediaType === "video" && <FaVideo size={10} style={{ color: "#11B5BB" }} />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Schedule Post Modal ── */}
      {isCreateOpen && (
        <div className="smp-modal-overlay" onClick={() => setIsCreateOpen(false)}>
          <div className="smp-modal smp-modal--md" onClick={(e) => e.stopPropagation()}>
            <div className="smp-modal-head">
              <div>
                <h3 className="smp-modal-title">Schedule New Social Media Post</h3>
                <p className="smp-modal-sub">Broadcast video promotions &amp; deals directly to social channels</p>
              </div>
              <button className="smp-modal-close" onClick={() => setIsCreateOpen(false)}>
                <FaTimes size={15} />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="smp-modal-body">
              {/* Channel Selector */}
              <div className="smp-field">
                <label className="smp-label">Select Destination Channel</label>
                <div className="smp-channel-radios">
                  {CHANNELS.map((ch) => {
                    const Icon = ch.icon;
                    const isSelected = targetChannel === ch.id;
                    return (
                      <div
                        key={ch.id}
                        className={`smp-channel-opt ${isSelected ? "selected" : ""}`}
                        style={{
                          borderColor: isSelected ? ch.color : undefined,
                          background: isSelected ? ch.bg : undefined,
                        }}
                        onClick={() => setTargetChannel(ch.id)}
                      >
                        <Icon size={16} style={{ color: ch.color }} />
                        <span style={{ fontWeight: 700, fontSize: "0.82rem" }}>{ch.label}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Target Account Feedback */}
                {(targetChannel === "facebook" || targetChannel === "instagram") && (
                  <div style={{
                    marginTop: 8,
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: targetChannel === "facebook" ? "rgba(24, 119, 242, 0.08)" : "rgba(228, 64, 95, 0.08)",
                    border: `1px solid ${targetChannel === "facebook" ? "rgba(24, 119, 242, 0.25)" : "rgba(228, 64, 95, 0.25)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "0.8rem"
                  }}>
                    <span style={{ color: "#374151", fontWeight: 600 }}>
                      {targetChannel === "facebook" ? "📘 Publishing to FB Page:" : "📸 Publishing to IG Account:"}
                    </span>
                    <span style={{ fontWeight: 700, color: targetChannel === "facebook" ? "#1877F2" : "#E4405F" }}>
                      {targetChannel === "facebook" 
                        ? (storeSocial?.facebookPageName || (storeSocial?.facebookPageId ? `Page ID: ${storeSocial.facebookPageId}` : "Default System Page"))
                        : (storeSocial?.instagramUsername ? `@${storeSocial.instagramUsername.replace(/^@/, '')}` : (storeSocial?.instagramBusinessId ? `ID: ${storeSocial.instagramBusinessId}` : "Default System IG"))}
                    </span>
                  </div>
                )}
              </div>

              {/* Attach Template or Media */}
              <div className="smp-field">
                <label className="smp-label">Attach Video Template (Optional)</label>
                <select
                  className="smp-select"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  <option value="">— Choose from your Video Templates —</option>
                  {templates.map((tpl) => (
                    <option key={tpl._id} value={tpl._id}>
                      {tpl.templateName} (ID: {tpl._id})
                    </option>
                  ))}
                </select>
                {selectedTemplateId && (
                  <p className="smp-field-hint" style={{ color: "#11B5BB" }}>
                    Selected Template ID: <strong>{selectedTemplateId}</strong>
                  </p>
                )}
              </div>

              {/* Message / Caption */}
              <div className="smp-field">
                <label className="smp-label">
                  Post Caption &amp; Message <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <textarea
                  className="smp-textarea"
                  rows={4}
                  placeholder="e.g. 🔥 Weekend Mega Offer! Get 50% OFF on all signature dishes this Saturday & Sunday. Visit our store or order online today! #WeekendVibes #StoreSparc"
                  value={postMessage}
                  onChange={(e) => setPostMessage(e.target.value)}
                  required
                />
                <span className="smp-char-count">{postMessage.length} characters</span>
              </div>

              {/* Media URL / Upload */}
              <div className="smp-field">
                <label className="smp-label">Media Attachment URL</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="url"
                    className="smp-input"
                    placeholder="https://example.com/video.mp4 or CDN URL"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <select
                    className="smp-select"
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value as any)}
                    style={{ width: "120px" }}
                  >
                    <option value="video">🎬 Video</option>
                    <option value="image">🖼️ Image</option>
                    <option value="none">Text Only</option>
                  </select>
                </div>
              </div>

              {/* Timing & Publishing Mode */}
              <div className="smp-field" style={{ background: "#F8FAFB", padding: "14px", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
                <label className="smp-label" style={{ marginBottom: "8px" }}>Publishing Mode</label>
                <div style={{ display: "flex", gap: "16px", marginBottom: "12px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700, color: "#0B2830" }}>
                    <input
                      type="radio"
                      name="pubMode"
                      checked={publishMode === "schedule"}
                      onChange={() => setPublishMode("schedule")}
                      style={{ accentColor: "#11B5BB" }}
                    />
                    <span>📅 Schedule for Specific Time</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700, color: "#0B2830" }}>
                    <input
                      type="radio"
                      name="pubMode"
                      checked={publishMode === "now"}
                      onChange={() => setPublishMode("now")}
                      style={{ accentColor: "#11B5BB" }}
                    />
                    <span>🚀 Publish Immediately Now</span>
                  </label>
                </div>

                {publishMode === "schedule" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <span className="smp-sublabel">Date</span>
                      <input
                        type="date"
                        className="smp-input"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <span className="smp-sublabel">Time (Page Timezone)</span>
                      <input
                        type="time"
                        className="smp-input"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="smp-modal-foot">
                <button
                  type="button"
                  className="smp-btn smp-btn--secondary"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="smp-btn smp-btn--primary"
                  disabled={submitting || !postMessage.trim()}
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="smp-spin" size={13} /> Scheduling…
                    </>
                  ) : publishMode === "now" ? (
                    <>
                      <FaShareSquare size={13} /> Publish to {channelMeta(targetChannel).label} Now
                    </>
                  ) : (
                    <>
                      <FaCalendarAlt size={13} /> Schedule Post
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Post Modal ── */}
      {viewingPost && (
        <div className="smp-modal-overlay" onClick={() => setViewingPost(null)}>
          <div className="smp-modal smp-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="smp-modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {(() => {
                  const ch = channelMeta(viewingPost.channel);
                  const Icon = ch.icon;
                  return (
                    <div className="smp-channel-pill" style={{ color: ch.color, background: ch.bg }}>
                      <Icon size={14} />
                      <span>{ch.label}</span>
                    </div>
                  );
                })()}
                <span className={`smp-status smp-status--${viewingPost.status}`}>
                  {viewingPost.status.toUpperCase()}
                </span>
              </div>
              <button className="smp-modal-close" onClick={() => setViewingPost(null)}>
                <FaTimes size={15} />
              </button>
            </div>

            <div className="smp-modal-body">
              <div style={{ background: "#F8FAFB", padding: "16px", borderRadius: "10px", border: "1px solid #E2E8F0", fontSize: "0.92rem", lineHeight: 1.6, color: "#0B2830", whiteSpace: "pre-wrap" }}>
                {viewingPost.message}
              </div>

              {viewingPost.templateId && (
                <div style={{ marginTop: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "8px", padding: "8px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <FaFilm size={12} style={{ color: "#2563EB" }} />
                    <span style={{ fontSize: "0.78rem", color: "#1E40AF", fontWeight: 700 }}>
                      Template ID: <code>{viewingPost.templateId}</code>
                    </span>
                  </div>
                  <button
                    className="smp-copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(viewingPost.templateId!);
                      showToast(`Copied ID: ${viewingPost.templateId}`);
                    }}
                  >
                    <FaCopy size={11} /> Copy ID
                  </button>
                </div>
              )}

              {viewingPost.mediaUrl && (
                <div style={{ marginTop: "14px" }}>
                  <span className="smp-sublabel">Media Preview</span>
                  {viewingPost.mediaType === "video" ? (
                    <video src={viewingPost.mediaUrl} controls style={{ width: "100%", maxHeight: "220px", borderRadius: "8px", background: "#000" }} />
                  ) : (
                    <img src={viewingPost.mediaUrl} alt="Preview" style={{ width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: "8px" }} />
                  )}
                </div>
              )}

              <div style={{ marginTop: "14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.82rem" }}>
                <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px 10px" }}>
                  <span style={{ color: "#64848D", fontSize: "0.7rem", textTransform: "uppercase" }}>Scheduled Time</span>
                  <p style={{ margin: "2px 0 0", fontWeight: 700, color: "#0B2830" }}>
                    {viewingPost.scheduledAt
                      ? new Date(viewingPost.scheduledAt).toLocaleString()
                      : "Immediate"}
                  </p>
                </div>
                <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px 10px" }}>
                  <span style={{ color: "#64848D", fontSize: "0.7rem", textTransform: "uppercase" }}>Timezone</span>
                  <p style={{ margin: "2px 0 0", fontWeight: 700, color: "#0B2830" }}>
                    {viewingPost.timezone || "Asia/Kolkata"}
                  </p>
                </div>
              </div>
            </div>

            <div className="smp-modal-foot">
              <button
                className="smp-btn smp-btn--danger"
                onClick={() => {
                  setDeletingPost(viewingPost);
                }}
              >
                <FaTrash size={12} /> Cancel &amp; Delete Schedule
              </button>
              <button
                className="smp-btn smp-btn--secondary"
                onClick={() => setViewingPost(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Modal ── */}
      {deletingPost && (
        <div className="smp-modal-overlay" onClick={() => setDeletingPost(null)}>
          <div className="smp-modal smp-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="smp-modal-head">
              <h3 className="smp-modal-title" style={{ color: "#DC2626" }}>Cancel Post Schedule?</h3>
              <button className="smp-modal-close" onClick={() => setDeletingPost(null)}><FaTimes size={15} /></button>
            </div>
            <div className="smp-modal-body">
              <p style={{ color: "#475569", fontSize: "0.9rem", lineHeight: 1.6 }}>
                Are you sure you want to cancel and remove this scheduled post for <strong>{channelMeta(deletingPost.channel).label}</strong>? This will remove the post from your content calendar.
              </p>
            </div>
            <div className="smp-modal-foot">
              <button className="smp-btn smp-btn--secondary" onClick={() => setDeletingPost(null)}>
                Keep Schedule
              </button>
              <button className="smp-btn smp-btn--danger" onClick={handleDeletePost}>
                Yes, Delete Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CSS Styles ── */}
      <style>{`
        .smp-root {
          display: flex;
          flex-direction: column;
          gap: 20px;
          font-family: 'Inter', -apple-system, sans-serif;
          color: #0B2830;
        }

        .smp-toast {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 18px;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 700;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }
        .smp-toast--success { background: #DCFCE7; color: #15803D; border: 1px solid #86EFAC; }
        .smp-toast--error { background: #FEE2E2; color: #B91C1C; border: 1px solid #FCA5A5; }
        .smp-toast button { background: none; border: none; cursor: pointer; color: inherit; }

        /* Header */
        .smp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .smp-header__left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .smp-header__icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, #0B2830, #11B5BB);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(17, 181, 187, 0.25);
        }
        .smp-header__title {
          font-size: 1.45rem;
          font-weight: 800;
          color: #0B2830;
          margin: 0;
        }
        .smp-header__subtitle {
          font-size: 0.84rem;
          color: #64848D;
          margin: 3px 0 0;
        }
        .smp-header__actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* Buttons */
        .smp-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 18px;
          border-radius: 10px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .smp-btn--primary {
          background: linear-gradient(135deg, #0B2830, #11B5BB);
          color: #fff;
          box-shadow: 0 4px 12px rgba(17, 181, 187, 0.25);
        }
        .smp-btn--primary:hover {
          filter: brightness(1.1);
        }
        .smp-btn--secondary {
          background: #fff;
          color: #0B2830;
          border: 1.5px solid #CBD5E1;
        }
        .smp-btn--secondary:hover {
          background: #F8FAFC;
        }
        .smp-btn--danger {
          background: #DC2626;
          color: #fff;
        }
        .smp-btn--danger:hover {
          background: #B91C1C;
        }

        /* Toolbar */
        .smp-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fff;
          padding: 12px 18px;
          border-radius: 14px;
          border: 1px solid #E2E8F0;
          gap: 14px;
          flex-wrap: wrap;
        }
        .smp-view-tabs {
          display: flex;
          background: #F1F5F9;
          padding: 4px;
          border-radius: 10px;
          gap: 4px;
        }
        .smp-view-tab {
          border: none;
          background: transparent;
          padding: 6px 14px;
          border-radius: 7px;
          font-size: 0.78rem;
          font-weight: 700;
          color: #64748B;
          cursor: pointer;
          transition: all 0.2s;
        }
        .smp-view-tab.active {
          background: #fff;
          color: #0B2830;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }

        .smp-date-nav {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .smp-nav-btn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #475569;
        }
        .smp-today-btn {
          padding: 5px 12px;
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          background: #fff;
          font-size: 0.75rem;
          font-weight: 700;
          color: #0B2830;
          cursor: pointer;
        }
        .smp-date-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: #0B2830;
          margin-left: 6px;
        }
        .smp-tz-badge {
          background: #E0F2FE;
          color: #0284C7;
          font-size: 0.68rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .smp-channels-filter {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .smp-ch-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 11px;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
          background: #F8FAFC;
          font-size: 0.74rem;
          font-weight: 700;
          color: #64748B;
          cursor: pointer;
          transition: all 0.2s;
        }
        .smp-ch-btn.active {
          background: #0B2830;
          color: #fff;
          border-color: #0B2830;
        }

        /* Calendar Grid */
        .smp-grid {
          display: grid;
          gap: 10px;
        }
        .smp-grid--week {
          grid-template-columns: repeat(7, 1fr);
        }
        .smp-grid--month {
          grid-template-columns: repeat(7, 1fr);
        }

        .smp-day {
          background: #fff;
          border-radius: 12px;
          border: 1px solid #E2E8F0;
          display: flex;
          flex-direction: column;
          min-height: 180px;
          overflow: hidden;
          transition: all 0.2s;
        }
        .smp-day--today {
          border: 2px solid #11B5BB;
          box-shadow: 0 4px 14px rgba(17, 181, 187, 0.15);
        }
        .smp-day--outside {
          opacity: 0.55;
          background: #FAFAFA;
        }
        .smp-day-header {
          padding: 8px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #F8FAFC;
          border-bottom: 1px solid #E2E8F0;
        }
        .smp-day--today .smp-day-header {
          background: #EAF6F8;
        }
        .smp-day-weekday {
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          color: #64848D;
          letter-spacing: 0.04em;
        }
        .smp-day-num {
          font-size: 0.88rem;
          font-weight: 800;
          color: #0B2830;
        }
        .smp-day-body {
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
          overflow-y: auto;
        }
        .smp-day-empty {
          color: #CBD5E1;
          font-size: 0.8rem;
          text-align: center;
          margin-top: 30px;
        }

        /* Post Cards */
        .smp-post-card {
          background: #F8FAFB;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 8px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 5px;
          transition: all 0.2s;
        }
        .smp-post-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          border-color: #11B5BB;
        }
        .smp-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .smp-card-time {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.68rem;
          font-weight: 700;
          color: #64748B;
        }
        .smp-card-msg {
          margin: 0;
          font-size: 0.74rem;
          line-height: 1.35;
          color: #0B2830;
          font-weight: 600;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .smp-card-tpl {
          font-size: 0.65rem;
          color: #2563EB;
          font-family: monospace;
          background: #EFF6FF;
          padding: 2px 5px;
          border-radius: 4px;
          width: fit-content;
        }
        .smp-card-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 2px;
        }
        .smp-pill {
          font-size: 0.62rem;
          font-weight: 800;
          text-transform: uppercase;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .smp-pill--scheduled { background: #FEF3C7; color: #D97706; }
        .smp-pill--published { background: #DCFCE7; color: #16A34A; }
        .smp-pill--draft { background: #F1F5F9; color: #64748B; }
        .smp-pill--failed { background: #FEE2E2; color: #DC2626; }

        /* List View Table */
        .smp-card {
          background: #fff;
          border-radius: 14px;
          border: 1px solid #E2E8F0;
          overflow: hidden;
        }
        .smp-table-wrap {
          overflow-x: auto;
        }
        .smp-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .smp-table th {
          background: #F8FAFC;
          padding: 12px 16px;
          font-size: 0.75rem;
          font-weight: 800;
          color: #64848D;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid #E2E8F0;
        }
        .smp-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #F1F5F9;
          vertical-align: middle;
        }
        .smp-channel-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 800;
        }
        .smp-msg-preview {
          margin: 0;
          max-width: 320px;
          font-size: 0.82rem;
          color: #1E293B;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .smp-id-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 8px;
          background: #EFF6FF;
          border: 1px solid #BFDBFE;
          border-radius: 6px;
          cursor: pointer;
          color: #1E40AF;
          font-size: 0.72rem;
        }
        .smp-id-badge:hover {
          background: #DBEAFE;
        }
        .smp-media-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 7px;
          background: #F1F5F9;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 700;
          color: #475569;
        }
        .smp-status {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 800;
        }
        .smp-status--scheduled { background: #FEF3C7; color: #B45309; }
        .smp-status--published { background: #DCFCE7; color: #15803D; }
        .smp-status--draft { background: #F1F5F9; color: #475569; }
        .smp-status--failed { background: #FEE2E2; color: #B91C1C; }

        .smp-row-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .smp-action-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
          background: #fff;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .smp-action-btn:hover {
          background: #F8FAFC;
          color: #0B2830;
        }
        .smp-action-btn--danger:hover {
          background: #FEE2E2;
          color: #DC2626;
          border-color: #FCA5A5;
        }

        /* Modal */
        .smp-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }
        .smp-modal {
          background: #fff;
          border-radius: 16px;
          width: 100%;
          box-shadow: 0 20px 50px rgba(0,0,0,0.3);
          max-height: 90vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .smp-modal--md { max-width: 600px; }
        .smp-modal--sm { max-width: 480px; }
        .smp-modal-head {
          padding: 20px 24px;
          border-bottom: 1px solid #E2E8F0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .smp-modal-title { margin: 0; font-size: 1.15rem; font-weight: 800; color: #0B2830; }
        .smp-modal-sub { margin: 3px 0 0; font-size: 0.8rem; color: #64848D; }
        .smp-modal-close { background: none; border: none; cursor: pointer; color: #94A3B8; }
        .smp-modal-close:hover { color: #0B2830; }
        .smp-modal-body { padding: 22px 24px; display: flex; flex-direction: column; gap: 16px; }
        .smp-modal-foot { padding: 16px 24px; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; justify-content: flex-end; gap: 10px; }

        .smp-field { display: flex; flex-direction: column; gap: 6px; }
        .smp-label { font-size: 0.8rem; font-weight: 800; color: #0B2830; text-transform: uppercase; letter-spacing: 0.04em; }
        .smp-sublabel { font-size: 0.72rem; font-weight: 700; color: #64748B; text-transform: uppercase; display: block; margin-bottom: 4px; }
        .smp-input, .smp-select, .smp-textarea {
          width: 100%;
          border: 1.5px solid #CBD5E1;
          border-radius: 9px;
          padding: 9px 12px;
          font-size: 0.85rem;
          color: #0B2830;
          outline: none;
          background: #fff;
          font-family: inherit;
        }
        .smp-input:focus, .smp-select:focus, .smp-textarea:focus {
          border-color: #11B5BB;
          box-shadow: 0 0 0 3px rgba(17, 181, 187, 0.15);
        }
        .smp-char-count { font-size: 0.72rem; color: #94A3B8; text-align: right; }
        .smp-field-hint { margin: 4px 0 0; font-size: 0.76rem; }

        .smp-channel-radios {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .smp-channel-opt {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 9px;
          border: 1.5px solid #E2E8F0;
          cursor: pointer;
          background: #F8FAFC;
          transition: all 0.2s;
        }
        .smp-channel-opt:hover {
          border-color: #CBD5E1;
        }
        .smp-channel-opt.selected {
          border-width: 2px;
        }

        .smp-copy-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #fff;
          border: 1px solid #BFDBFE;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #1E40AF;
          cursor: pointer;
        }

        .smp-spin { animation: smp-rotate 1s linear infinite; }
        @keyframes smp-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .smp-empty { text-align: center; padding: 40px 20px; color: #64848D; }
        .smp-empty h4 { margin: 12px 0 4px; color: #0B2830; font-size: 1.05rem; }
        .smp-empty p { margin: 0; font-size: 0.85rem; }

        .smp-loading { text-align: center; padding: 60px 20px; color: #11B5BB; }
        .smp-loading p { margin-top: 12px; font-weight: 600; font-size: 0.9rem; color: #64848D; }

        @media (max-width: 1024px) {
          .smp-grid--week, .smp-grid--month {
            grid-template-columns: repeat(2, 1fr);
          }
          .smp-channel-radios {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
