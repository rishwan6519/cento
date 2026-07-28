"use client";
import React, { useState, useEffect, useCallback } from "react";
import { FaTag, FaEdit, FaTrash, FaSearch, FaPlus, FaTimes, FaChevronLeft, FaChevronRight } from "react-icons/fa";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Offer {
  _id: string;
  offerName: string;
  offerDescription: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type OfferStatus = "Upcoming" | "Active" | "Expired";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getOfferStatus(offer: Offer): OfferStatus {
  const now = new Date();
  const start = new Date(offer.startDate);
  const end = new Date(offer.endDate);
  if (now < start) return "Upcoming";
  if (now > end) return "Expired";
  return "Active";
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toInputDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

// ─── Toast Component ──────────────────────────────────────────────────────────
interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}
const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => (
  <div className={`oc-toast oc-toast--${type}`}>
    <span>{message}</span>
    <button className="oc-toast__close" onClick={onClose}>
      <FaTimes size={12} />
    </button>
  </div>
);

// ─── Skeleton Row Component ───────────────────────────────────────────────────
const SkeletonRow: React.FC = () => (
  <tr className="oc-skeleton-row">
    {Array.from({ length: 8 }).map((_, i) => (
      <td key={i}>
        <div className="oc-skeleton-cell" />
      </td>
    ))}
  </tr>
);

// ─── Testing Alert Details Modal (For Testing Purposes) ────────────────────────
interface TestingAlertDetails {
  storeUserId: string;
  username?: string;
  storeName?: string;
  mobileTokensNotified?: string[];
  fcmSendStatus?: string;
  title?: string;
  body?: string;
  dbNotificationId?: string;
}
interface TestingAlertModalProps {
  details: TestingAlertDetails;
  onClose: () => void;
}
const TestingAlertModal: React.FC<TestingAlertModalProps> = ({ details, onClose }) => (
  <div className="oc-modal-overlay" onClick={onClose}>
    <div className="oc-modal oc-modal--testing" onClick={(e) => e.stopPropagation()}>
      <div className="oc-modal__header oc-modal__header--testing">
        <div className="oc-modal__icon oc-modal__icon--testing">
          <FaTag size={18} />
        </div>
        <div>
          <h3 className="oc-modal__title" style={{ color: "#0F766E" }}>🧪 Testing Alert: FCM & Notification</h3>
          <p style={{ fontSize: "0.78rem", color: "#14B8A6", margin: 0 }}>Execution summary for QA / Testing purposes</p>
        </div>
      </div>
      <div className="oc-modal__body oc-test-body">
        <div className="oc-test-item">
          <span className="oc-test-label">Target User ID:</span>
          <code className="oc-test-value">{details.storeUserId || "N/A"}</code>
        </div>
        <div className="oc-test-item">
          <span className="oc-test-label">Store / Username:</span>
          <span className="oc-test-text">{details.storeName || "N/A"} ({details.username || "N/A"})</span>
        </div>
        <div className="oc-test-item">
          <span className="oc-test-label">FCM Push Status:</span>
          <span className={`oc-status-badge ${details.fcmSendStatus?.startsWith("SUCCESS") ? "oc-status-badge--active" : "oc-status-badge--upcoming"}`}>
            {details.fcmSendStatus || "Unknown"}
          </span>
        </div>
        <div className="oc-test-item">
          <span className="oc-test-label">Mobile Tokens Notified ({details.mobileTokensNotified?.length || 0}):</span>
          {details.mobileTokensNotified && details.mobileTokensNotified.length > 0 ? (
            <div className="oc-test-tokens">
              {details.mobileTokensNotified.map((tok, i) => (
                <div key={i} className="oc-test-token-row">
                  <span className="oc-test-token-idx">#{i + 1}</span>
                  <code className="oc-test-token">{tok}</code>
                </div>
              ))}
            </div>
          ) : (
            <span className="oc-test-none">⚠️ No mobile FCM tokens registered for this store user in DB</span>
          )}
        </div>
        <div className="oc-test-item">
          <span className="oc-test-label">Notification Title:</span>
          <strong className="oc-test-text">{details.title}</strong>
        </div>
        <div className="oc-test-item">
          <span className="oc-test-label">Notification Body:</span>
          <p className="oc-test-desc">{details.body}</p>
        </div>
        <div className="oc-test-item">
          <span className="oc-test-label">DB Record ID:</span>
          <code className="oc-test-value">{details.dbNotificationId || "N/A"}</code>
        </div>
      </div>
      <div className="oc-modal__actions">
        <button className="oc-btn-primary" onClick={onClose} style={{ background: "#0D9488", margin: "0 auto" }}>
          Dismiss Testing Alert
        </button>
      </div>
    </div>
  </div>
);

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────
interface DeleteModalProps {
  offerName: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}
const DeleteModal: React.FC<DeleteModalProps> = ({
  offerName,
  onConfirm,
  onCancel,
  deleting,
}) => (
  <div className="oc-modal-overlay" onClick={onCancel}>
    <div className="oc-modal" onClick={(e) => e.stopPropagation()}>
      <div className="oc-modal__header">
        <div className="oc-modal__icon">
          <FaTrash size={18} />
        </div>
        <h3 className="oc-modal__title">Delete Offer</h3>
      </div>
      <div className="oc-modal__body">
        <p className="oc-modal__message">
          Are you sure you want to delete this Offer?
        </p>
        <p className="oc-modal__offer-name">"{offerName}"</p>
        <p className="oc-modal__warning">This action cannot be undone.</p>
      </div>
      <div className="oc-modal__actions">
        <button className="oc-btn-cancel" onClick={onCancel} disabled={deleting}>
          Cancel
        </button>
        <button
          className="oc-btn-delete"
          onClick={onConfirm}
          disabled={deleting}
        >
          {deleting ? (
            <span className="oc-spinner" />
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
export default function OfferCreation() {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [offerName, setOfferName] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Toast & Testing alert state ──────────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [testingAlert, setTestingAlert] = useState<TestingAlertDetails | null>(null);

  // ── Table state ─────────────────────────────────────────────────────────────
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 10;

  // ── Delete modal state ──────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Offer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Auth helper ─────────────────────────────────────────────────────────────
  const getAuthHeaders = useCallback((): HeadersInit => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }, []);

  // ── Show toast ───────────────────────────────────────────────────────────────
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Fetch offers ─────────────────────────────────────────────────────────────
  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        sort: "createdAt",
        order: "desc",
      });
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/offers?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setOffers(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      } else {
        setOffers([]);
      }
    } catch {
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, getAuthHeaders]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // ── Form validation ──────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!offerName.trim()) errors.offerName = "Offer name is required";
    if (!offerDescription.trim())
      errors.offerDescription = "Offer description is required";
    if (!startDate) errors.startDate = "Start date is required";
    if (!endDate) errors.endDate = "End date is required";
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      errors.endDate = "End date cannot be before start date";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Reset form ───────────────────────────────────────────────────────────────
  const resetForm = () => {
    setEditingOffer(null);
    setOfferName("");
    setOfferDescription("");
    setStartDate("");
    setEndDate("");
    setFormErrors({});
  };

  // ── Prefill form for edit ────────────────────────────────────────────────────
  const handleEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setOfferName(offer.offerName);
    setOfferDescription(offer.offerDescription);
    setStartDate(toInputDate(offer.startDate));
    setEndDate(toInputDate(offer.endDate));
    setFormErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Submit form ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = { offerName, offerDescription, startDate, endDate };
      const isEdit = !!editingOffer;
      const url = isEdit ? `/api/offers/${editingOffer!._id}` : "/api/offers";
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
            ? "Offer updated successfully!"
            : "Offer created successfully!",
          "success"
        );
        if (!isEdit && data.notificationDetails) {
          setTestingAlert(data.notificationDetails);
          const nd = data.notificationDetails;
          window.alert(
            `[FCM Notification Testing Details]\n\n` +
            `• Target User ID: ${nd.storeUserId}\n` +
            `• Store: ${nd.storeName} (${nd.username})\n` +
            `• Mobile Devices Notified (${nd.mobileTokensNotified?.length || 0}):\n  ${
              nd.mobileTokensNotified && nd.mobileTokensNotified.length > 0
                ? nd.mobileTokensNotified.join('\n  ')
                : 'No registered FCM mobile tokens'
            }\n\n` +
            `• Title: "${nd.title}"\n` +
            `• Body: "${nd.body}"\n` +
            `• Status: ${nd.fcmSendStatus}`
          );
        }
        resetForm();
        setPage(1);
        fetchOffers();
      } else {
        showToast(data.message || "Something went wrong", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete handlers ──────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/offers/${deleteTarget._id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Offer deleted successfully!", "success");
        setDeleteTarget(null);
        if (offers.length === 1 && page > 1) setPage((p) => p - 1);
        else fetchOffers();
      } else {
        showToast(data.message || "Failed to delete offer", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setDeleting(false);
    }
  };

  // ── Search handler ───────────────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="oc-root">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteModal
          offerName={deleteTarget.offerName}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}

      {/* Testing Alert Modal */}
      {testingAlert && (
        <TestingAlertModal
          details={testingAlert}
          onClose={() => setTestingAlert(null)}
        />
      )}

      {/* ── Page Header ── */}
      <div className="oc-page-header">
        <div className="oc-page-header__icon">
          <FaTag size={18} />
        </div>
        <div>
          <h1 className="oc-page-header__title">Offer Creation</h1>
          <p className="oc-page-header__subtitle">
            Create and manage your promotional offers
          </p>
        </div>
      </div>

      {/* ── Offer Form Card ── */}
      <div className="oc-card">
        <div className="oc-card__header">
          <div className="oc-card__header-left">
            <div className="oc-card__header-icon">
              {editingOffer ? <FaEdit size={14} /> : <FaPlus size={14} />}
            </div>
            <div>
              <h2 className="oc-card__title">
                {editingOffer ? "Edit Offer" : "Create New Offer"}
              </h2>
              <p className="oc-card__subtitle">
                {editingOffer
                  ? "Update the details of your offer"
                  : "Fill in the details to create a new offer"}
              </p>
            </div>
          </div>
          {editingOffer && (
            <button className="oc-btn-cancel-edit" onClick={resetForm}>
              <FaTimes size={12} /> Cancel Edit
            </button>
          )}
        </div>

        <form className="oc-card__body" onSubmit={handleSubmit} noValidate>
          <div className="oc-form-grid">
            {/* Offer Name */}
            <div className="oc-form-group">
              <label className="oc-form-label" htmlFor="oc-offer-name">
                Offer Name <span className="oc-required">*</span>
              </label>
              <input
                id="oc-offer-name"
                type="text"
                className={`oc-form-input ${formErrors.offerName ? "oc-form-input--error" : ""}`}
                placeholder="e.g. Weekend Sale"
                value={offerName}
                onChange={(e) => {
                  setOfferName(e.target.value);
                  if (formErrors.offerName)
                    setFormErrors((p) => ({ ...p, offerName: "" }));
                }}
              />
              {formErrors.offerName && (
                <span className="oc-form-error">{formErrors.offerName}</span>
              )}
            </div>

            {/* Offer Description */}
            <div className="oc-form-group oc-form-group--full">
              <label className="oc-form-label" htmlFor="oc-offer-desc">
                Offer Description <span className="oc-required">*</span>
              </label>
              <textarea
                id="oc-offer-desc"
                className={`oc-form-input oc-form-textarea ${formErrors.offerDescription ? "oc-form-input--error" : ""}`}
                placeholder="e.g. Flat 50% OFF on all items"
                value={offerDescription}
                rows={3}
                onChange={(e) => {
                  setOfferDescription(e.target.value);
                  if (formErrors.offerDescription)
                    setFormErrors((p) => ({ ...p, offerDescription: "" }));
                }}
              />
              {formErrors.offerDescription && (
                <span className="oc-form-error">{formErrors.offerDescription}</span>
              )}
            </div>

            {/* Start Date */}
            <div className="oc-form-group">
              <label className="oc-form-label" htmlFor="oc-start-date">
                Start Date <span className="oc-required">*</span>
              </label>
              <input
                id="oc-start-date"
                type="date"
                className={`oc-form-input ${formErrors.startDate ? "oc-form-input--error" : ""}`}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (formErrors.startDate)
                    setFormErrors((p) => ({ ...p, startDate: "" }));
                  // auto-validate end date
                  if (endDate && new Date(endDate) < new Date(e.target.value)) {
                    setFormErrors((p) => ({
                      ...p,
                      endDate: "End date cannot be before start date",
                    }));
                  } else if (formErrors.endDate === "End date cannot be before start date") {
                    setFormErrors((p) => ({ ...p, endDate: "" }));
                  }
                }}
              />
              {formErrors.startDate && (
                <span className="oc-form-error">{formErrors.startDate}</span>
              )}
            </div>

            {/* End Date */}
            <div className="oc-form-group">
              <label className="oc-form-label" htmlFor="oc-end-date">
                End Date <span className="oc-required">*</span>
              </label>
              <input
                id="oc-end-date"
                type="date"
                className={`oc-form-input ${formErrors.endDate ? "oc-form-input--error" : ""}`}
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  if (startDate && new Date(e.target.value) < new Date(startDate)) {
                    setFormErrors((p) => ({
                      ...p,
                      endDate: "End date cannot be before start date",
                    }));
                  } else {
                    setFormErrors((p) => ({ ...p, endDate: "" }));
                  }
                }}
              />
              {formErrors.endDate && (
                <span className="oc-form-error">{formErrors.endDate}</span>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="oc-form-actions">
            <button
              type="button"
              className="oc-btn-outline"
              onClick={resetForm}
              disabled={submitting}
            >
              Reset
            </button>
            <button
              type="submit"
              className="oc-btn-primary"
              id="oc-submit-btn"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="oc-spinner" />
                  {editingOffer ? "Updating…" : "Creating…"}
                </>
              ) : editingOffer ? (
                <>
                  <FaEdit size={12} /> Update Offer
                </>
              ) : (
                <>
                  <FaPlus size={12} /> Create Offer
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Offers Table Card ── */}
      <div className="oc-card">
        <div className="oc-card__header">
          <div className="oc-card__header-left">
            <div className="oc-card__header-icon">
              <FaTag size={14} />
            </div>
            <div>
              <h2 className="oc-card__title">My Offers</h2>
              <p className="oc-card__subtitle">
                {total} offer{total !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>

          {/* Search */}
          <form className="oc-search-form" onSubmit={handleSearch}>
            <div className="oc-search-wrap">
              <FaSearch className="oc-search-icon" size={13} />
              <input
                type="text"
                className="oc-search-input"
                placeholder="Search offers…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button
                  type="button"
                  className="oc-search-clear"
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
            <button type="submit" className="oc-btn-search">
              Search
            </button>
          </form>
        </div>

        <div className="oc-table-wrap">
          <table className="oc-table">
            <thead>
              <tr>
                <th>Offer Name</th>
                <th>Description</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Created</th>
                <th>Updated</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))
              ) : offers.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="oc-empty-state">
                      <div className="oc-empty-state__icon">
                        <FaTag size={28} />
                      </div>
                      <p className="oc-empty-state__title">No offers found</p>
                      <p className="oc-empty-state__subtitle">
                        {search
                          ? "No offers match your search. Try a different keyword."
                          : "Create your first offer using the form above."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                offers.map((offer) => {
                  const status = getOfferStatus(offer);
                  return (
                    <tr key={offer._id} className="oc-table-row">
                      <td className="oc-td-name">{offer.offerName}</td>
                      <td className="oc-td-desc">{offer.offerDescription}</td>
                      <td>{formatDate(offer.startDate)}</td>
                      <td>{formatDate(offer.endDate)}</td>
                      <td>
                        <span className={`oc-status-badge oc-status-badge--${status.toLowerCase()}`}>
                          {status}
                        </span>
                      </td>
                      <td>{formatDate(offer.createdAt)}</td>
                      <td>{formatDate(offer.updatedAt)}</td>
                      <td>
                        <div className="oc-actions">
                          <button
                            className="oc-action-btn oc-action-btn--edit"
                            title="Edit offer"
                            onClick={() => handleEdit(offer)}
                          >
                            <FaEdit size={13} />
                          </button>
                          <button
                            className="oc-action-btn oc-action-btn--delete"
                            title="Delete offer"
                            onClick={() => setDeleteTarget(offer)}
                          >
                            <FaTrash size={13} />
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

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="oc-pagination">
            <span className="oc-pagination__info">
              Page {page} of {totalPages}
            </span>
            <div className="oc-pagination__btns">
              <button
                className="oc-page-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <FaChevronLeft size={11} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum =
                  totalPages <= 5
                    ? i + 1
                    : page <= 3
                    ? i + 1
                    : page >= totalPages - 2
                    ? totalPages - 4 + i
                    : page - 2 + i;
                return (
                  <button
                    key={pageNum}
                    className={`oc-page-btn oc-page-btn--num ${page === pageNum ? "oc-page-btn--active" : ""}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                className="oc-page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <FaChevronRight size={11} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Scoped Styles ── */}
      <style>{`
        /* ── Root ── */
        .oc-root { display: flex; flex-direction: column; gap: 24px; }

        /* ── Toast ── */
        .oc-toast {
          position: fixed; top: 24px; right: 24px; z-index: 9999;
          display: flex; align-items: center; gap: 12px;
          padding: 14px 20px; border-radius: 10px;
          font-size: 0.875rem; font-weight: 600;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          animation: oc-slideIn 0.25s ease;
          max-width: 380px;
        }
        .oc-toast--success { background: #DCFCE7; color: #166534; border: 1px solid #BBF7D0; }
        .oc-toast--error { background: #FEE2E2; color: #991B1B; border: 1px solid #FECACA; }
        .oc-toast__close {
          background: none; border: none; cursor: pointer;
          color: inherit; opacity: 0.6; margin-left: auto; flex-shrink: 0;
          display: flex; align-items: center;
        }
        .oc-toast__close:hover { opacity: 1; }
        @keyframes oc-slideIn {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: translateX(0); }
        }

        /* ── Page Header ── */
        .oc-page-header {
          display: flex; align-items: center; gap: 16px;
          margin-bottom: 4px;
        }
        .oc-page-header__icon {
          width: 44px; height: 44px; border-radius: 10px;
          background: #0B2830; color: #11B5BB;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .oc-page-header__title {
          font-size: 1.5rem; font-weight: 800; color: #162B30; margin: 0 0 3px;
        }
        .oc-page-header__subtitle {
          font-size: 0.85rem; color: #64848D; margin: 0;
        }

        /* ── Card ── */
        .oc-card {
          background: #fff; border-radius: 14px;
          border: 1px solid #D6E6E9;
          box-shadow: 0 4px 16px rgba(0,0,0,0.03);
          overflow: hidden;
        }
        .oc-card__header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 24px; border-bottom: 1px solid #EAEFEF;
          background: #F8FAFB; gap: 16px; flex-wrap: wrap;
        }
        .oc-card__header-left { display: flex; align-items: center; gap: 14px; }
        .oc-card__header-icon {
          width: 36px; height: 36px; border-radius: 8px;
          background: #0B2830; color: #11B5BB;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .oc-card__title { font-size: 1.05rem; font-weight: 700; color: #162B30; margin: 0 0 2px; }
        .oc-card__subtitle { font-size: 0.78rem; color: #64848D; margin: 0; }
        .oc-card__body { padding: 28px 24px; }

        /* ── Form ── */
        .oc-form-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 20px 24px;
          margin-bottom: 24px;
        }
        @media (max-width: 640px) { .oc-form-grid { grid-template-columns: 1fr; } }
        .oc-form-group { display: flex; flex-direction: column; gap: 7px; }
        .oc-form-group--full { grid-column: 1 / -1; }
        .oc-form-label { font-size: 0.85rem; font-weight: 600; color: #162B30; }
        .oc-required { color: #F05A28; }
        .oc-form-input {
          padding: 11px 14px; border: 1.5px solid #EAEFEF; border-radius: 8px;
          font-size: 0.9rem; color: #162B30; background: #F8FAFB;
          outline: none; font-family: inherit;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .oc-form-input:focus {
          border-color: #11B5BB;
          box-shadow: 0 0 0 3px rgba(17,181,187,0.12);
          background: #fff;
        }
        .oc-form-input--error { border-color: #F05A28 !important; }
        .oc-form-textarea { resize: vertical; min-height: 80px; }
        .oc-form-error { font-size: 0.77rem; color: #F05A28; font-weight: 500; }

        /* ── Form Actions ── */
        .oc-form-actions {
          display: flex; gap: 12px; justify-content: flex-end;
          padding-top: 4px;
        }
        .oc-btn-primary {
          display: flex; align-items: center; gap: 8px;
          background: #F05A28; color: #fff; border: none;
          border-radius: 8px; padding: 11px 22px;
          font-size: 0.9rem; font-weight: 600; cursor: pointer;
          font-family: inherit; transition: background 0.15s, transform 0.1s;
        }
        .oc-btn-primary:hover:not(:disabled) { background: #DC4B1D; transform: translateY(-1px); }
        .oc-btn-primary:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
        .oc-btn-outline {
          background: #fff; color: #445459; border: 1.5px solid #EAEFEF;
          border-radius: 8px; padding: 11px 20px;
          font-size: 0.9rem; font-weight: 600; cursor: pointer;
          font-family: inherit; transition: 0.15s;
        }
        .oc-btn-outline:hover:not(:disabled) { border-color: #A4B6B9; background: #F8FAFB; }
        .oc-btn-outline:disabled { opacity: 0.5; cursor: not-allowed; }
        .oc-btn-cancel-edit {
          display: flex; align-items: center; gap: 7px;
          background: #FFF2F2; color: #DC2626;
          border: 1px solid #FECACA; border-radius: 7px;
          padding: 8px 16px; font-size: 0.82rem; font-weight: 600;
          cursor: pointer; font-family: inherit; transition: 0.15s;
          white-space: nowrap;
        }
        .oc-btn-cancel-edit:hover { background: #FEE2E2; }

        /* ── Spinner ── */
        .oc-spinner {
          display: inline-block; width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: oc-spin 0.7s linear infinite;
        }
        @keyframes oc-spin { to { transform: rotate(360deg); } }

        /* ── Search ── */
        .oc-search-form { display: flex; gap: 8px; align-items: center; }
        .oc-search-wrap {
          position: relative; display: flex; align-items: center;
        }
        .oc-search-icon {
          position: absolute; left: 12px; color: #A4B6B9; pointer-events: none;
        }
        .oc-search-input {
          padding: 9px 36px 9px 34px; border: 1.5px solid #EAEFEF;
          border-radius: 8px; font-size: 0.85rem; color: #162B30;
          background: #F8FAFB; outline: none; font-family: inherit;
          width: 220px; transition: 0.15s;
        }
        .oc-search-input:focus { border-color: #11B5BB; background: #fff; }
        .oc-search-clear {
          position: absolute; right: 10px; background: none; border: none;
          cursor: pointer; color: #A4B6B9; display: flex; align-items: center;
        }
        .oc-search-clear:hover { color: #445459; }
        .oc-btn-search {
          background: #11B5BB; color: #fff; border: none; border-radius: 8px;
          padding: 9px 18px; font-size: 0.85rem; font-weight: 600;
          cursor: pointer; font-family: inherit; transition: 0.15s;
          white-space: nowrap;
        }
        .oc-btn-search:hover { background: #0E9C9F; }

        /* ── Table ── */
        .oc-table-wrap { overflow-x: auto; }
        .oc-table {
          width: 100%; border-collapse: collapse;
          font-size: 0.875rem;
        }
        .oc-table thead tr {
          background: #F8FAFB; border-bottom: 2px solid #EAEFEF;
        }
        .oc-table th {
          padding: 14px 18px; text-align: left;
          font-size: 0.75rem; font-weight: 700; color: #445459;
          text-transform: uppercase; letter-spacing: 0.04em;
          white-space: nowrap;
        }
        .oc-table td {
          padding: 14px 18px; color: #445459;
          border-bottom: 1px solid #F4F7F8; vertical-align: middle;
        }
        .oc-table-row:hover td { background: #FAFCFC; }
        .oc-td-name { font-weight: 700; color: #162B30; max-width: 180px; }
        .oc-td-desc {
          color: #64848D; max-width: 200px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* ── Status Badge ── */
        .oc-status-badge {
          display: inline-block; padding: 4px 12px;
          border-radius: 20px; font-size: 0.72rem; font-weight: 700;
          white-space: nowrap;
        }
        .oc-status-badge--active { background: #DCFCE7; color: #166534; }
        .oc-status-badge--upcoming { background: #DBEAFE; color: #1E40AF; }
        .oc-status-badge--expired { background: #F3F4F6; color: #6B7280; }

        /* ── Actions ── */
        .oc-actions { display: flex; gap: 8px; justify-content: center; }
        .oc-action-btn {
          width: 32px; height: 32px; border-radius: 7px; border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: 0.15s;
        }
        .oc-action-btn--edit { background: #EAF6F8; color: #11B5BB; }
        .oc-action-btn--edit:hover { background: #11B5BB; color: #fff; }
        .oc-action-btn--delete { background: #FFF2F2; color: #DC2626; }
        .oc-action-btn--delete:hover { background: #DC2626; color: #fff; }

        /* ── Skeleton ── */
        .oc-skeleton-row td { padding: 14px 18px; }
        .oc-skeleton-cell {
          height: 16px; border-radius: 4px;
          background: linear-gradient(90deg, #F4F7F8 25%, #EAEFEF 50%, #F4F7F8 75%);
          background-size: 200% 100%;
          animation: oc-shimmer 1.4s infinite;
        }
        @keyframes oc-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ── Empty State ── */
        .oc-empty-state {
          padding: 48px 24px; text-align: center;
        }
        .oc-empty-state__icon {
          width: 56px; height: 56px; border-radius: 14px;
          background: #F1F6F8; color: #A4B6B9;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px;
        }
        .oc-empty-state__title {
          font-size: 1rem; font-weight: 700; color: #162B30; margin: 0 0 6px;
        }
        .oc-empty-state__subtitle {
          font-size: 0.85rem; color: #64848D; margin: 0;
        }

        /* ── Pagination ── */
        .oc-pagination {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 24px; border-top: 1px solid #EAEFEF;
          flex-wrap: wrap; gap: 12px;
        }
        .oc-pagination__info { font-size: 0.82rem; color: #64848D; font-weight: 500; }
        .oc-pagination__btns { display: flex; gap: 6px; align-items: center; }
        .oc-page-btn {
          min-width: 34px; height: 34px; padding: 0 8px;
          border: 1.5px solid #EAEFEF; border-radius: 7px;
          background: #fff; color: #445459; font-size: 0.82rem; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-family: inherit; transition: 0.15s;
        }
        .oc-page-btn:hover:not(:disabled):not(.oc-page-btn--active) {
          border-color: #11B5BB; color: #11B5BB;
        }
        .oc-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .oc-page-btn--active { background: #F05A28; border-color: #F05A28; color: #fff; }

        /* ── Delete Modal ── */
        .oc-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.55);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; backdrop-filter: blur(3px);
        }
        .oc-modal {
          background: #fff; border-radius: 16px; width: 90%; max-width: 420px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.25);
          overflow: hidden;
          animation: oc-modalIn 0.2s ease;
        }
        @keyframes oc-modalIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .oc-modal__header {
          display: flex; align-items: center; gap: 14px;
          padding: 20px 24px; border-bottom: 1px solid #EAEFEF;
        }
        .oc-modal__icon {
          width: 40px; height: 40px; border-radius: 10px;
          background: #FFF2F2; color: #DC2626;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .oc-modal__title { font-size: 1.05rem; font-weight: 700; color: #162B30; margin: 0; }
        .oc-modal__body { padding: 24px; }
        .oc-modal__message { font-size: 0.95rem; color: #445459; margin: 0 0 10px; }
        .oc-modal__offer-name {
          font-size: 0.9rem; font-weight: 700; color: #162B30;
          background: #F8FAFB; padding: 10px 14px; border-radius: 8px;
          margin: 0 0 12px; word-break: break-word;
        }
        .oc-modal__warning { font-size: 0.8rem; color: #DC2626; margin: 0; font-weight: 500; }
        .oc-modal__actions {
          display: flex; gap: 12px; justify-content: flex-end;
          padding: 16px 24px; border-top: 1px solid #EAEFEF; background: #F8FAFB;
        }
        .oc-btn-cancel {
          background: #fff; color: #445459; border: 1.5px solid #EAEFEF;
          border-radius: 8px; padding: 10px 20px;
          font-size: 0.88rem; font-weight: 600; cursor: pointer;
          font-family: inherit; transition: 0.15s;
        }
        .oc-btn-cancel:hover:not(:disabled) { border-color: #A4B6B9; }
        .oc-btn-delete {
          display: flex; align-items: center; gap: 8px;
          background: #DC2626; color: #fff; border: none;
          border-radius: 8px; padding: 10px 20px;
          font-size: 0.88rem; font-weight: 600; cursor: pointer;
          font-family: inherit; transition: 0.15s;
        }
        .oc-btn-delete:hover:not(:disabled) { background: #B91C1C; }
        .oc-btn-delete:disabled { opacity: 0.65; cursor: not-allowed; }

        /* ── Testing Alert Modal Styles ── */
        .oc-modal--testing { max-width: 560px !important; }
        .oc-modal__header--testing { background: #F0FDFA; border-bottom: 1px solid #CCFBF1; }
        .oc-modal__icon--testing { background: #0D9488 !important; color: #fff !important; }
        .oc-test-body { max-height: 70vh; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; text-align: left; }
        .oc-test-item { display: flex; flex-direction: column; gap: 4px; border-bottom: 1px dashed #E2E8F0; padding-bottom: 10px; }
        .oc-test-item:last-child { border-bottom: none; padding-bottom: 0; }
        .oc-test-label { font-size: 0.75rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.03em; }
        .oc-test-value { background: #F1F5F9; color: #0F172A; padding: 4px 8px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; word-break: break-all; width: fit-content; border: 1px solid #E2E8F0; }
        .oc-test-text { color: #1E293B; font-size: 0.9rem; }
        .oc-test-desc { margin: 0; color: #334155; font-size: 0.88rem; background: #F8FAFC; padding: 8px 12px; border-radius: 6px; border-left: 3px solid #0D9488; }
        .oc-test-none { color: #D97706; font-weight: 600; font-size: 0.82rem; }
        .oc-test-tokens { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; max-height: 120px; overflow-y: auto; }
        .oc-test-token-row { display: flex; align-items: center; gap: 8px; }
        .oc-test-token-idx { font-size: 0.75rem; font-weight: 700; color: #0D9488; min-width: 24px; }
        .oc-test-token { background: #E2E8F0; color: #0F172A; padding: 3px 6px; border-radius: 4px; font-family: monospace; font-size: 0.78rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 440px; border: 1px solid #CBD5E1; }
      `}</style>
    </div>
  );
}
