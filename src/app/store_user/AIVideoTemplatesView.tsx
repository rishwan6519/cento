"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  FaFilm,
  FaEdit,
  FaTrash,
  FaSearch,
  FaPlus,
  FaTimes,
  FaEye,
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaPalette,
  FaObjectGroup,
  FaSlidersH,
  FaAlignLeft,
  FaGlobe,
} from "react-icons/fa";

// ─── Types ───────────────────────────────────────────────────────────────────
export type PositionOption = "left" | "right" | "top" | "bottom" | "center";
export type TemplateStatus = "Active" | "Inactive";

export interface VideoTemplate {
  _id: string;
  storeUserId: string;
  templateName: string;
  templateDescription: string;
  logoPosition: PositionOption;
  storeImagePosition: PositionOption;
  productImagePosition: PositionOption;
  offerTitle: string;
  offerDescription: string;
  ctaButtonText: string;
  offerLabel: string;
  priceLabel: string;
  discountLabel: string;
  footerText: string;
  website: string;
  phoneNumber: string;
  address: string;
  backgroundColor: string;
  primaryTextColor: string;
  secondaryTextColor: string;
  buttonColor: string;
  animationStyle: string;
  videoDuration: number;
  aspectRatio: string;
  language: string;
  status: TemplateStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

// ─── Toast Component ──────────────────────────────────────────────────────────
interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}
const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => (
  <div className={`aivt-toast aivt-toast--${type}`}>
    <span>{message}</span>
    <button className="aivt-toast__close" onClick={onClose}>
      <FaTimes size={12} />
    </button>
  </div>
);

// ─── Skeleton Row Component ───────────────────────────────────────────────────
const SkeletonRow: React.FC = () => (
  <tr className="aivt-skeleton-row">
    {Array.from({ length: 7 }).map((_, i) => (
      <td key={i}>
        <div className="aivt-skeleton-cell" />
      </td>
    ))}
  </tr>
);

