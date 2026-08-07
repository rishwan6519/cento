"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  FaFilm, FaEdit, FaTrash, FaSearch, FaPlus, FaTimes,
  FaEye, FaChevronLeft, FaChevronRight, FaMagic, FaSpinner,
} from "react-icons/fa";

// ─── Types ───────────────────────────────────────────────────────────────────
export type TemplateStatus = "Active" | "Inactive";

export interface VideoTemplate {
  _id: string;
  storeUserId?: string;
  templateName: string;
  templateDescription?: string;
  description?: string;    // dummy templates store it here
  aspectRatio?: string;
  videoDuration?: number;
  animationStyle?: string;
  language?: string;
  aiModel?: string;
  status: TemplateStatus;
  isDummy?: boolean;
  isDummyOverride?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function getDescription(t: VideoTemplate): string {
  return t.templateDescription || t.description || "";
}

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast: React.FC<{ message: string; type: "success" | "error"; onClose: () => void }> = ({ message, type, onClose }) => (
  <div className={`aivt-toast aivt-toast--${type}`}>
    <span>{message}</span>
    <button className="aivt-toast__close" onClick={onClose}><FaTimes size={12} /></button>
  </div>
);

// ─── Skeleton ────────────────────────────────────────────────────────────────
const SkeletonRow: React.FC = () => (
  <tr className="aivt-skeleton-row">
    {Array.from({ length: 5 }).map((_, i) => (
      <td key={i}><div className="aivt-skeleton-cell" /></td>
    ))}
  </tr>
);

// ─── View Modal ───────────────────────────────────────────────────────────────
const ViewModal: React.FC<{ template: VideoTemplate; onClose: () => void; onEdit: () => void }> = ({ template, onClose, onEdit }) => (
  <div className="aivt-modal-overlay" onClick={onClose}>
    <div className="aivt-modal aivt-modal--lg" onClick={(e) => e.stopPropagation()}>
      <div className="aivt-modal__header">
        <div className="aivt-modal__icon"><FaFilm size={18} /></div>
        <div>
          <h3 className="aivt-modal__title">{template.templateName}</h3>
          <p className="aivt-modal__subtitle">AI Video Template Description</p>
        </div>
        <button className="aivt-modal__close" onClick={onClose}><FaTimes size={16} /></button>
      </div>
      <div className="aivt-modal__body">
        {template.isDummy && (
          <div style={{ background: "linear-gradient(135deg, #EFF6FF, #EEF2FF)", border: "1px solid #C7D2FE", borderRadius: 10, padding: "10px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", color: "#4338CA", fontWeight: 600 }}>
            🔒 Built-in Template — Click Edit to customise &amp; save your own version
          </div>
        )}
        <div style={{ background: "#F8FAFB", border: "1.5px solid #EAEFEF", borderRadius: 12, padding: "20px 22px", lineHeight: 1.8, fontSize: "0.9rem", color: "#162B30", whiteSpace: "pre-wrap" }}>
          {getDescription(template) || "No description available."}
        </div>
        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            ["Aspect Ratio", template.aspectRatio || "—"],
            ["Duration", template.videoDuration ? `${template.videoDuration}s` : "—"],
            ["Animation", template.animationStyle || "—"],
            ["Language", template.language || "English"],
            ["AI Engine", template.aiModel || "Veo 3.1"],
            ["Status", template.status],
          ].map(([label, val]) => (
            <div key={label} style={{ background: "#fff", border: "1px solid #EAEFEF", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ margin: 0, fontSize: "0.68rem", color: "#A4B6B9", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
              <p style={{ margin: "4px 0 0", fontSize: "0.88rem", fontWeight: 700, color: "#0B2830" }}>{val}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="aivt-modal__actions">
        <button className="aivt-btn-cancel" onClick={onClose}>Close</button>
        <button className="aivt-btn-primary" onClick={onEdit}><FaEdit size={12} /> Edit This Template</button>
      </div>
    </div>
  </div>
);

// ─── Delete Modal ─────────────────────────────────────────────────────────────
const DeleteModal: React.FC<{ templateName: string; onConfirm: () => void; onCancel: () => void; deleting: boolean }> = ({ templateName, onConfirm, onCancel, deleting }) => (
  <div className="aivt-modal-overlay" onClick={onCancel}>
    <div className="aivt-modal" onClick={(e) => e.stopPropagation()}>
      <div className="aivt-modal__header">
        <div className="aivt-modal__icon aivt-modal__icon--danger"><FaTrash size={18} /></div>
        <h3 className="aivt-modal__title">Delete Template</h3>
      </div>
      <div className="aivt-modal__body">
        <p className="aivt-modal__message">Are you sure you want to delete this video template?</p>
        <p className="aivt-modal__template-name">"{templateName}"</p>
        <p className="aivt-modal__warning">Any automated jobs relying on this ID will need to be updated.</p>
      </div>
      <div className="aivt-modal__actions">
        <button className="aivt-btn-cancel" onClick={onCancel} disabled={deleting}>Cancel</button>
        <button className="aivt-btn-delete" onClick={onConfirm} disabled={deleting}>
          {deleting ? <span className="aivt-spinner" /> : <FaTrash size={12} />}
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AIVideoTemplatesView() {
  // ── Form State ──────────────────────────────────────────────────────────────
  const [editingTemplate, setEditingTemplate] = useState<VideoTemplate | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<VideoTemplate | null>(null);

  // Simplified form: just name + description + minimal specs
  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [videoDuration, setVideoDuration] = useState<number>(8);
  const [animationStyle, setAnimationStyle] = useState("Fade");
  const [language, setLanguage] = useState("English");
  const [aiModel, setAiModel] = useState("Veo 3.1");
  const [status, setStatus] = useState<TemplateStatus>("Active");

  const [synthesising, setSynthesising] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // ── Table State ─────────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<VideoTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<VideoTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const LIMIT = 10;

  const getAuthHeaders = useCallback((): HeadersInit => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Fetch Templates ─────────────────────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort: "createdAt", order: "desc" });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/video-template?${params.toString()}`, { headers: getAuthHeaders() });
      const data = await res.json();
      setTemplates(data.success ? (data.data || []) : []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [search, getAuthHeaders]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const totalPages = Math.max(1, Math.ceil(templates.length / LIMIT));
  const displayedTemplates = templates.slice((page - 1) * LIMIT, page * LIMIT);

  // ── Reset Form ──────────────────────────────────────────────────────────────
  const resetForm = () => {
    setEditingTemplate(null);
    setTemplateName("");
    setDescription("");
    setAspectRatio("9:16");
    setVideoDuration(8);
    setAnimationStyle("Fade");
    setLanguage("English");
    setAiModel("Veo 3.1");
    setStatus("Active");
    setFormErrors({});
  };

  // ── Prefill Edit ────────────────────────────────────────────────────────────
  const handleEdit = (t: VideoTemplate) => {
    setViewingTemplate(null);
    setEditingTemplate(t);
    setTemplateName(t.templateName);
    setDescription(getDescription(t));
    setAspectRatio(t.aspectRatio || "9:16");
    setVideoDuration(t.videoDuration || 8);
    setAnimationStyle(t.animationStyle || "Fade");
    setLanguage(t.language || "English");
    setAiModel(t.aiModel || "Veo 3.1");
    setStatus(t.status || "Active");
    setFormErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── AI Synthesise ────────────────────────────────────────────────────────────
  const handleSynthesise = async () => {
    if (!description.trim()) {
      showToast("Please write some rough notes before synthesising", "error");
      return;
    }
    setSynthesising(true);
    try {
      const res = await fetch("/api/ai-template-synthesise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: description, templateName }),
      });
      const data = await res.json();
      if (data.success && data.description) {
        setDescription(data.description);
        showToast("✨ Description synthesised by AI!", "success");
      } else {
        showToast(data.message || "AI synthesis failed", "error");
      }
    } catch {
      showToast("Network error during synthesis", "error");
    } finally {
      setSynthesising(false);
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!templateName.trim()) errors.templateName = "Template name is required";
    if (!description.trim()) errors.description = "Description is required";
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const payload: any = {
        templateName: templateName.trim(),
        templateDescription: description.trim(),
        description: description.trim(),
        aspectRatio,
        videoDuration: Number(videoDuration),
        animationStyle,
        language,
        aiModel,
        status,
      };

      const isDummy = editingTemplate?.isDummy;
      const isEdit = !!editingTemplate;

      let url: string;
      let method: string;

      if (isDummy) {
        // Dummy override: POST with the dummy's _id so it upserts in DB
        payload._id = editingTemplate!._id;
        url = "/api/video-template";
        method = "POST";
      } else if (isEdit) {
        url = `/api/video-template/${editingTemplate!._id}`;
        method = "PUT";
      } else {
        url = "/api/video-template";
        method = "POST";
      }

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        showToast(isEdit ? "Template updated successfully!" : "Template created successfully!", "success");
        resetForm();
        setPage(1);
        fetchTemplates();
      } else {
        showToast(data.message || "Something went wrong", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    // Dummy templates that haven't been saved to DB can't be deleted
    if (deleteTarget.isDummy) {
      showToast("Built-in templates cannot be deleted. Edit them to customise.", "error");
      setDeleteTarget(null);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/video-template/${deleteTarget._id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Template deleted successfully!", "success");
        setDeleteTarget(null);
        if (displayedTemplates.length === 1 && page > 1) setPage((p) => p - 1);
        else fetchTemplates();
      } else {
        showToast(data.message || "Failed to delete template", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="aivt-root">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {viewingTemplate && <ViewModal template={viewingTemplate} onClose={() => setViewingTemplate(null)} onEdit={() => handleEdit(viewingTemplate)} />}
      {deleteTarget && <DeleteModal templateName={deleteTarget.templateName} onConfirm={handleDeleteConfirm} onCancel={() => setDeleteTarget(null)} deleting={deleting} />}

      {/* ── Page Header ── */}
      <div className="aivt-page-header">
        <div className="aivt-page-header__icon"><FaFilm size={18} /></div>
        <div>
          <h1 className="aivt-page-header__title">AI Video Templates</h1>
          <p className="aivt-page-header__subtitle">Describe your template in plain text — AI synthesises the full configuration</p>
        </div>
      </div>

      {/* ── Create / Edit Form ── */}
      <div className="aivt-card">
        <div className="aivt-card__header">
          <div className="aivt-card__header-left">
            <div className="aivt-card__header-icon">{editingTemplate ? <FaEdit size={14} /> : <FaPlus size={14} />}</div>
            <div>
              <h2 className="aivt-card__title">{editingTemplate ? "Edit Video Template" : "Create New Video Template"}</h2>
              <p className="aivt-card__subtitle">
                {editingTemplate
                  ? editingTemplate.isDummy
                    ? `Editing built-in template "${editingTemplate.templateName}" — your edits will be saved and override the original`
                    : `Editing "${editingTemplate.templateName}" — ID: ${editingTemplate._id}`
                  : "Describe your template in plain text, then click ✨ AI Synthesise to refine it"}
              </p>
            </div>
          </div>
          {editingTemplate && (
            <button className="aivt-btn-cancel-edit" onClick={resetForm}>
              <FaTimes size={12} /> Cancel Edit
            </button>
          )}
        </div>

        <form className="aivt-card__body" onSubmit={handleSubmit} noValidate>

          {/* Dummy notice */}
          {editingTemplate?.isDummy && (
            <div style={{ background: "linear-gradient(135deg, #EFF6FF, #EEF2FF)", border: "1px solid #C7D2FE", borderRadius: 12, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 12, fontSize: "0.85rem", color: "#4338CA" }}>
              <span style={{ fontSize: "1.1rem", marginTop: 1 }}>🔒</span>
              <div>
                <strong>Built-in Template</strong> — Edit the description below and click <strong>Save Template</strong>. Your version will override this built-in template and appear in all APIs.
              </div>
            </div>
          )}

          {/* ── Template Name ── */}
          <div className="aivt-form-group" style={{ marginBottom: 20 }}>
            <label className="aivt-form-label" htmlFor="t-name">
              Template Name <span className="aivt-required">*</span>
            </label>
            <input
              id="t-name"
              type="text"
              className={`aivt-form-input ${formErrors.templateName ? "aivt-form-input--error" : ""}`}
              placeholder="e.g. Weekend Flash Sale — 9:16 Vertical"
              value={templateName}
              onChange={(e) => { setTemplateName(e.target.value); if (formErrors.templateName) setFormErrors((p) => ({ ...p, templateName: "" })); }}
            />
            {formErrors.templateName && <span className="aivt-form-error">{formErrors.templateName}</span>}
          </div>

          {/* ── Description / AI Prompt ── */}
          <div className="aivt-form-group" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label className="aivt-form-label" htmlFor="t-desc">
                Template Description / AI Brief <span className="aivt-required">*</span>
              </label>
              <button
                type="button"
                id="aivt-synthesise-btn"
                className="aivt-btn-synthesise"
                onClick={handleSynthesise}
                disabled={synthesising || !description.trim()}
                title="Let AI refine your rough notes into a professional template description"
              >
                {synthesising
                  ? <><FaSpinner style={{ animation: "aivt-spin 0.8s linear infinite" }} size={11} /> Synthesising…</>
                  : <><FaMagic size={11} /> ✨ AI Synthesise</>}
              </button>
            </div>
            <textarea
              id="t-desc"
              className={`aivt-form-input aivt-textarea ${formErrors.description ? "aivt-form-input--error" : ""}`}
              rows={10}
              placeholder={`Write rough notes about your template here, for example:\n\n"Orange and purple brand colors. Logo top-left. Product image on the right side. Discount label '50% OFF' in bold. Animate with energetic bounce effect. 9:16 vertical for Instagram Reels. 8 seconds looping. Use Google Veo engine. English language."\n\nThen click ✨ AI Synthesise to turn your notes into a professional template description.`}
              value={description}
              onChange={(e) => { setDescription(e.target.value); if (formErrors.description) setFormErrors((p) => ({ ...p, description: "" })); }}
            />
            {formErrors.description && <span className="aivt-form-error">{formErrors.description}</span>}
            <p style={{ margin: "6px 0 0", fontSize: "0.76rem", color: "#A4B6B9" }}>
              Tip: Write your rough notes first, then click <strong>✨ AI Synthesise</strong> to get a polished, production-ready description.
            </p>
          </div>

          {/* ── Video Specs ── */}
          <div className="aivt-specs-grid" style={{ marginBottom: 24 }}>
            <div className="aivt-form-group">
              <label className="aivt-form-label" htmlFor="v-aspect">Aspect Ratio</label>
              <select id="v-aspect" className="aivt-form-select" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                <option value="9:16">9:16 — Vertical Reel / TikTok</option>
                <option value="16:9">16:9 — Landscape Display / TV</option>
                <option value="1:1">1:1 — Square Ad / Feed</option>
                <option value="4:3">4:3 — Classic Screen</option>
              </select>
            </div>
            <div className="aivt-form-group">
              <label className="aivt-form-label" htmlFor="v-dur">Video Duration</label>
              <select id="v-dur" className="aivt-form-select" value={videoDuration} onChange={(e) => setVideoDuration(Number(e.target.value))}>
                <option value={5}>5 Seconds</option>
                <option value={6}>6 Seconds</option>
                <option value={8}>8 Seconds</option>
                <option value={10}>10 Seconds</option>
                <option value={15}>15 Seconds</option>
                <option value={30}>30 Seconds</option>
              </select>
            </div>
            <div className="aivt-form-group">
              <label className="aivt-form-label" htmlFor="v-anim">Animation Style</label>
              <select id="v-anim" className="aivt-form-select" value={animationStyle} onChange={(e) => setAnimationStyle(e.target.value)}>
                <option value="Fade">Fade &amp; Dissolve</option>
                <option value="Slide">Dynamic Slide</option>
                <option value="Zoom">Cinematic Zoom</option>
                <option value="Bounce">Energetic Bounce</option>
                <option value="Kinetic">Kinetic Typography</option>
                <option value="Pulse">Pulse Glow</option>
              </select>
            </div>
            <div className="aivt-form-group">
              <label className="aivt-form-label" htmlFor="v-lang">Language</label>
              <select id="v-lang" className="aivt-form-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Arabic">Arabic</option>
                <option value="Hindi">Hindi</option>
                <option value="Malayalam">Malayalam</option>
              </select>
            </div>
            <div className="aivt-form-group">
              <label className="aivt-form-label" htmlFor="v-model">AI Video Engine</label>
              <select id="v-model" className="aivt-form-select" value={aiModel} onChange={(e) => setAiModel(e.target.value)}
                style={{ fontWeight: 700, color: aiModel.includes("Google") ? "#1A73E8" : "#202124", border: aiModel.includes("Google") ? "2px solid #4285F4" : undefined }}>
                <option value="Veo 3.1">🎬 Google Flow Veo 3.1</option>
                <option value="Veo 3.1">🎬 Google Flow Veo 3.1</option>
                <option value="Wan 2.1">⚡ Wan 2.1 (Fal AI)</option>
                <option value="Wan Pro">🔥 Wan Pro (Fal AI)</option>
                <option value="Kling 2.0 Pro">✨ Kling 2.0 Pro (Fal AI)</option>
              </select>
            </div>
            <div className="aivt-form-group">
              <label className="aivt-form-label" htmlFor="v-status">Status</label>
              <select id="v-status" className="aivt-form-select" value={status} onChange={(e) => setStatus(e.target.value as TemplateStatus)}>
                <option value="Active">Active (Available for AI Video API)</option>
                <option value="Inactive">Inactive (Archived / Draft)</option>
              </select>
            </div>
          </div>

          {/* ── Form Actions ── */}
          <div className="aivt-form-actions">
            <button type="button" className="aivt-btn-outline" onClick={resetForm} disabled={submitting}>Reset</button>
            <button type="submit" className="aivt-btn-primary" disabled={submitting}>
              {submitting
                ? <><span className="aivt-spinner" />{editingTemplate ? "Updating…" : "Saving…"}</>
                : editingTemplate
                  ? <><FaEdit size={12} /> Update Template</>
                  : <><FaPlus size={12} /> Save Template</>}
            </button>
          </div>
        </form>
      </div>

      {/* ── Templates Table ── */}
      <div className="aivt-card">
        <div className="aivt-card__header">
          <div className="aivt-card__header-left">
            <div className="aivt-card__header-icon"><FaFilm size={14} /></div>
            <div>
              <h2 className="aivt-card__title">My AI Video Templates</h2>
              <p className="aivt-card__subtitle">{templates.length} template{templates.length !== 1 ? "s" : ""} configured</p>
            </div>
          </div>
          <form className="aivt-search-form" onSubmit={handleSearch}>
            <div className="aivt-search-wrap">
              <FaSearch className="aivt-search-icon" size={13} />
              <input
                type="text"
                className="aivt-search-input"
                placeholder="Search templates…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button type="button" className="aivt-search-clear" onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}>
                  <FaTimes size={10} />
                </button>
              )}
            </div>
            <button type="submit" className="aivt-btn-search">Search</button>
          </form>
        </div>

        <div className="aivt-table-wrap">
          <table className="aivt-table">
            <thead>
              <tr>
                <th>Template Name</th>
                <th>Description Preview</th>
                <th>Specs</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
                : displayedTemplates.length === 0
                  ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="aivt-empty-state">
                          <div className="aivt-empty-state__icon"><FaFilm size={28} /></div>
                          <p className="aivt-empty-state__title">No templates found</p>
                          <p className="aivt-empty-state__subtitle">
                            {search ? "No templates match your search. Try another term." : "Create your first AI video template above."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )
                  : displayedTemplates.map((t) => {
                    const desc = getDescription(t);
                    return (
                      <tr key={String(t._id)} className="aivt-table-row">
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            <strong style={{ color: "#0B2830" }}>{t.templateName}</strong>
                            {t.isDummy && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "linear-gradient(90deg,#EFF6FF,#EEF2FF)", color: "#4338CA", border: "1px solid #C7D2FE", borderRadius: 12, padding: "2px 9px", fontSize: "0.68rem", fontWeight: 700, width: "fit-content" }}>
                                🔒 Built-in
                              </span>
                            )}
                            {t.isDummyOverride && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#FFF7ED", color: "#C2410C", border: "1px solid #FED7AA", borderRadius: 12, padding: "2px 9px", fontSize: "0.68rem", fontWeight: 700, width: "fit-content" }}>
                                ✏️ Customised
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: "0.82rem", color: "#64848D", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {desc || "No description"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.78rem" }}>
                            <span style={{ background: "#EAF6F8", color: "#0B2830", padding: "2px 8px", borderRadius: 6, fontWeight: 700, width: "fit-content" }}>{t.aspectRatio || "—"}</span>
                            <span style={{ color: "#64848D" }}>{t.videoDuration ? `${t.videoDuration}s` : "—"} · {t.animationStyle || "—"}</span>
                            <span style={{ background: (t.aiModel || "").includes("Google") ? "#E8F0FE" : "#F3E8FF", color: (t.aiModel || "").includes("Google") ? "#1A73E8" : "#6B21A8", padding: "2px 7px", borderRadius: 6, fontWeight: 600, fontSize: "0.7rem", width: "fit-content" }}>
                              🎬 {t.aiModel || "Veo 3.1"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`aivt-status-badge aivt-status-badge--${(t.status || "Active").toLowerCase()}`}>
                            {t.status || "Active"}
                          </span>
                        </td>
                        <td>
                          <div className="aivt-actions">
                            <button className="aivt-action-btn aivt-action-btn--view" title="View" onClick={() => setViewingTemplate(t)}>
                              <FaEye size={13} />
                            </button>
                            <button className="aivt-action-btn aivt-action-btn--edit" title="Edit" onClick={() => handleEdit(t)}>
                              <FaEdit size={13} />
                            </button>
                            {!t.isDummy && (
                              <button className="aivt-action-btn aivt-action-btn--delete" title="Delete" onClick={() => setDeleteTarget(t)}>
                                <FaTrash size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="aivt-pagination">
            <span className="aivt-pagination__info">Page {page} of {totalPages} ({templates.length} total)</span>
            <div className="aivt-pagination__btns">
              <button className="aivt-page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><FaChevronLeft size={11} /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button key={pageNum} className={`aivt-page-btn aivt-page-btn--num ${page === pageNum ? "aivt-page-btn--active" : ""}`} onClick={() => setPage(pageNum)}>{pageNum}</button>
              ))}
              <button className="aivt-page-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><FaChevronRight size={11} /></button>
            </div>
          </div>
        )}
      </div>

      {/* ── Styles ── */}
      <style>{`
        .aivt-root { display: flex; flex-direction: column; gap: 24px; font-family: 'Inter', sans-serif; }
        .aivt-toast { position: fixed; top: 24px; right: 24px; z-index: 9999; display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-radius: 10px; font-size: 0.875rem; font-weight: 600; box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
        .aivt-toast--success { background: #DCFCE7; color: #166534; border: 1px solid #BBF7D0; }
        .aivt-toast--error { background: #FEE2E2; color: #991B1B; border: 1px solid #FECACA; }
        .aivt-toast__close { background: none; border: none; cursor: pointer; color: inherit; opacity: 0.6; margin-left: auto; display: flex; align-items: center; }

        .aivt-page-header { display: flex; align-items: center; gap: 14px; }
        .aivt-page-header__icon { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #0B2830, #11B5BB); display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; box-shadow: 0 4px 10px rgba(17,181,187,0.2); }
        .aivt-page-header__title { font-size: 1.5rem; font-weight: 800; color: #0B2830; margin: 0; }
        .aivt-page-header__subtitle { font-size: 0.85rem; color: #64848D; margin: 3px 0 0; }

        .aivt-card { background: #fff; border-radius: 18px; border: 1px solid #EAEFEF; box-shadow: 0 4px 20px rgba(0,0,0,0.03); overflow: hidden; }
        .aivt-card__header { padding: 22px 28px; border-bottom: 1px solid #EAEFEF; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; background: #FAFDFE; }
        .aivt-card__header-left { display: flex; align-items: center; gap: 12px; }
        .aivt-card__header-icon { width: 36px; height: 36px; border-radius: 9px; background: #0B2830; color: #fff; display: flex; align-items: center; justify-content: center; }
        .aivt-card__title { font-size: 1.08rem; font-weight: 700; color: #0B2830; margin: 0; }
        .aivt-card__subtitle { font-size: 0.78rem; color: #64848D; margin: 2px 0 0; }
        .aivt-btn-cancel-edit { background: #FFF2F2; color: #DC2626; border: 1px solid #FECACA; border-radius: 8px; padding: 8px 14px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; }

        .aivt-card__body { padding: 28px; }
        .aivt-form-group { display: flex; flex-direction: column; }
        .aivt-form-label { font-size: 0.8rem; font-weight: 600; color: #162B30; }
        .aivt-required { color: #DC2626; }
        .aivt-form-input, .aivt-form-select { background: #F8FAFB; border: 1.5px solid #EAEFEF; border-radius: 10px; padding: 11px 14px; font-size: 0.88rem; color: #162B30; font-weight: 500; outline: none; transition: all 0.15s; width: 100%; font-family: inherit; box-sizing: border-box; }
        .aivt-form-input:focus, .aivt-form-select:focus { border-color: #11B5BB; background: #fff; box-shadow: 0 0 0 3px rgba(17,181,187,0.12); }
        .aivt-form-input--error { border-color: #DC2626 !important; background: #FFF9F9 !important; }
        .aivt-form-error { font-size: 0.72rem; color: #DC2626; font-weight: 600; margin-top: 4px; }
        .aivt-textarea { resize: vertical; line-height: 1.7; }

        .aivt-btn-synthesise { display: flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #7C3AED, #A855F7); color: #fff; border: none; border-radius: 8px; padding: 8px 16px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .aivt-btn-synthesise:hover { background: linear-gradient(135deg, #6D28D9, #9333EA); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(124,58,237,0.3); }
        .aivt-btn-synthesise:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .aivt-specs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; background: #F8FAFB; border: 1.5px solid #EAEFEF; border-radius: 14px; padding: 20px; }
        @media (max-width: 900px) { .aivt-specs-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .aivt-specs-grid { grid-template-columns: 1fr; } }

        .aivt-form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; padding-top: 18px; border-top: 1px solid #EAEFEF; }
        .aivt-btn-outline { background: #fff; border: 1.5px solid #EAEFEF; color: #64848D; border-radius: 10px; padding: 12px 24px; font-size: 0.88rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
        .aivt-btn-outline:hover { border-color: #64848D; color: #0B2830; }
        .aivt-btn-primary { background: #F05A28; color: #fff; border: none; border-radius: 10px; padding: 12px 28px; font-size: 0.88rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.15s; }
        .aivt-btn-primary:hover { background: #DC4B1D; }
        .aivt-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .aivt-btn-cancel { background: #fff; border: 1px solid #EAEFEF; color: #64848D; border-radius: 9px; padding: 10px 20px; font-size: 0.85rem; font-weight: 700; cursor: pointer; }
        .aivt-btn-delete { background: #DC2626; color: #fff; border: none; border-radius: 9px; padding: 10px 22px; font-size: 0.85rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; }

        .aivt-search-form { display: flex; gap: 10px; }
        .aivt-search-wrap { position: relative; display: flex; align-items: center; width: 260px; }
        .aivt-search-icon { position: absolute; left: 14px; color: #A4B6B9; pointer-events: none; }
        .aivt-search-input { width: 100%; background: #F8FAFB; border: 1.5px solid #EAEFEF; border-radius: 9px; padding: 9px 32px; font-size: 0.84rem; outline: none; }
        .aivt-search-input:focus { border-color: #11B5BB; }
        .aivt-search-clear { position: absolute; right: 10px; background: #E0E7EA; border: none; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64848D; }
        .aivt-btn-search { background: #0B2830; color: #fff; border: none; border-radius: 9px; padding: 9px 18px; font-size: 0.84rem; font-weight: 700; cursor: pointer; }

        .aivt-table-wrap { overflow-x: auto; }
        .aivt-table { width: 100%; border-collapse: collapse; text-align: left; }
        .aivt-table th { background: #F4F8FA; padding: 14px 20px; font-size: 0.75rem; font-weight: 700; color: #64848D; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #EAEFEF; }
        .aivt-table td { padding: 16px 20px; font-size: 0.88rem; color: #162B30; border-bottom: 1px solid #F0F4F6; vertical-align: middle; }
        .aivt-table-row:hover { background: #FAFDFE; }

        .aivt-status-badge { display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 20px; font-size: 0.74rem; font-weight: 700; }
        .aivt-status-badge--active { background: #DCFCE7; color: #166534; border: 1px solid #BBF7D0; }
        .aivt-status-badge--inactive { background: #F1F5F9; color: #64748B; border: 1px solid #E2E8F0; }

        .aivt-actions { display: flex; align-items: center; justify-content: center; gap: 8px; }
        .aivt-action-btn { width: 32px; height: 32px; border: 1px solid #EAEFEF; border-radius: 8px; background: #F8FAFB; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; }
        .aivt-action-btn--view { color: #11B5BB; } .aivt-action-btn--view:hover { background: #11B5BB; color: #fff; border-color: #11B5BB; }
        .aivt-action-btn--edit { color: #F05A28; } .aivt-action-btn--edit:hover { background: #F05A28; color: #fff; border-color: #F05A28; }
        .aivt-action-btn--delete { color: #DC2626; } .aivt-action-btn--delete:hover { background: #DC2626; color: #fff; border-color: #DC2626; }

        .aivt-empty-state { padding: 60px 20px; text-align: center; color: #64848D; }
        .aivt-empty-state__icon { width: 56px; height: 56px; border-radius: 16px; background: #E0E7EA; color: #64848D; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
        .aivt-empty-state__title { font-size: 1.05rem; font-weight: 700; color: #162B30; margin: 0 0 6px; }
        .aivt-empty-state__subtitle { font-size: 0.85rem; margin: 0; }

        .aivt-pagination { padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; background: #FAFDFE; border-top: 1px solid #EAEFEF; }
        .aivt-pagination__info { font-size: 0.82rem; color: #64848D; font-weight: 500; }
        .aivt-pagination__btns { display: flex; gap: 6px; }
        .aivt-page-btn { background: #F8FAFB; border: 1px solid #EAEFEF; color: #162B30; width: 30px; height: 30px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
        .aivt-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .aivt-page-btn--active { background: #0B2830; color: #fff; border-color: #0B2830; }

        .aivt-modal-overlay { position: fixed; inset: 0; background: rgba(11,40,48,0.65); backdrop-filter: blur(4px); z-index: 999; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .aivt-modal { background: #fff; border-radius: 20px; width: 100%; max-width: 440px; box-shadow: 0 20px 50px rgba(0,0,0,0.2); overflow: hidden; }
        .aivt-modal--lg { max-width: 700px; max-height: 90vh; display: flex; flex-direction: column; }
        .aivt-modal__header { padding: 20px 24px; border-bottom: 1px solid #EAEFEF; display: flex; align-items: center; gap: 14px; position: relative; background: #FAFDFE; }
        .aivt-modal__icon { width: 40px; height: 40px; border-radius: 10px; background: #EAF6F8; color: #11B5BB; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .aivt-modal__icon--danger { background: #FFF2F2; color: #DC2626; }
        .aivt-modal__title { font-size: 1.1rem; font-weight: 800; color: #162B30; margin: 0; }
        .aivt-modal__subtitle { font-size: 0.78rem; color: #64848D; margin: 2px 0 0; }
        .aivt-modal__close { position: absolute; right: 20px; background: none; border: none; color: #64848D; cursor: pointer; display: flex; align-items: center; }
        .aivt-modal__body { padding: 24px; overflow-y: auto; }
        .aivt-modal__message { font-size: 0.9rem; color: #162B30; margin: 0 0 12px; }
        .aivt-modal__template-name { font-size: 1.1rem; font-weight: 800; color: #0B2830; background: #F4F8FA; padding: 10px 16px; border-radius: 10px; margin: 0 0 12px; border-left: 4px solid #DC2626; }
        .aivt-modal__warning { font-size: 0.8rem; color: #DC2626; margin: 0; }
        .aivt-modal__actions { padding: 16px 24px; background: #FAFDFE; border-top: 1px solid #EAEFEF; display: flex; justify-content: flex-end; gap: 12px; }

        @keyframes aivt-spin { 100% { transform: rotate(360deg); } }
        .aivt-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; display: inline-block; animation: aivt-spin 0.7s linear infinite; }
        .aivt-skeleton-row { animation: aivt-pulse 1.5s infinite; }
        .aivt-skeleton-cell { height: 18px; background: #EAEFEF; border-radius: 6px; }
        @keyframes aivt-pulse { 0% { opacity: 0.6; } 50% { opacity: 0.3; } 100% { opacity: 0.6; } }
      `}</style>
    </div>
  );
}
