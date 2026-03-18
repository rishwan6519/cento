"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Trash2,
  Music,
  Video,
  ImageIcon,
  Search,
  List,
  Grid,
  X,
  Maximize2,
  Download,
  AlertCircle,
  Play,
  FileAudio,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FolderOpen,
} from "lucide-react";
import toast from "react-hot-toast";

/**
 * Configuration
 */
const BASE_URL = "https://iot.centelon.com";
const ITEMS_PER_PAGE = 10;

let audioPlayer: HTMLAudioElement | null = null;

interface MediaFile {
  _id: string;
  name: string;
  type: "audio" | "video" | "image" | string;
  mime?: string;
  url: string;
  createdAt?: string;
  size?: number;
}

export default function ShowMedia() {
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [filtered, setFiltered] = useState<MediaFile[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "audio" | "video" | "image">("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [preview, setPreview] = useState<MediaFile | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedItems = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Media
  useEffect(() => {
    const fetchMedia = async () => {
      setIsLoading(true);
      try {
        const userId = localStorage.getItem("userId");
        const res = await fetch(`/api/media${userId ? `?userId=${userId}` : ""}`);
        if (!res.ok) throw new Error("Failed to fetch media");

        const data = await res.json();
        const rawList: any[] = data.media || data || [];

        const mediaList: MediaFile[] = rawList.map((item) => {
          const originalType: string = item.type || "";
          let category = "file";
          if (originalType.startsWith("image") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(item.url)) category = "image";
          else if (originalType.startsWith("video") || /\.(mp4|webm|mov|mkv)$/i.test(item.url)) category = "video";
          else if (originalType.startsWith("audio") || /\.(mp3|wav|ogg|m4a)$/i.test(item.url)) category = "audio";

          return {
            _id: item._id,
            name: item.name,
            type: category,
            mime: originalType,
            url: item.url,
            createdAt: item.createdAt,
            size: item.size,
          } as MediaFile;
        });

        setMedia(mediaList);
        setFiltered(mediaList);
      } catch (err) {
        console.error("Error fetching media:", err);
        toast.error("Failed to load media");
        setMedia([]);
        setFiltered([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMedia();
  }, []);

  // Filter Logic
  useEffect(() => {
    const q = search.trim().toLowerCase();
    const out = media.filter((m) => {
      const matchesType = filterType === "all" ? true : m.type === filterType;
      const matchesSearch = q === "" ? true : m.name.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
    setFiltered(out);
    setCurrentPage(1); // Reset to first page on filter change
  }, [search, filterType, media]);

  // --- Helper Functions ---

  const normalizeUrl = (url?: string): string => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const cleanPath = url.startsWith("/") ? url.slice(1) : url;
    return `${BASE_URL}/${cleanPath}`;
  };

  const formatDate = (d?: string) => {
    if (!d) return "Unknown";
    try {
      return new Date(d).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return d;
    }
  };

  // --- Actions ---

  const downloadFile = (m: MediaFile) => {
    const fullUrl = normalizeUrl(m.url);
    const link = document.createElement("a");
    link.href = fullUrl;
    link.target = "_blank";
    link.download = m.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      const userId = localStorage.getItem("userId");
      const res = await fetch(`/api/media/?userId=${userId}&mediaId=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");

      const newMedia = media.filter((m) => m._id !== id);
      setMedia(newMedia);
      const q = search.trim().toLowerCase();
      setFiltered(
        newMedia.filter((m) => {
          const matchesType = filterType === "all" ? true : m.type === filterType;
          const matchesSearch = q === "" ? true : m.name.toLowerCase().includes(q);
          return matchesType && matchesSearch;
        })
      );
      toast.success("Media deleted");
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    }
  };

  const openPreview = (m: MediaFile) => {
    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer = null;
    }
    setPreview(m);
  };

  const closePreview = () => {
    setPreview(null);
    document.querySelectorAll<HTMLMediaElement>("audio,video").forEach((el) => el.pause());
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // --- Render ---
  const renderContent = () => {
    // Loading state
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 size={48} className="animate-spin text-orange-400 mb-4" />
          <p className="text-sm font-medium text-slate-500">Loading your media library...</p>
        </div>
      );
    }

    // Empty state
    if (media.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <div className="bg-slate-50 p-8 rounded-full mb-4">
            <FolderOpen size={48} className="opacity-40" />
          </div>
          <p className="text-lg font-semibold text-slate-600 mb-1">No files available</p>
          <p className="text-sm text-slate-400">Upload some media to get started.</p>
        </div>
      );
    }

    // Empty search/filter result
    if (filtered.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="bg-slate-50 p-6 rounded-full mb-3">
            <Search size={32} className="opacity-50" />
          </div>
          <p className="font-medium">No media matches your search</p>
          <button
            onClick={() => { setSearch(""); setFilterType("all"); }}
            className="mt-3 text-sm text-orange-500 hover:underline"
          >
            Clear filters
          </button>
        </div>
      );
    }

    if (viewMode === "list") {
      return (
        <div className="space-y-3">
          {paginatedItems.map((m) => (
            <div
              key={m._id}
              className="group flex flex-col sm:flex-row sm:items-center gap-3 bg-[#E9FBFD] hover:bg-[#dff6fa] transition rounded-xl px-3 py-3 shadow-sm border border-transparent hover:border-orange-100"
            >
              {/* Media Thumbnail */}
              <div className="flex items-center gap-4 w-full sm:w-2/5">
                <div
                  className="h-16 w-24 shrink-0 rounded-lg bg-slate-200 overflow-hidden relative cursor-pointer"
                  onClick={() => openPreview(m)}
                >
                  <MediaThumbnail file={m} normalizeUrl={normalizeUrl} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate" title={m.name}>
                    {m.name}
                  </div>
                  <div className="text-xs text-slate-500 sm:hidden mt-1">{formatDate(m.createdAt)}</div>
                </div>
              </div>

              {/* Metadata */}
              <div className="flex items-center justify-between sm:justify-center w-full sm:w-1/5 text-sm text-slate-600">
                <span className="capitalize bg-white/50 px-2 py-0.5 rounded text-xs border border-slate-100">
                  {m.type}
                </span>
              </div>
              <div className="hidden sm:block sm:w-1/5 text-center text-sm text-slate-600">
                {formatDate(m.createdAt)}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-2 sm:mt-0 ml-auto">
                {(m.type === "video" || m.type === "audio") && (
                  <button
                    onClick={() => openPreview(m)}
                    title="Play"
                    className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-500 hover:text-green-600 hover:scale-105 transition"
                  >
                    <Play size={14} className="ml-0.5 fill-current" />
                  </button>
                )}
                <button
                  onClick={() => downloadFile(m)}
                  title="Download"
                  className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-500 hover:text-orange-500 hover:scale-105 transition"
                >
                  <Download size={15} />
                </button>
                <button
                  onClick={() => handleDelete(m._id)}
                  title="Delete"
                  className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 hover:scale-105 transition"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Grid View
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {paginatedItems.map((m) => (
          <div
            key={m._id}
            className="group bg-[#E9FBFD] hover:bg-[#dff6fa] rounded-xl overflow-hidden shadow-sm border border-transparent hover:border-orange-100 flex flex-col transition h-full"
          >
            <div
              className="aspect-video w-full bg-slate-200 relative cursor-pointer overflow-hidden"
              onClick={() => openPreview(m)}
            >
              <MediaThumbnail file={m} normalizeUrl={normalizeUrl} />
            </div>

            <div className="p-3 flex flex-col flex-1">
              <div className="mb-2">
                <div className="text-sm font-semibold text-slate-900 truncate" title={m.name}>
                  {m.name}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 flex justify-between">
                  <span>{formatDate(m.createdAt)}</span>
                  <span className="uppercase text-[10px] bg-slate-200/50 px-1.5 rounded">{m.type}</span>
                </div>
              </div>

              <div className="mt-auto pt-2 flex items-center justify-end gap-2 border-t border-slate-200/50">
                {(m.type === "video" || m.type === "audio") && (
                  <button
                    onClick={() => openPreview(m)}
                    className="h-8 w-8 rounded-full bg-white hover:bg-green-50 shadow-sm flex items-center justify-center text-slate-500 hover:text-green-600 transition"
                  >
                    <Play size={14} className="ml-0.5 fill-current" />
                  </button>
                )}
                <button
                  onClick={() => downloadFile(m)}
                  className="h-8 w-8 rounded-full bg-white hover:bg-orange-50 shadow-sm flex items-center justify-center text-slate-500 hover:text-orange-500 transition"
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={() => handleDelete(m._id)}
                  className="h-8 w-8 rounded-full bg-white hover:bg-red-50 shadow-sm flex items-center justify-center text-slate-500 hover:text-red-500 transition"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#EAF9FB] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 min-h-[500px]">

          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <h1 className="text-slate-900 text-2xl font-semibold">Media Library</h1>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* Search */}
              <div className="flex items-center bg-white border border-slate-200 rounded-full px-4 shadow-sm flex-1 sm:w-80 transition-colors focus-within:border-orange-400">
                <Search size={18} className="text-slate-400 mr-2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="outline-none py-2.5 w-full text-sm text-slate-700 placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-2">
                {/* Filter Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowFilterDropdown((s) => !s)}
                    className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-full px-4 py-2.5 shadow-sm min-w-[140px] text-sm text-slate-700 hover:bg-slate-50 transition"
                  >
                    <span className="capitalize">{filterType === "all" ? "All Media" : filterType}</span>
                    <svg
                      className={`w-4 h-4 text-slate-500 transition-transform ${showFilterDropdown ? "rotate-180" : ""}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.293l3.71-4.06a.75.75 0 011.12 1L10.53 13.03a.75.75 0 01-1.06 0L5.2 8.27a.75.75 0 01.03-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {showFilterDropdown && (
                    <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-100 rounded-xl shadow-lg z-20 overflow-hidden py-1">
                      {["all", "audio", "video", "image"].map((type) => (
                        <button
                          key={type}
                          onClick={() => {
                            setFilterType(type as any);
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-orange-50 hover:text-orange-600 transition ${
                            filterType === type ? "bg-orange-50 text-orange-600 font-medium" : "text-slate-600"
                          }`}
                        >
                          {type === "all" ? "All Media" : type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* View Mode */}
                <div className="flex bg-slate-100 p-1 rounded-full">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-full transition ${
                      viewMode === "list" ? "bg-white text-orange-500 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <List size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-full transition ${
                      viewMode === "grid" ? "bg-white text-orange-500 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Grid size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          {renderContent()}

          {/* Footer: item count + pagination */}
          {!isLoading && filtered.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-500">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} items
              </p>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 w-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      // Show pages near current, first, and last
                      return (
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - currentPage) <= 1
                      );
                    })
                    .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                        acc.push("...");
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === "..." ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 text-sm">
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => setCurrentPage(item as number)}
                          className={`h-8 w-8 rounded-full text-sm font-medium transition ${
                            currentPage === item
                              ? "bg-orange-500 text-white shadow-sm"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {preview && (
        <PreviewModal
          file={preview}
          onClose={closePreview}
          onDownload={() => downloadFile(preview)}
          normalizeUrl={normalizeUrl}
        />
      )}
    </div>
  );
}

// --- Thumbnail Component ---
function MediaThumbnail({
  file,
  normalizeUrl,
}: {
  file: MediaFile;
  normalizeUrl: (s: string) => string;
}) {
  const fullUrl = normalizeUrl(file.url);

  if (file.type === "image") {
    return (
      <img
        src={fullUrl}
        alt={file.name}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        crossOrigin="anonymous"
        loading="lazy"
      />
    );
  }

  if (file.type === "video") {
    return (
      <div className="w-full h-full relative bg-black flex items-center justify-center group/video">
        <video
          src={fullUrl}
          className="w-full h-full object-cover opacity-80"
          muted
          preload="metadata"
          crossOrigin="anonymous"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover/video:scale-110 transition">
            <Play size={18} className="text-white fill-white ml-1" />
          </div>
        </div>
      </div>
    );
  }

  if (file.type === "audio") {
    return (
      <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-50 flex flex-col items-center justify-center text-orange-400">
        <FileAudio size={28} />
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
      <AlertCircle size={24} />
    </div>
  );
}

// --- Preview Modal ---
function PreviewModal({
  file,
  onClose,
  onDownload,
  normalizeUrl,
}: {
  file: MediaFile;
  onClose: () => void;
  onDownload: () => void;
  normalizeUrl: (url: string) => string;
}) {
  const fullUrl = normalizeUrl(file.url);
  const [error, setError] = useState(false);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-5xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <h3 className="text-base font-semibold text-slate-800 truncate pr-4">{file.name}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onDownload}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-600 hover:text-orange-600 transition"
              title="Download"
            >
              <Download size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-red-50 text-slate-600 hover:text-red-600 transition"
              title="Close"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-black/95 flex items-center justify-center flex-1 overflow-hidden p-4 relative min-h-[400px]">
          {error ? (
            <div className="text-center text-slate-400">
              <AlertCircle size={48} className="mx-auto mb-2 text-red-400" />
              <p>Failed to load media.</p>
              <p className="text-xs mt-1 opacity-60 break-all">{fullUrl}</p>
            </div>
          ) : (
            <>
              {file.type === "image" && (
                <img
                  key={file._id}
                  src={fullUrl}
                  alt={file.name}
                  className="max-w-full max-h-[70vh] object-contain rounded-md"
                  crossOrigin="anonymous"
                  onError={() => setError(true)}
                />
              )}
              {file.type === "video" && (
                <video
                  key={file._id}
                  controls
                  playsInline
                  autoPlay
                  className="max-w-full max-h-[70vh] rounded-md focus:outline-none"
                  crossOrigin="anonymous"
                  onError={() => setError(true)}
                >
                  <source src={fullUrl} />
                  Your browser does not support the video tag.
                </video>
              )}
              {file.type === "audio" && (
                <div className="w-full max-w-md bg-white/10 p-8 rounded-2xl backdrop-blur-md flex flex-col items-center">
                  <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30 animate-pulse">
                    <Music size={40} className="text-white" />
                  </div>
                  <audio
                    key={file._id}
                    controls
                    autoPlay
                    className="w-full"
                    crossOrigin="anonymous"
                    onError={() => setError(true)}
                  >
                    <source src={fullUrl} />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>
            Type: <span className="uppercase">{file.type}</span>
          </span>
        </div>
      </div>
    </div>
  );
}