// ─── View Template Details Modal ──────────────────────────────────────────────
interface ViewModalProps {
  template: VideoTemplate;
  onClose: () => void;
  onEdit: () => void;
}
const ViewModal: React.FC<ViewModalProps> = ({ template, onClose, onEdit }) => (
  <div className="aivt-modal-overlay" onClick={onClose}>
    <div className="aivt-modal aivt-modal--lg" onClick={(e) => e.stopPropagation()}>
      <div className="aivt-modal__header">
        <div className="aivt-modal__icon">
          <FaFilm size={18} />
        </div>
        <div>
          <h3 className="aivt-modal__title">{template.templateName}</h3>
          <p className="aivt-modal__subtitle">Complete AI Video Template Configuration</p>
        </div>
        <button className="aivt-modal__close" onClick={onClose}>
          <FaTimes size={16} />
        </button>
      </div>

      <div className="aivt-modal__body aivt-view-body">
        <div className="aivt-view-section">
          <h4 className="aivt-view-section__title"><FaAlignLeft size={14} /> Basic & Offer Messaging</h4>
          <div className="aivt-view-grid">
            <div><span className="aivt-view-label">Template Name:</span> <strong className="aivt-view-val">{template.templateName}</strong></div>
            <div><span className="aivt-view-label">Description:</span> <span className="aivt-view-val">{template.templateDescription || "N/A"}</span></div>
            <div><span className="aivt-view-label">Offer Title:</span> <strong className="aivt-view-val">{template.offerTitle || "N/A"}</strong></div>
            <div><span className="aivt-view-label">Offer Description:</span> <span className="aivt-view-val">{template.offerDescription || "N/A"}</span></div>
            <div><span className="aivt-view-label">CTA Button Text:</span> <span className="aivt-badge-pill" style={{ background: template.buttonColor || "#FF0000", color: "#fff" }}>{template.ctaButtonText || "Shop Now"}</span></div>
            <div><span className="aivt-view-label">Offer Label:</span> <span className="aivt-view-val">{template.offerLabel || "N/A"}</span></div>
            <div><span className="aivt-view-label">Price Label:</span> <span className="aivt-view-val">{template.priceLabel || "N/A"}</span></div>
            <div><span className="aivt-view-label">Discount Label:</span> <span className="aivt-view-val">{template.discountLabel || "N/A"}</span></div>
          </div>
        </div>

        <div className="aivt-view-section">
          <h4 className="aivt-view-section__title"><FaObjectGroup size={14} /> Element Positions</h4>
          <div className="aivt-view-grid">
            <div><span className="aivt-view-label">Logo Position:</span> <strong className="aivt-pos-tag">{template.logoPosition}</strong></div>
            <div><span className="aivt-view-label">Store Image Position:</span> <strong className="aivt-pos-tag">{template.storeImagePosition}</strong></div>
            <div><span className="aivt-view-label">Product Image Position:</span> <strong className="aivt-pos-tag">{template.productImagePosition}</strong></div>
          </div>
        </div>

        <div className="aivt-view-section">
          <h4 className="aivt-view-section__title"><FaPalette size={14} /> Color Scheme</h4>
          <div className="aivt-color-showcase">
            <div className="aivt-color-item"><span className="aivt-color-dot" style={{ backgroundColor: template.backgroundColor }} /><span className="aivt-color-name">Background: <code>{template.backgroundColor}</code></span></div>
            <div className="aivt-color-item"><span className="aivt-color-dot" style={{ backgroundColor: template.primaryTextColor }} /><span className="aivt-color-name">Primary Text: <code>{template.primaryTextColor}</code></span></div>
            <div className="aivt-color-item"><span className="aivt-color-dot" style={{ backgroundColor: template.secondaryTextColor }} /><span className="aivt-color-name">Secondary Text: <code>{template.secondaryTextColor}</code></span></div>
            <div className="aivt-color-item"><span className="aivt-color-dot" style={{ backgroundColor: template.buttonColor }} /><span className="aivt-color-name">CTA Button: <code>{template.buttonColor}</code></span></div>
          </div>
        </div>

        <div className="aivt-view-section">
          <h4 className="aivt-view-section__title"><FaGlobe size={14} /> Footer & Contact</h4>
          <div className="aivt-view-grid">
            <div><span className="aivt-view-label">Footer Text:</span> <span className="aivt-view-val">{template.footerText || "N/A"}</span></div>
            <div><span className="aivt-view-label">Website:</span> <span className="aivt-view-val">{template.website || "N/A"}</span></div>
            <div><span className="aivt-view-label">Phone Number:</span> <span className="aivt-view-val">{template.phoneNumber || "N/A"}</span></div>
            <div><span className="aivt-view-label">Address:</span> <span className="aivt-view-val">{template.address || "N/A"}</span></div>
          </div>
        </div>

        <div className="aivt-view-section">
          <h4 className="aivt-view-section__title"><FaSlidersH size={14} /> Video Specifications & Status</h4>
          <div className="aivt-view-grid">
            <div><span className="aivt-view-label">Animation Style:</span> <strong className="aivt-view-val">{template.animationStyle || "Fade"}</strong></div>
            <div><span className="aivt-view-label">Video Duration:</span> <strong className="aivt-view-val">{template.videoDuration}s</strong></div>
            <div><span className="aivt-view-label">Aspect Ratio:</span> <strong className="aivt-view-val">{template.aspectRatio}</strong></div>
            <div><span className="aivt-view-label">Language:</span> <strong className="aivt-view-val">{template.language || "English"}</strong></div>
            <div><span className="aivt-view-label">Status:</span> <span className={`aivt-status-badge aivt-status-badge--${template.status.toLowerCase()}`}>{template.status}</span></div>
            <div><span className="aivt-view-label">Last Updated:</span> <span className="aivt-view-val">{formatDate(template.updatedAt)}</span></div>
          </div>
        </div>
      </div>

      <div className="aivt-modal__actions">
        <button className="aivt-btn-cancel" onClick={onClose}>Close</button>
        <button className="aivt-btn-primary" onClick={onEdit}>
          <FaEdit size={12} /> Edit This Template
        </button>
      </div>
    </div>
  </div>
);

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────
interface DeleteModalProps {
  templateName: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}
const DeleteModal: React.FC<DeleteModalProps> = ({
  templateName,
  onConfirm,
  onCancel,
  deleting,
}) => (
  <div className="aivt-modal-overlay" onClick={onCancel}>
    <div className="aivt-modal" onClick={(e) => e.stopPropagation()}>
      <div className="aivt-modal__header">
        <div className="aivt-modal__icon aivt-modal__icon--danger">
          <FaTrash size={18} />
        </div>
        <h3 className="aivt-modal__title">Delete Template</h3>
      </div>
      <div className="aivt-modal__body">
        <p className="aivt-modal__message">
          Are you sure you want to delete this video template?
        </p>
        <p className="aivt-modal__template-name">"{templateName}"</p>
        <p className="aivt-modal__warning">Any automated jobs relying on this ID will need to be updated.</p>
      </div>
      <div className="aivt-modal__actions">
        <button className="aivt-btn-cancel" onClick={onCancel} disabled={deleting}>
          Cancel
        </button>
        <button
          className="aivt-btn-delete"
          onClick={onConfirm}
          disabled={deleting}
        >
          {deleting ? (
            <span className="aivt-spinner" />
          ) : (
            <FaTrash size={12} />
          )}
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

  // Form inputs
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [logoPosition, setLogoPosition] = useState<PositionOption>("left");
  const [storeImagePosition, setStoreImagePosition] = useState<PositionOption>("right");
  const [productImagePosition, setProductImagePosition] = useState<PositionOption>("center");
  const [offerTitle, setOfferTitle] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const [ctaButtonText, setCtaButtonText] = useState("Shop Now");
  const [offerLabel, setOfferLabel] = useState("Limited Time");
  const [priceLabel, setPriceLabel] = useState("Starting From");
  const [discountLabel, setDiscountLabel] = useState("50% OFF");
  const [footerText, setFooterText] = useState("Terms & Conditions Apply");
  const [website, setWebsite] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
  const [primaryTextColor, setPrimaryTextColor] = useState("#000000");
  const [secondaryTextColor, setSecondaryTextColor] = useState("#666666");
  const [buttonColor, setButtonColor] = useState("#FF0000");
  const [animationStyle, setAnimationStyle] = useState("Fade");
  const [videoDuration, setVideoDuration] = useState<number>(15);
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [language, setLanguage] = useState("English");
  const [status, setStatus] = useState<TemplateStatus>("Active");

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

  // ── Auth helper ─────────────────────────────────────────────────────────────
  const getAuthHeaders = useCallback((): HeadersInit => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Fetch Templates ─────────────────────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sort: "createdAt",
        order: "desc",
      });
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/video-template?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data || []);
      } else {
        setTemplates([]);
      }
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [search, getAuthHeaders]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(templates.length / LIMIT));
  const displayedTemplates = templates.slice((page - 1) * LIMIT, page * LIMIT);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!templateName.trim()) errors.templateName = "Template name is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Reset Form ──────────────────────────────────────────────────────────────
  const resetForm = () => {
    setEditingTemplate(null);
    setTemplateName("");
    setTemplateDescription("");
    setLogoPosition("left");
    setStoreImagePosition("right");
    setProductImagePosition("center");
    setOfferTitle("");
    setOfferDescription("");
    setCtaButtonText("Shop Now");
    setOfferLabel("Limited Time");
    setPriceLabel("Starting From");
    setDiscountLabel("50% OFF");
    setFooterText("Terms & Conditions Apply");
    setWebsite("");
    setPhoneNumber("");
    setAddress("");
    setBackgroundColor("#FFFFFF");
    setPrimaryTextColor("#000000");
    setSecondaryTextColor("#666666");
    setButtonColor("#FF0000");
    setAnimationStyle("Fade");
    setVideoDuration(15);
    setAspectRatio("9:16");
    setLanguage("English");
    setStatus("Active");
    setFormErrors({});
  };

  // ── Prefill Form for Edit ───────────────────────────────────────────────────
  const handleEdit = (t: VideoTemplate) => {
    setViewingTemplate(null);
    setEditingTemplate(t);
    setTemplateName(t.templateName);
    setTemplateDescription(t.templateDescription || "");
    setLogoPosition(t.logoPosition || "left");
    setStoreImagePosition(t.storeImagePosition || "right");
    setProductImagePosition(t.productImagePosition || "center");
    setOfferTitle(t.offerTitle || "");
    setOfferDescription(t.offerDescription || "");
    setCtaButtonText(t.ctaButtonText || "Shop Now");
    setOfferLabel(t.offerLabel || "");
    setPriceLabel(t.priceLabel || "");
    setDiscountLabel(t.discountLabel || "");
    setFooterText(t.footerText || "");
    setWebsite(t.website || "");
    setPhoneNumber(t.phoneNumber || "");
    setAddress(t.address || "");
    setBackgroundColor(t.backgroundColor || "#FFFFFF");
    setPrimaryTextColor(t.primaryTextColor || "#000000");
    setSecondaryTextColor(t.secondaryTextColor || "#666666");
    setButtonColor(t.buttonColor || "#FF0000");
    setAnimationStyle(t.animationStyle || "Fade");
    setVideoDuration(t.videoDuration || 15);
    setAspectRatio(t.aspectRatio || "9:16");
    setLanguage(t.language || "English");
    setStatus(t.status || "Active");
    setFormErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Submit Handler ──────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        templateName: templateName.trim(),
        templateDescription: templateDescription.trim(),
        logoPosition,
        storeImagePosition,
        productImagePosition,
        offerTitle: offerTitle.trim(),
        offerDescription: offerDescription.trim(),
        ctaButtonText: ctaButtonText.trim(),
        offerLabel: offerLabel.trim(),
        priceLabel: priceLabel.trim(),
        discountLabel: discountLabel.trim(),
        footerText: footerText.trim(),
        website: website.trim(),
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
        backgroundColor,
        primaryTextColor,
        secondaryTextColor,
        buttonColor,
        animationStyle,
        videoDuration: Number(videoDuration),
        aspectRatio,
        language,
        status,
      };

      const isEdit = !!editingTemplate;
      const url = isEdit
        ? `/api/video-template/${editingTemplate!._id}`
        : "/api/video-template";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        showToast(
          isEdit
            ? "Template updated successfully!"
            : "Template created successfully!",
          "success"
        );
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

  // ── Delete Handler ──────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
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
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* View Details Modal */}
      {viewingTemplate && (
        <ViewModal
          template={viewingTemplate}
          onClose={() => setViewingTemplate(null)}
          onEdit={() => handleEdit(viewingTemplate)}
        />
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteModal
          templateName={deleteTarget.templateName}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}

      {/* ── Page Header ── */}
      <div className="aivt-page-header">
        <div className="aivt-page-header__icon">
          <FaFilm size={18} />
        </div>
        <div>
          <h1 className="aivt-page-header__title">AI Video Templates</h1>
          <p className="aivt-page-header__subtitle">
            Create reusable AI video configurations, positioning rules, and design tokens
          </p>
        </div>
      </div>

      {/* ── Create / Edit Template Form Card ── */}
      <div className="aivt-card">
        <div className="aivt-card__header">
          <div className="aivt-card__header-left">
            <div className="aivt-card__header-icon">
              {editingTemplate ? <FaEdit size={14} /> : <FaPlus size={14} />}
            </div>
            <div>
              <h2 className="aivt-card__title">
                {editingTemplate ? "Edit Video Template" : "Create New Video Template"}
              </h2>
              <p className="aivt-card__subtitle">
                {editingTemplate
                  ? `Editing "${editingTemplate.templateName}" — ID: ${editingTemplate._id}`
                  : "Define text fields, layout coordinates, and styling for automated video generation"}
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
          {/* 1. General & Offer Messaging */}
          <div className="aivt-form-section">
            <h3 className="aivt-form-section__title">1. General Information & Offer Messaging</h3>
            <div className="aivt-form-grid">
              <div className="aivt-form-group">
                <label className="aivt-form-label" htmlFor="t-name">
                  Template Name <span className="aivt-required">*</span>
                </label>
                <input
                  id="t-name"
                  type="text"
                  className={`aivt-form-input ${formErrors.templateName ? "aivt-form-input--error" : ""}`}
                  placeholder="e.g. Summer Sale 9:16 Vertical"
                  value={templateName}
                  onChange={(e) => {
                    setTemplateName(e.target.value);
                    if (formErrors.templateName) setFormErrors((p) => ({ ...p, templateName: "" }));
                  }}
                />
                {formErrors.templateName && <span className="aivt-form-error">{formErrors.templateName}</span>}
              </div>

              <div className="aivt-form-group">
                <label className="aivt-form-label" htmlFor="t-desc">
                  Template Description
                </label>
                <input
                  id="t-desc"
                  type="text"
                  className="aivt-form-input"
                  placeholder="e.g. Energetic seasonal campaign for Instagram Reels"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                />
              </div>

              <div className="aivt-form-group">
                <label className="aivt-form-label" htmlFor="o-title">Offer Title</label>
                <input
                  id="o-title"
                  type="text"
                  className="aivt-form-input"
                  placeholder="e.g. Big Summer Sale"
                  value={offerTitle}
                  onChange={(e) => setOfferTitle(e.target.value)}
                />
              </div>

              <div className="aivt-form-group">
                <label className="aivt-form-label" htmlFor="o-desc">Offer Description</label>
                <input
                  id="o-desc"
                  type="text"
                  className="aivt-form-input"
                  placeholder="e.g. Up to 50% OFF on all fashion items"
                  value={offerDescription}
                  onChange={(e) => setOfferDescription(e.target.value)}
                />
              </div>

              <div className="aivt-form-group">
                <label className="aivt-form-label" htmlFor="o-label">Offer Label</label>
                <input
                  id="o-label"
                  type="text"
                  className="aivt-form-input"
                  placeholder="e.g. Limited Time"
                  value={offerLabel}
                  onChange={(e) => setOfferLabel(e.target.value)}
                />
              </div>

              <div className="aivt-form-group">
                <label className="aivt-form-label" htmlFor="p-label">Price Label</label>
                <input
                  id="p-label"
                  type="text"
                  className="aivt-form-input"
                  placeholder="e.g. Starting From $29.99"
                  value={priceLabel}
                  onChange={(e) => setPriceLabel(e.target.value)}
                />
              </div>

              <div className="aivt-form-group">
                <label className="aivt-form-label" htmlFor="d-label">Discount Label</label>
                <input
                  id="d-label"
                  type="text"
                  className="aivt-form-input"
                  placeholder="e.g. 50% OFF"
                  value={discountLabel}
                  onChange={(e) => setDiscountLabel(e.target.value)}
                />
              </div>

              <div className="aivt-form-group">
                <label className="aivt-form-label" htmlFor="c-text">CTA Button Text</label>
                <input
                  id="c-text"
                  type="text"
                  className="aivt-form-input"
                  placeholder="e.g. Shop Now"
                  value={ctaButtonText}
                  onChange={(e) => setCtaButtonText(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 2. Positioning */}
          <div className="aivt-form-section">
            <h3 className="aivt-form-section__title">2. Element Layout & Positioning</h3>
            <div className="aivt-form-grid aivt-form-grid--3">
              <div className="aivt-form-group">
                <label className="aivt-form-label" htmlFor="p-logo">Logo Position</label>
                <select
                  id="p-logo"
                  className="aivt-form-select"
                  value={logoPosition}
                  onChange={(e) => setLogoPosition(e.target.value as PositionOption)}
                >
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="center">Center</option>
                </select>
              </div>

              <div className="aivt-form-group">
                <label className="aivt-form-label" htmlFor="p-store">Store Image Position</label>
                <select
                  id="p-store"
                  className="aivt-form-select"
                  value={storeImagePosition}
                  onChange={(e) => setStoreImagePosition(e.target.value as PositionOption)}
                >
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="center">Center</option>
                </select>
              </div>

              <div className="aivt-form-group">
                <label className="aivt-form-label" htmlFor="p-prod">Product Image Position</label>
                <select
                  id="p-prod"
                  className="aivt-form-select"
                  value={productImagePosition}
                  onChange={(e) => setProductImagePosition(e.target.value as PositionOption)}
                >
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="center">Center</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Colors & Aesthetics */}
          <div className="aivt-form-section">
            <h3 className="aivt-form-section__title">3. Styling & Color Palette</h3>
            <div className="aivt-form-grid aivt-form-grid--4">
              <div className="aivt-form-group">
                <label className="aivt-form-label" htmlFor="c-bg">Background Color</label>
                <div className="aivt-color-input-wrap">
                  <input type="color" id="c-bg" className="aivt-color-picker" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value.toUpperCase())} />
                  <input type="text" className="aivt-form-input" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
                </div>
              </div>

              <div className="aivt-form-group">
                <label className="aivt-form-label" htmlFor="c-primary">Primary Text Color</label>
                <div className="aivt-color-input-wrap">
                  <input type="color" id="c-primary" className="aivt-color-picker" value={primaryTextColor} onChange={(e) => setPrimaryTextColor(e.target.value.toUpperCase())} />
                  <input type="text" className="aivt-form-input" value={primaryTextColor} onChange={(e) => setPrimaryTextColor(e.target.value)} />
                </div>
              </div>

              <div className="aivt-form-group">
                <label className="aivt-form-label" htmlFor="c-secondary">Secondary Text Color</label>
                <div className="aivt-color-input-wrap">
                  <input type="color" id="c-secondary" className="aivt-color-picker" value={secondaryTextColor} onChange={(e) => setSecondaryTextColor(e.target.value.toUpperCase())} />
                  <input type="text" className="aivt-form-input" value={secondaryTextColor} onChange={(e) => setSecondaryTextColor(e.target.value)} />
                </div>
              </div>

              <div className="aivt-form-group">
                <label className="aivt-form-label" htmlFor="c-button">CTA Button Color</label>
                <div className="aivt-color-input-wrap">
                  <input type="color" id="c-button" className="aivt-color-picker" value={buttonColor} onChange={(e) => setButtonColor(e.target.value.toUpperCase())} />
                  <input type="text" className="aivt-form-input" value={buttonColor} onChange={(e) => setButtonColor(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Contact & Footer */}
          <div className="aivt-form-section">
            <h3 className="aivt-form-section__title">4. Contact Info & Footer Disclosure</h3>
            <div className="aivt-form-grid">
              <div className="aivt-form-group">
                <label className="aivt-form-label" htmlFor="f-text">Footer Text</label>
                <input
                  id="f-text"
                  type="text"
                  className="aivt-form-input"
                  placeholder="e.g. Terms & Conditions Apply"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                />
              </div>

              <div className="aivt-form-group">
                <label className="aivt-form-label" htmlFor="f-web">Website</label>
                <input
                  id="f-web"
                  type="text"
                  className="aivt-form-input"
                  placeholder="e.g. www.example.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <div className="aivt-form-group">
                <label className="aivt-form-label" htmlFor="f-phone">Phone Number</label>
                <input
                  id="f-phone"
                  type="text"
                  className="aivt-form-input"
                  placeholder="e.g. 9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>

              <div className="aivt-form-group">
                <label className="aivt-form-label" htmlFor="f-addr">Address</label>
                <input
                  id="f-addr"
                  type="text"
                  className="aivt-form-input"
                  placeholder="e.g. Kerala, India"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 5. Video Specifications & Status */}
          <div className="aivt-form-section" style={{ borderBottom: "none", paddingBottom: 0 }}>
            <h3 className="aivt-form-section__title">5. Video Specs & Lifecycle Status</h3>
            <div className="aivt-form-grid">
              <div className="aivt-form-group">
                <label className="aivt-form-label" htmlFor="v-anim">Animation Style</label>
                <select
                  id="v-anim"
                  className="aivt-form-select"
                  value={animationStyle}
                  onChange={(e) => setAnimationStyle(e.target.value)}
                >
                  <option value="Fade">Fade & Dissolve</option>
                  <option value="Slide">Dynamic Slide</option>
                  <option value="Zoom">Slow Cinematic Zoom</option>
                  <option value="Bounce">Energetic Bounce</option>
                  <option value="Orbital">Orbital Dolly Pan</option>
                </select>
              </div>

              <div className="aivt-form-group">
                <label className="aivt-form-label" htmlFor="v-dur">Video Duration (Seconds)</label>
                <select
                  id="v-dur"
                  className="aivt-form-select"
                  value={videoDuration}
                  onChange={(e) => setVideoDuration(Number(e.target.value))}
                >
                  <option value={5}>5 Seconds</option>
                  <option value={8}>8 Seconds</option>
                  <option value={10}>10 Seconds</option>
                  <option value={15}>15 Seconds</option>
                  <option value={30}>30 Seconds</option>
                </select>
              </div>

              <div className="aivt-form-group">
                <label className="aivt-form-label" htmlFor="v-aspect">Video Aspect Ratio</label>
                <select
                  id="v-aspect"
                  className="aivt-form-select"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                >
                  <option value="9:16">9:16 (Vertical Reel / TikTok)</option>
                  <option value="16:9">16:9 (Landscape Display / TV)</option>
                  <option value="1:1">1:1 (Square Ad / Feed)</option>
                  <option value="4:3">4:3 (Classic Screen)</option>
                </select>
              </div>

              <div className="aivt-form-group">
                <label className="aivt-form-label" htmlFor="v-lang">Language</label>
                <select
                  id="v-lang"
                  className="aivt-form-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Arabic">Arabic</option>
                  <option value="Hindi">Hindi</option>
                </select>
              </div>

              <div className="aivt-form-group">
                <label className="aivt-form-label" htmlFor="v-status">Status</label>
                <select
                  id="v-status"
                  className="aivt-form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TemplateStatus)}
                >
                  <option value="Active">Active (Available for AI Video API)</option>
                  <option value="Inactive">Inactive (Archived / Draft)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="aivt-form-actions">
            <button
              type="button"
              className="aivt-btn-outline"
              onClick={resetForm}
              disabled={submitting}
            >
              Reset
            </button>
            <button
              type="submit"
              className="aivt-btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="aivt-spinner" />
                  {editingTemplate ? "Updating…" : "Saving…"}
                </>
              ) : editingTemplate ? (
                <>
                  <FaEdit size={12} /> Update Template
                </>
              ) : (
                <>
                  <FaPlus size={12} /> Save Template
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Saved Templates Table Card ── */}
      <div className="aivt-card">
        <div className="aivt-card__header">
          <div className="aivt-card__header-left">
            <div className="aivt-card__header-icon">
              <FaFilm size={14} />
            </div>
            <div>
              <h2 className="aivt-card__title">My AI Video Templates</h2>
              <p className="aivt-card__subtitle">
                {templates.length} template{templates.length !== 1 ? "s" : ""} configured
              </p>
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
                <button
                  type="button"
                  className="aivt-search-clear"
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setPage(1);
                  }}
                >
                  <FaTimes size={10} />
                </button>
              )}
            </div>
            <button type="submit" className="aivt-btn-search">
              Search
            </button>
          </form>
        </div>

        <div className="aivt-table-wrap">
          <table className="aivt-table">
            <thead>
              <tr>
                <th>Template Name</th>
                <th>Offer Title & CTA</th>
                <th>Aspect Ratio</th>
                <th>Duration</th>
                <th>Animation</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
              ) : displayedTemplates.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="aivt-empty-state">
                      <div className="aivt-empty-state__icon">
                        <FaFilm size={28} />
                      </div>
                      <p className="aivt-empty-state__title">No templates found</p>
                      <p className="aivt-empty-state__subtitle">
                        {search
                          ? "No video templates match your keyword. Try another term."
                          : "Create your first reusable AI video template above."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedTemplates.map((t) => (
                  <tr key={t._id} className="aivt-table-row">
                    <td className="aivt-td-name">
                      <strong>{t.templateName}</strong>
                      <span className="aivt-td-sub">{t.templateDescription || "No description"}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ fontWeight: 600, color: "#162B30" }}>{t.offerTitle || "N/A"}</span>
                        <span style={{ fontSize: "0.75rem", color: "#64848D" }}>CTA: {t.ctaButtonText}</span>
                      </div>
                    </td>
                    <td><strong style={{ background: "#EAF6F8", color: "#0B2830", padding: "4px 10px", borderRadius: 8, fontSize: "0.82rem" }}>{t.aspectRatio}</strong></td>
                    <td>{t.videoDuration}s</td>
                    <td>{t.animationStyle}</td>
                    <td>
                      <span className={`aivt-status-badge aivt-status-badge--${t.status.toLowerCase()}`}>
                        {t.status}
                      </span>
                    </td>
                    <td>
                      <div className="aivt-actions">
                        <button
                          className="aivt-action-btn aivt-action-btn--view"
                          title="View template details"
                          onClick={() => setViewingTemplate(t)}
                        >
                          <FaEye size={13} />
                        </button>
                        <button
                          className="aivt-action-btn aivt-action-btn--edit"
                          title="Edit template"
                          onClick={() => handleEdit(t)}
                        >
                          <FaEdit size={13} />
                        </button>
                        <button
                          className="aivt-action-btn aivt-action-btn--delete"
                          title="Delete template"
                          onClick={() => setDeleteTarget(t)}
                        >
                          <FaTrash size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="aivt-pagination">
            <span className="aivt-pagination__info">
              Page {page} of {totalPages} ({templates.length} total)
            </span>
            <div className="aivt-pagination__btns">
              <button className="aivt-page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <FaChevronLeft size={11} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  className={`aivt-page-btn aivt-page-btn--num ${page === pageNum ? "aivt-page-btn--active" : ""}`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}
              <button className="aivt-page-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <FaChevronRight size={11} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Scoped Styles ── */}
      <style>{`
        .aivt-root { display: flex; flex-direction: column; gap: 24px; font-family: 'Inter', sans-serif; }
        .aivt-toast {
          position: fixed; top: 24px; right: 24px; z-index: 9999;
          display: flex; align-items: center; gap: 12px;
          padding: 14px 20px; border-radius: 10px;
          font-size: 0.875rem; font-weight: 600;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }
        .aivt-toast--success { background: #DCFCE7; color: #166534; border: 1px solid #BBF7D0; }
        .aivt-toast--error { background: #FEE2E2; color: #991B1B; border: 1px solid #FECACA; }
        .aivt-toast__close { background: none; border: none; cursor: pointer; color: inherit; opacity: 0.6; margin-left: auto; display: flex; align-items: center; }

        .aivt-page-header { display: flex; align-items: center; gap: 14px; }
        .aivt-page-header__icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, #0B2830, #11B5BB);
          display: flex; align-items: center; justify-content: center;
          color: #fff; flex-shrink: 0; box-shadow: 0 4px 10px rgba(17,181,187,0.2);
        }
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
        .aivt-form-section { border-bottom: 1px dashed #D6E6E9; padding-bottom: 24px; margin-bottom: 24px; }
        .aivt-form-section__title { font-size: 0.95rem; font-weight: 700; color: #0B2830; margin: 0 0 16px; display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.03em; font-size: 0.82rem; }

        .aivt-form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
        .aivt-form-grid--3 { grid-template-columns: repeat(3, 1fr); }
        .aivt-form-grid--4 { grid-template-columns: repeat(4, 1fr); }
        @media (max-width: 992px) {
          .aivt-form-grid, .aivt-form-grid--3, .aivt-form-grid--4 { grid-template-columns: 1fr; }
        }

        .aivt-form-group { display: flex; flex-direction: column; gap: 6px; }
        .aivt-form-label { font-size: 0.8rem; font-weight: 600; color: #162B30; }
        .aivt-required { color: #DC2626; }

        .aivt-form-input, .aivt-form-select {
          background: #F8FAFB; border: 1.5px solid #EAEFEF; border-radius: 10px;
          padding: 11px 14px; font-size: 0.88rem; color: #162B30; font-weight: 500;
          outline: none; transition: all 0.15s; width: 100%; font-family: inherit;
        }
        .aivt-form-input:focus, .aivt-form-select:focus { border-color: #11B5BB; background: #fff; box-shadow: 0 0 0 3px rgba(17,181,187,0.12); }
        .aivt-form-input--error { border-color: #DC2626 !important; background: #FFF9F9 !important; }
        .aivt-form-error { font-size: 0.72rem; color: #DC2626; font-weight: 600; }

        .aivt-color-input-wrap { display: flex; align-items: center; gap: 10px; }
        .aivt-color-picker { width: 44px; height: 42px; border: 1.5px solid #EAEFEF; border-radius: 8px; padding: 2px; cursor: pointer; background: #F8FAFB; }

        .aivt-form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 28px; padding-top: 18px; border-top: 1px solid #EAEFEF; }
        .aivt-btn-outline { background: #fff; border: 1.5px solid #EAEFEF; color: #64848D; border-radius: 10px; padding: 12px 24px; font-size: 0.88rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
        .aivt-btn-outline:hover { border-color: #64848D; color: #0B2830; }
        .aivt-btn-primary { background: #F05A28; color: #fff; border: none; border-radius: 10px; padding: 12px 28px; font-size: 0.88rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.15s; }
        .aivt-btn-primary:hover { background: #DC4B1D; }
        .aivt-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

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

        .aivt-td-name { display: flex; flex-direction: column; gap: 3px; }
        .aivt-td-sub { font-size: 0.75rem; color: #8CABB3; font-weight: 400; }

        .aivt-status-badge { display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 20px; font-size: 0.74rem; font-weight: 700; }
        .aivt-status-badge--active { background: #DCFCE7; color: #166534; border: 1px solid #BBF7D0; }
        .aivt-status-badge--inactive { background: #F1F5F9; color: #64748B; border: 1px solid #E2E8F0; }

        .aivt-actions { display: flex; align-items: center; justify-content: center; gap: 8px; }
        .aivt-action-btn { width: 32px; height: 32px; border: 1px solid #EAEFEF; border-radius: 8px; background: #F8FAFB; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; }
        .aivt-action-btn--view { color: #11B5BB; }
        .aivt-action-btn--view:hover { background: #11B5BB; color: #fff; border-color: #11B5BB; }
        .aivt-action-btn--edit { color: #F05A28; }
        .aivt-action-btn--edit:hover { background: #F05A28; color: #fff; border-color: #F05A28; }
        .aivt-action-btn--delete { color: #DC2626; }
        .aivt-action-btn--delete:hover { background: #DC2626; color: #fff; border-color: #DC2626; }

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
        .aivt-modal--lg { max-width: 720px; max-height: 90vh; display: flex; flex-direction: column; }
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
        .aivt-btn-cancel { background: #fff; border: 1px solid #EAEFEF; color: #64848D; border-radius: 9px; padding: 10px 20px; font-size: 0.85rem; font-weight: 700; cursor: pointer; }
        .aivt-btn-delete { background: #DC2626; color: #fff; border: none; border-radius: 9px; padding: 10px 22px; font-size: 0.85rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; }

        .aivt-view-section { margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px dashed #EAEFEF; }
        .aivt-view-section:last-child { margin-bottom: 0; padding-bottom: 0; border: none; }
        .aivt-view-section__title { font-size: 0.88rem; font-weight: 800; color: #0B2830; margin: 0 0 14px; display: flex; align-items: center; gap: 8px; }
        .aivt-view-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px 18px; font-size: 0.85rem; }
        @media(max-width: 600px) { .aivt-view-grid { grid-template-columns: 1fr; } }
        .aivt-view-label { color: #64848D; margin-right: 6px; }
        .aivt-view-val { color: #162B30; font-weight: 600; }
        .aivt-badge-pill { padding: 3px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; display: inline-block; }
        .aivt-pos-tag { background: #F0F4F5; color: #0B2830; padding: 3px 10px; border-radius: 8px; text-transform: capitalize; font-size: 0.82rem; }
        .aivt-color-showcase { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .aivt-color-item { display: flex; align-items: center; gap: 10px; background: #F8FAFB; border: 1px solid #EAEFEF; padding: 10px 14px; border-radius: 10px; font-size: 0.82rem; color: #162B30; font-weight: 600; }
        .aivt-color-dot { width: 22px; height: 22px; border-radius: 6px; border: 1.5px solid rgba(0,0,0,0.15); flex-shrink: 0; }

        @keyframes aivt-spin { 100% { transform: rotate(360deg); } }
        .aivt-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; display: inline-block; animation: aivt-spin 0.7s linear infinite; }

        .aivt-skeleton-row { animation: aivt-pulse 1.5s infinite; }
        .aivt-skeleton-cell { height: 18px; background: #EAEFEF; border-radius: 6px; }
        @keyframes aivt-pulse { 0% { opacity: 0.6; } 50% { opacity: 0.3; } 100% { opacity: 0.6; } }
      `}</style>
    </div>
  );
}
