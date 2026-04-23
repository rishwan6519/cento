"use client";
import React, { useState, useEffect } from "react";
import CreatePlaylistView from "./CreatePlaylistView";
import ViewPlaylists from "./ViewPlaylists";
import CreateInstantPlaylist from "./CreateInstantPlaylist";
import CreateInstantAnnouncement from "./CreateInstantAnnouncement";
import CreateAnnouncementView from "./CreateAnnouncementView";
import ViewAnnouncements from "./ViewAnnouncements";
import ProfileView from "./ProfileView";
import {
  FaTh,
  FaMusic,
  FaUser,
  FaHeadset,
  FaSignOutAlt,
  FaBell,
  FaChevronDown,
  FaChevronRight,
  FaPlus,
  FaEye,
  FaBolt,
  FaEdit,
  FaTrash,
  FaExclamationTriangle,
  FaWifi,
  FaArrowRight,
  FaTimes,
  FaBars,
  FaSearch,
} from "react-icons/fa";
import { MdCampaign } from "react-icons/md";
import { BsMusicNoteList } from "react-icons/bs";

// ─── Types ───────────────────────────────────────────────────────────────────
export type ViewKey =
  | "dashboard"
  | "viewAllCampaigns"
  | "createMediaPlaylist"
  | "createAnnouncementPlaylist"
  | "createPlaylistForm"
  | "viewPlaylists"
  | "createInstantPlaylist"
  | "createAnnouncementForm"
  | "viewAnnouncements"
  | "createInstantAnnouncement"
  | "profile"
  | "support"
  | "mediaManagement";

interface Campaign {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
}

interface OfflineDevice {
  id: string;
  name: string;
  type: string;
  sn: string;
  lastSync: string;
  status: string; // 'online' or 'offline'
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
// MOCK_CAMPAIGNS removed — now fetching dynamically

const MOCK_OFFLINE_DEVICES: OfflineDevice[] = [
  { id: "1", name: "Demo device", type: "Demo device", sn: "DE7685", lastSync: "15/04/2026", status: "inactive" },
];

// ─── Sidebar Component ────────────────────────────────────────────────────────
interface SidebarProps {
  activeView: ViewKey;
  onNavigate: (view: ViewKey) => void;
  mediaOpen: boolean;
  setMediaOpen: (v: boolean) => void;
  supportOpen: boolean;
  setSupportOpen: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onNavigate,
  mediaOpen,
  setMediaOpen,
  supportOpen,
  setSupportOpen,
  mobileOpen,
  setMobileOpen,
}) => {
  const isActive = (view: ViewKey) => activeView === view;
  const isMediaActive =
    activeView === "mediaManagement" ||
    activeView === "viewAllCampaigns" ||
    activeView === "createMediaPlaylist" ||
    activeView === "createAnnouncementPlaylist" ||
    activeView === "createPlaylistForm" ||
    activeView === "viewPlaylists" ||
    activeView === "createInstantPlaylist" ||
    activeView === "createAnnouncementForm" ||
    activeView === "viewAnnouncements" ||
    activeView === "createInstantAnnouncement";

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="store-mobile-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`store-sidebar ${mobileOpen ? "store-sidebar--open" : ""}`}>
        {/* Logo */}
        <div className="store-sidebar__logo">
          <div className="store-logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="9" height="9" rx="2" fill="currentColor" opacity="0.9" />
              <rect x="13" y="2" width="9" height="9" rx="2" fill="currentColor" opacity="0.6" />
              <rect x="2" y="13" width="9" height="9" rx="2" fill="currentColor" opacity="0.6" />
              <rect x="13" y="13" width="9" height="9" rx="2" fill="currentColor" opacity="0.3" />
            </svg>
          </div>
          <div>
            <p className="store-logo-title">DeviceHub</p>
            <p className="store-logo-subtitle">store user</p>
          </div>
          <button
            className="store-sidebar__close-btn"
            onClick={() => setMobileOpen(false)}
          >
            <FaTimes />
          </button>
        </div>

        {/* Navigation */}
        <nav className="store-sidebar__nav">
          {/* Dashboard */}
          <button
            className={`store-nav-item ${isActive("dashboard") ? "store-nav-item--active" : ""}`}
            onClick={() => onNavigate("dashboard")}
          >
            <FaTh className="store-nav-item__icon" />
            <span>Dashboard</span>
          </button>

          {/* Media management */}
          <div>
            <button
              className={`store-nav-item ${isMediaActive ? "store-nav-item--media-active" : ""}`}
              onClick={() => setMediaOpen(!mediaOpen)}
            >
              <BsMusicNoteList className="store-nav-item__icon" />
              <span>Media management</span>
              <span className="store-nav-item__chevron">
                {mediaOpen ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
              </span>
            </button>
            {mediaOpen && (
              <div className="store-nav-submenu">
                <button
                  className={`store-nav-sub-item ${isActive("createMediaPlaylist") ? "store-nav-sub-item--active" : ""}`}
                  onClick={() => onNavigate("createMediaPlaylist")}
                >
                  <FaPlus size={10} />
                  <span>Create media playlist</span>
                </button>
                <button
                  className={`store-nav-sub-item ${isActive("createAnnouncementPlaylist") ? "store-nav-sub-item--active" : ""}`}
                  onClick={() => onNavigate("createAnnouncementPlaylist")}
                >
                  <FaPlus size={10} />
                  <span>Create announcement playlist</span>
                </button>
                <button
                  className={`store-nav-sub-item ${isActive("viewAllCampaigns") ? "store-nav-sub-item--active" : ""}`}
                  onClick={() => onNavigate("viewAllCampaigns")}
                >
                  <MdCampaign size={12} />
                  <span>View all active campaigns</span>
                </button>
              </div>
            )}
          </div>

          {/* Profile */}
          <button
            className={`store-nav-item ${isActive("profile") ? "store-nav-item--active" : ""}`}
            onClick={() => onNavigate("profile")}
          >
            <FaUser className="store-nav-item__icon" />
            <span>Profile</span>
          </button>

          {/* Support */}
          <div>
            <button
              className={`store-nav-item ${isActive("support") ? "store-nav-item--active" : ""}`}
              onClick={() => setSupportOpen(!supportOpen)}
            >
              <FaHeadset className="store-nav-item__icon" />
              <span>Support</span>
              <span className="store-nav-item__chevron">
                {supportOpen ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
              </span>
            </button>
          </div>

          {/* Logout */}
          <button
            className="store-nav-item store-nav-item--logout"
            onClick={() => { localStorage.clear(); window.location.href = "/login"; }}
          >
            <FaSignOutAlt className="store-nav-item__icon" />
            <span>Logout</span>
          </button>
        </nav>

        {/* Platform Version */}
        <div className="store-sidebar__version">
          <p className="store-version-label">Platform Version</p>
          <p className="store-version-number">v2.4.1</p>
          <p className="store-version-date">Last updated: Mar 23, 2026</p>
        </div>
      </aside>
    </>
  );
};

// ─── Header Component ─────────────────────────────────────────────────────────
interface HeaderProps {
  userName: string;
  onMobileMenuOpen: () => void;
}

const Header: React.FC<HeaderProps> = ({ userName, onMobileMenuOpen }) => {
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="store-header">
      <button className="store-header__menu-btn" onClick={onMobileMenuOpen}>
        <FaBars />
      </button>
      <div className="store-header__search">
        <FaSearch className="store-header__search-icon" />
        <input
          type="text"
          placeholder="Search devices, stores, media..."
          className="store-header__search-input"
        />
      </div>
      <div className="store-header__actions">
        <button className="store-header__bell">
          <FaBell />
          <span className="store-header__bell-badge" />
        </button>
        <div className="store-header__user">
          <div className="store-header__avatar">{initials}</div>
          <div className="store-header__user-info">
            <p className="store-header__user-name">{userName}</p>
            <p className="store-header__user-role">store user</p>
          </div>
          <FaChevronDown size={11} className="store-header__user-chevron" />
        </div>
      </div>
    </header>
  );
};

// ─── Dashboard View ───────────────────────────────────────────────────────────
interface DashboardViewProps {
  userName: string;
  offlineDevices: OfflineDevice[];
  onNavigate: (view: ViewKey) => void;
}

const StoreDashboard: React.FC<DashboardViewProps> = ({ userName, offlineDevices, onNavigate }) => {
  const [stats, setStats] = useState({ playlists: 0, announcements: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") ?? "" : "";
    if (!userId) { setLoadingStats(false); return; }

    Promise.all([
      fetch(`/api/playlists?userId=${userId}`).then(r => r.json()).catch(() => ([])),
    ]).then(([playlistData]) => {
      const allPlaylists = Array.isArray(playlistData) ? playlistData : (playlistData.playlists || playlistData.data || []);
      const mediaPlaylists = allPlaylists.filter((p: any) => p.type !== 'announcement');
      const announcementPlaylists = allPlaylists.filter((p: any) => p.type === 'announcement');
      setStats({
        playlists: mediaPlaylists.length,
        announcements: announcementPlaylists.length,
      });
    }).finally(() => setLoadingStats(false));
  }, []);

  return (
  <div className="store-view">
    {/* Welcome Banner */}
    <div className="store-welcome-banner">
      <div className="store-welcome-banner__text">
        <h1 className="store-welcome-banner__title">Welcome back, {userName} !</h1>
        <p className="store-welcome-banner__subtitle">
          Here's what's happening with your accounts today.
        </p>
      </div>
      <div className="store-welcome-banner__stats">
        <div className="store-stat-card">
          <div className="store-stat-card__header">
            <span className="store-stat-card__label">Active media playlist</span>
            <BsMusicNoteList className="store-stat-card__icon" />
          </div>
          <p className="store-stat-card__value">
            {loadingStats ? "—" : stats.playlists}
          </p>
        </div>
        <div className="store-stat-card">
          <div className="store-stat-card__header">
            <span className="store-stat-card__label">Active announcement playlist</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <p className="store-stat-card__value">
            {loadingStats ? "—" : stats.announcements}
          </p>
        </div>
      </div>
    </div>

    {/* Bottom Row */}
    <div className="store-bottom-row">
      {/* Attention Required */}
      <div className="store-attention-section">
        <div className="store-attention-section__header">
          <div className="store-attention-icon">
            <FaExclamationTriangle />
          </div>
          <h2 className="store-attention-section__title">Attention Required</h2>
        </div>

        {offlineDevices.length === 0 ? (
          <div className="store-no-issues">
            <p>All devices are online and operating normally.</p>
          </div>
        ) : (
          <div className="store-offline-devices">
            {offlineDevices.map((device) => (
              <div key={device.id} className="store-device-card">
                <div className={`store-device-card__badge ${
                  device.status === 'online'
                    ? 'store-device-card__badge--online'
                    : 'store-device-card__badge--offline'
                }`}>
                  <FaWifi />
                  <span>{device.status === 'online' ? 'online' : 'offline'}</span>
                </div>
                <div className="store-device-card__icon-wrap">
                  <FaWifi className="store-device-card__device-icon" />
                </div>
                <p className="store-device-card__name">{device.name}</p>
                <p className="store-device-card__meta">
                  Type : {device.type} | SN : {device.sn}
                </p>
                <p className="store-device-card__sync">Last sync : {device.lastSync}</p>
                <button className="store-device-card__raise-btn">
                  Raise issue <FaArrowRight size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="store-quick-actions">
        <h3 className="store-quick-actions__title">Quick Actions</h3>
        <button
          className="store-quick-action-btn store-quick-action-btn--orange"
          onClick={() => onNavigate("createMediaPlaylist")}
        >
          <span>Create new media playlist</span>
          <FaPlus />
        </button>
        <button
          className="store-quick-action-btn store-quick-action-btn--teal"
          onClick={() => onNavigate("createAnnouncementPlaylist")}
        >
          <span>Create new announcement playlist</span>
          <FaPlus />
        </button>
      </div>
    </div>
  </div>
  );
};


// ─── Active Campaigns View ────────────────────────────────────────────────────
// Removed ActiveCampaignsView as it was replaced by ViewPlaylists

// ─── Media Management View ────────────────────────────────────────────────────
const MediaManagementView: React.FC<{ onNavigate: (v: ViewKey) => void }> = ({ onNavigate }) => (
  <div className="store-view">
    {/* Media Playlist */}
    <div className="store-media-section">
      <div className="store-media-section__header">
        <div className="store-media-section__icon-wrap">
          <BsMusicNoteList />
        </div>
        <div>
          <h2 className="store-media-section__title">Media playlist</h2>
          <p className="store-media-section__subtitle">Create and manage video and audio content</p>
        </div>
      </div>
      <div className="store-media-cards">
        <div className="store-media-option-card">
          <div className="store-media-option-card__icon store-media-option-card__icon--orange">
            <FaPlus />
          </div>
          <h3>Create new playlist</h3>
          <p>Start building a new media playlist from scratch</p>
          <button className="store-media-option-btn store-media-option-btn--orange" onClick={() => onNavigate("createPlaylistForm")}>
            Create playlist
          </button>
        </div>
        <div className="store-media-option-card">
          <div className="store-media-option-card__icon store-media-option-card__icon--teal">
            <FaEye />
          </div>
          <h3>View playlist</h3>
          <p>Browse and manage all existing media playlist</p>
          <button className="store-media-option-btn store-media-option-btn--orange" onClick={() => onNavigate("viewPlaylists")}>
            View playlist
          </button>
        </div>
        <div className="store-media-option-card">
          <div className="store-media-option-card__icon store-media-option-card__icon--orange2">
            <FaBolt />
          </div>
          <h3>Instant playlist</h3>
          <p>Quick access to create instant playlist</p>
          <button className="store-media-option-btn store-media-option-btn--orange" onClick={() => onNavigate("createInstantPlaylist")}>
            Instant playlist
          </button>
        </div>
      </div>
    </div>

    {/* Announcement Playlist */}
    <div className="store-media-section">
      <div className="store-media-section__header">
        <div className="store-media-section__icon-wrap">
          <MdCampaign />
        </div>
        <div>
          <h2 className="store-media-section__title">Announcement playlist</h2>
          <p className="store-media-section__subtitle">Broadcast important messages and notifications</p>
        </div>
      </div>
      <div className="store-media-cards">
        <div className="store-media-option-card">
          <div className="store-media-option-card__icon store-media-option-card__icon--orange">
            <FaPlus />
          </div>
          <h3>Create announcements</h3>
          <p>Design new announcement campaigns and messages</p>
          <button className="store-media-option-btn store-media-option-btn--orange" onClick={() => onNavigate("createAnnouncementForm")}>
            Create announcements
          </button>
        </div>
        <div className="store-media-option-card">
          <div className="store-media-option-card__icon store-media-option-card__icon--teal">
            <FaEye />
          </div>
          <h3>View announcements</h3>
          <p>Review and manage existing announcements</p>
          <button className="store-media-option-btn store-media-option-btn--orange" onClick={() => onNavigate("viewAnnouncements")}>
            View announcements
          </button>
        </div>
        <div className="store-media-option-card">
          <div className="store-media-option-card__icon store-media-option-card__icon--orange2">
            <FaBolt />
          </div>
          <h3>Instant announcements</h3>
          <p>Send urgent messages using instant announcements</p>
          <button className="store-media-option-btn store-media-option-btn--orange" onClick={() => onNavigate("createInstantAnnouncement")}>
            Instant announcements
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ─── Placeholder Views ────────────────────────────────────────────────────────
const PlaceholderView: React.FC<{ title: string }> = ({ title }) => (
  <div className="store-view store-placeholder">
    <h2>{title}</h2>
    <p>This section is coming soon.</p>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StorePage() {
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [mediaOpen, setMediaOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userName, setUserName] = useState("Store User");
  const [devices, setDevices] = useState<OfflineDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "store") {
      window.location.href = "/login";
      return;
    }

    const fetchUser = async () => {
      const id = localStorage.getItem("userId");
      if (!id) return;
      try {
        const res = await fetch(`/api/user?userId=${id}`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          const user = data.data[0];
          setUserName(user.storeName || user.username || "Store User");
        }
      } catch (err) {
        console.error("Failed to fetch user", err);
      }
    };
    fetchUser();

    // Fetch real connected devices
    const fetchDevices = async () => {
      const uid = localStorage.getItem("userId");
      if (!uid) return;
      setLoadingDevices(true);
      try {
        const res = await fetch(`/api/assign-device?userId=${uid}`);
        const data = await res.json();
        if (data?.success && Array.isArray(data.data)) {
          const mapped: OfflineDevice[] = data.data.map((a: any) => ({
            id: a._id || a.deviceId?._id || String(Math.random()),
            name: a.deviceId?.name || "Unknown Device",
            type: a.deviceId?.typeId?.name || "Device",
            sn: a.deviceId?.serialNumber || "N/A",
            lastSync: a.updatedAt ? new Date(a.updatedAt).toLocaleDateString() : "N/A",
            status: a.deviceId?.status || "inactive",
          }));
          setDevices(mapped);
        } else {
          setDevices([]);
        }
      } catch {
        setDevices([]);
      } finally {
        setLoadingDevices(false);
      }
    };
    fetchDevices();

    // Open media submenu if on a media sub-page
    if (
      activeView === "viewAllCampaigns" ||
      activeView === "createMediaPlaylist" ||
      activeView === "createAnnouncementPlaylist"
    ) {
      setMediaOpen(true);
    }
  }, []);

  const handleNavigate = (view: ViewKey) => {
    setActiveView(view);
    setMobileOpen(false);
    if (
      view === "viewAllCampaigns" ||
      view === "createMediaPlaylist" ||
      view === "createAnnouncementPlaylist" ||
      view === "createPlaylistForm" ||
      view === "viewPlaylists" ||
      view === "createInstantPlaylist" ||
      view === "createAnnouncementForm" ||
      view === "viewAnnouncements" ||
      view === "createInstantAnnouncement"
    ) {
      setMediaOpen(true);
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return (
          <StoreDashboard
            userName={userName}
            offlineDevices={devices}
            onNavigate={handleNavigate}
          />
        );
      case "viewAllCampaigns":
        return <ViewPlaylists title="Active Campaigns" subtitle="Manage your active campaigns and announcements" />;
      case "createMediaPlaylist":
      case "createAnnouncementPlaylist":
        return <MediaManagementView onNavigate={handleNavigate} />;
      case "createPlaylistForm":
        return <CreatePlaylistView onNavigate={handleNavigate} />;
      case "viewPlaylists":
        return <ViewPlaylists type="media" />;
      case "createInstantPlaylist":
        return <CreateInstantPlaylist onNavigate={handleNavigate} />;
      case "createInstantAnnouncement":
        return <CreateInstantAnnouncement onNavigate={handleNavigate} />;
      case "createAnnouncementForm":
        return <CreateAnnouncementView onNavigate={handleNavigate} />;
      case "viewAnnouncements":
        return <ViewPlaylists title="View announcements" subtitle="Review and manage your existing announcements" type="announcement" />;
      case "profile":
        return <ProfileView userId={typeof window !== "undefined" ? localStorage.getItem("userId") ?? "" : ""} />;
      case "support":
        return <PlaceholderView title="Support" />;
      default:
        return (
          <StoreDashboard
            userName={userName}
            offlineDevices={devices}
            onNavigate={handleNavigate}
          />
        );
    }
  };

  return (
    <>
      <style>{`
        /* ── Reset & Base ── */
        .store-root *, .store-root *::before, .store-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .store-root { display: flex; height: 100vh; overflow: hidden; font-family: 'Inter', 'Geist', sans-serif; background: #e8f4f8; }

        /* ── Sidebar ── */
        .store-sidebar {
          width: 215px; min-width: 215px; height: 100vh;
          background: #0d2b33;
          display: flex; flex-direction: column;
          position: relative; z-index: 100;
          transition: transform 0.3s ease;
          flex-shrink: 0;
        }
        @media (max-width: 768px) {
          .store-sidebar { position: fixed; top: 0; left: 0; transform: translateX(-100%); }
          .store-sidebar--open { transform: translateX(0); }
          .store-mobile-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99; }
        }
        .store-sidebar__close-btn { display: none; margin-left: auto; background: none; border: none; color: #7aa6b0; cursor: pointer; font-size: 1rem; }
        @media (max-width: 768px) { .store-sidebar__close-btn { display: flex; align-items: center; justify-content: center; } }

        /* Logo */
        .store-sidebar__logo {
          display: flex; align-items: center; gap: 10px;
          padding: 20px 18px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .store-logo-icon {
          width: 38px; height: 38px; border-radius: 10px;
          background: #17a9b0;
          display: flex; align-items: center; justify-content: center;
          color: white; flex-shrink: 0;
        }
        .store-logo-title { font-size: 0.95rem; font-weight: 700; color: #fff; line-height: 1.2; }
        .store-logo-subtitle { font-size: 0.68rem; color: #7aa6b0; font-weight: 400; }

        /* Nav */
        .store-sidebar__nav { flex: 1; padding: 10px 10px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
        .store-nav-item {
          width: 100%; display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 8px;
          background: none; border: none; cursor: pointer;
          color: #9fc3cb; font-size: 0.825rem; font-weight: 500;
          text-align: left; transition: all 0.15s ease;
        }
        .store-nav-item:hover { background: rgba(255,255,255,0.07); color: #d6eff4; }
        .store-nav-item--active { background: #e85c23 !important; color: #fff !important; font-weight: 600; }
        .store-nav-item--media-active { color: #d6eff4; }
        .store-nav-item--logout { color: #9fc3cb; margin-top: 4px; }
        .store-nav-item--logout:hover { background: rgba(232,92,35,0.1); color: #e85c23; }
        .store-nav-item__icon { font-size: 0.95rem; flex-shrink: 0; }
        .store-nav-item__chevron { margin-left: auto; color: #7aa6b0; }

        /* Submenu */
        .store-nav-submenu { padding: 3px 0 3px 28px; display: flex; flex-direction: column; gap: 1px; }
        .store-nav-sub-item {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 10px; border-radius: 7px;
          background: none; border: none; cursor: pointer;
          color: #7aa6b0; font-size: 0.78rem; font-weight: 500;
          text-align: left; width: 100%; transition: all 0.15s ease;
        }
        .store-nav-sub-item:hover { background: rgba(255,255,255,0.06); color: #c8e8ee; }
        .store-nav-sub-item--active { background: #e85c23 !important; color: #fff !important; font-weight: 600; }

        /* Version */
        .store-sidebar__version {
          margin: 10px; padding: 12px 14px;
          background: rgba(255,255,255,0.05); border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.07);
        }
        .store-version-label { font-size: 0.68rem; color: #7aa6b0; font-weight: 500; }
        .store-version-number { font-size: 1rem; color: #fff; font-weight: 700; margin: 2px 0 1px; }
        .store-version-date { font-size: 0.65rem; color: #7aa6b0; }

        /* ── Layout Right ── */
        .store-layout-right { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

        /* ── Header ── */
        .store-header {
          display: flex; align-items: center; gap: 14px;
          padding: 12px 22px; background: #fff;
          border-bottom: 1px solid #e9eef2;
          height: 62px; flex-shrink: 0;
        }
        .store-header__menu-btn { display: none; background: none; border: none; cursor: pointer; font-size: 1.1rem; color: #555; }
        @media (max-width: 768px) { .store-header__menu-btn { display: flex; align-items: center; } }

        .store-header__search { flex: 1; max-width: 440px; display: flex; align-items: center; gap: 9px; background: #f5f7fa; border: 1px solid #e9eef2; border-radius: 24px; padding: 8px 16px; }
        .store-header__search-icon { color: #aab4be; font-size: 0.85rem; flex-shrink: 0; }
        .store-header__search-input { background: none; border: none; outline: none; font-size: 0.82rem; color: #555; font-family: inherit; width: 100%; }
        .store-header__search-input::placeholder { color: #aab4be; }

        .store-header__actions { margin-left: auto; display: flex; align-items: center; gap: 14px; }
        .store-header__bell { position: relative; background: none; border: none; cursor: pointer; color: #555; font-size: 1.1rem; display: flex; align-items: center; }
        .store-header__bell-badge { position: absolute; top: -2px; right: -2px; width: 8px; height: 8px; background: #e85c23; border-radius: 50%; border: 1.5px solid #fff; }

        .store-header__user { display: flex; align-items: center; gap: 10px; cursor: pointer; }
        .store-header__avatar { width: 34px; height: 34px; border-radius: 50%; background: #1aa8b0; color: #fff; font-size: 0.8rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .store-header__user-name { font-size: 0.82rem; font-weight: 600; color: #1a2c35; line-height: 1.2; }
        .store-header__user-role { font-size: 0.68rem; color: #8a9bad; }
        .store-header__user-chevron { color: #8a9bad; }

        /* ── Content Area ── */
        .store-content { flex: 1; overflow-y: auto; padding: 20px 22px; }

        /* ── View Wrapper ── */
        .store-view { display: flex; flex-direction: column; gap: 18px; }

        /* ── Welcome Banner ── */
        .store-welcome-banner {
          background: linear-gradient(135deg, #0e3540 0%, #1a5a6b 100%);
          border-radius: 14px; padding: 26px 24px 20px;
          color: #fff;
        }
        .store-welcome-banner__title { font-size: 1.45rem; font-weight: 700; margin-bottom: 5px; }
        .store-welcome-banner__subtitle { font-size: 0.82rem; color: rgba(255,255,255,0.75); margin-bottom: 20px; }
        .store-welcome-banner__stats { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

        .store-stat-card { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 14px 16px; }
        .store-stat-card__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
        .store-stat-card__label { font-size: 0.78rem; color: rgba(255,255,255,0.8); font-weight: 500; line-height: 1.3; }
        .store-stat-card__icon { color: rgba(255,255,255,0.7); font-size: 0.9rem; flex-shrink: 0; margin-top: 1px; }
        .store-stat-card__value { font-size: 1.9rem; font-weight: 800; color: #fff; }

        /* ── Bottom Row ── */
        .store-bottom-row { display: grid; grid-template-columns: 1fr 280px; gap: 18px; }
        @media (max-width: 900px) { .store-bottom-row { grid-template-columns: 1fr; } }

        /* ── Attention Section ── */
        .store-attention-section { background: #fff; border-radius: 14px; padding: 18px; }
        .store-attention-section__header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
        .store-attention-icon {
          width: 34px; height: 34px; border-radius: 8px;
          background: linear-gradient(135deg, #17a9b0, #0e3540);
          color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.85rem;
        }
        .store-attention-section__title { font-size: 1.05rem; font-weight: 700; color: #1a2c35; }

        .store-offline-devices { display: flex; flex-direction: column; gap: 12px; }
        .store-device-card {
          position: relative; border: 2px solid #e85c23;
          border-left: 4px solid #e85c23;
          border-radius: 10px; padding: 16px 16px 12px;
          display: flex; flex-direction: column; align-items: center; text-align: center;
          background: #fff;
        }
        .store-device-card__badge {
          position: absolute; top: 10px; right: 10px;
          display: flex; align-items: center; gap: 5px;
          font-size: 0.68rem; font-weight: 600; padding: 3px 9px; border-radius: 20px;
        }
        .store-device-card__badge--offline { background: #fff3ee; color: #e85c23; border: 1px solid #fbd4c0; }
        .store-device-card__badge--online { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
        .store-device-card__icon-wrap {
          width: 44px; height: 44px; border-radius: 10px;
          background: #f5f7fa; border: 1px solid #e9eef2;
          display: flex; align-items: center; justify-content: center;
          color: #bbc5cc; font-size: 1.1rem; margin-bottom: 8px;
        }
        .store-device-card__device-icon { opacity: 0.5; }
        .store-device-card__name { font-size: 0.9rem; font-weight: 700; color: #1a2c35; margin-bottom: 3px; }
        .store-device-card__meta { font-size: 0.72rem; color: #7a8f9b; margin-bottom: 2px; }
        .store-device-card__sync { font-size: 0.72rem; color: #7a8f9b; margin-bottom: 10px; }
        .store-device-card__raise-btn {
          background: none; border: none; cursor: pointer;
          color: #e85c23; font-size: 0.78rem; font-weight: 600;
          display: flex; align-items: center; gap: 5px;
        }
        .store-no-issues { padding: 20px; text-align: center; color: #aab4be; font-size: 0.85rem; }

        /* ── Quick Actions ── */
        .store-quick-actions { background: #fff; border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 12px; }
        .store-quick-actions__title { font-size: 0.9rem; font-weight: 700; color: #1a2c35; margin-bottom: 4px; }
        .store-quick-action-btn {
          width: 100%; padding: 14px 16px; border: none; border-radius: 9px;
          font-size: 0.82rem; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; justify-content: space-between;
          transition: all 0.15s ease; color: #fff; font-family: inherit;
        }
        .store-quick-action-btn--orange { background: #e85c23; }
        .store-quick-action-btn--orange:hover { background: #d44e18; }
        .store-quick-action-btn--teal { background: #17a9b0; }
        .store-quick-action-btn--teal:hover { background: #148f96; }

        /* ── Campaigns View ── */
        .store-campaigns-filters {
          background: #fff; border-radius: 12px; padding: 14px 18px;
          display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
        }
        .store-campaigns-filters__label { font-size: 0.82rem; color: #7a8f9b; font-weight: 500; }
        .store-campaigns-filter-select {
          position: relative; display: flex; align-items: center;
        }
        .store-campaigns-filter-select select {
          appearance: none; background: #fff; border: 1px solid #dde3ea;
          border-radius: 8px; padding: 7px 32px 7px 12px;
          font-size: 0.8rem; color: #4a5568; cursor: pointer;
          font-family: inherit; outline: none;
        }
        .store-campaigns-filter-select > svg {
          position: absolute; right: 10px; color: #9aa5b4; pointer-events: none;
        }
        .store-create-campaign-btn {
          margin-left: auto; background: #e85c23; color: #fff;
          border: none; border-radius: 8px; padding: 8px 18px;
          font-size: 0.82rem; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; gap: 7px; font-family: inherit;
          transition: background 0.15s;
        }
        .store-create-campaign-btn:hover { background: #d44e18; }

        .store-campaigns-table-wrap { background: #fff; border-radius: 14px; overflow: hidden; }
        .store-campaigns-table-header { background: #0e3540; padding: 14px 20px; }
        .store-campaigns-table-header__title { font-size: 0.95rem; font-weight: 700; color: #fff; }
        .store-campaigns-table { width: 100%; border-collapse: collapse; }
        .store-campaigns-table thead tr { border-bottom: 1px solid #eef2f6; }
        .store-campaigns-table th {
          padding: 12px 20px; text-align: left; font-size: 0.72rem;
          font-weight: 700; color: #8a9bad; letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .store-campaigns-table td { padding: 14px 20px; font-size: 0.83rem; color: #2d3748; border-bottom: 1px solid #f1f5f8; }
        .store-campaigns-table tbody tr:last-child td { border-bottom: none; }
        .store-campaigns-table tbody tr:hover td { background: #f9fbfc; }
        .store-campaigns-table__actions { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
        .store-table-action-btn {
          width: 28px; height: 28px; border-radius: 7px; border: none;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-size: 0.7rem; transition: all 0.15s;
        }
        .store-table-action-btn--edit { background: #e8f7f8; color: #17a9b0; }
        .store-table-action-btn--edit:hover { background: #cff0f2; }
        .store-table-action-btn--delete { background: #fff0ed; color: #e85c23; }
        .store-table-action-btn--delete:hover { background: #fcd9d0; }

        .store-campaigns-table-footer {
          padding: 12px 20px; display: flex; align-items: center; justify-content: space-between;
          border-top: 1px solid #f1f5f8;
        }
        .store-campaigns-table-footer > span { font-size: 0.78rem; color: #8a9bad; }
        .store-campaigns-pagination { display: flex; gap: 8px; }
        .store-pagination-btn {
          padding: 6px 14px; border-radius: 7px; border: 1px solid #dde3ea;
          background: #fff; color: #4a5568; font-size: 0.78rem; font-weight: 500;
          cursor: pointer; transition: all 0.15s; font-family: inherit;
        }
        .store-pagination-btn:hover:not(:disabled) { border-color: #17a9b0; color: #17a9b0; }
        .store-pagination-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* ── Media Management ── */
        .store-media-section { background: #fff; border-radius: 14px; overflow: hidden; }
        .store-media-section__header {
          display: flex; align-items: center; gap: 14px;
          background: #0e3540; padding: 16px 20px;
        }
        .store-media-section__icon-wrap {
          width: 38px; height: 38px; border-radius: 10px;
          background: rgba(255,255,255,0.12);
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 1rem;
        }
        .store-media-section__title { font-size: 1rem; font-weight: 700; color: #fff; }
        .store-media-section__subtitle { font-size: 0.75rem; color: rgba(255,255,255,0.7); margin-top: 2px; }

        .store-media-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; }
        @media (max-width: 700px) { .store-media-cards { grid-template-columns: 1fr; } }

        .store-media-option-card {
          padding: 24px 20px; border-right: 1px solid #f1f5f8; text-align: center;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
        }
        .store-media-option-card:last-child { border-right: none; }
        .store-media-option-card h3 { font-size: 0.88rem; font-weight: 700; color: #1a2c35; }
        .store-media-option-card p { font-size: 0.75rem; color: #7a8f9b; line-height: 1.45; margin-bottom: 4px; }

        .store-media-option-card__icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem; margin-bottom: 4px;
        }
        .store-media-option-card__icon--orange { background: #fff0ed; color: #e85c23; }
        .store-media-option-card__icon--teal { background: #e8f7f8; color: #17a9b0; }
        .store-media-option-card__icon--orange2 { background: #fff0ed; color: #e85c23; }

        .store-media-option-btn {
          padding: 8px 18px; border-radius: 7px; border: none; cursor: pointer;
          font-size: 0.78rem; font-weight: 600; font-family: inherit; transition: all 0.15s;
        }
        .store-media-option-btn--orange { background: #e85c23; color: #fff; }
        .store-media-option-btn--orange:hover { background: #d44e18; }

        /* ── Placeholder ── */
        .store-placeholder {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          min-height: 300px; gap: 10px;
          background: #fff; border-radius: 14px; padding: 40px;
        }
        .store-placeholder h2 { font-size: 1.3rem; font-weight: 700; color: #1a2c35; }
        .store-placeholder p { color: #8a9bad; font-size: 0.85rem; }
      `}</style>

      <div className="store-root">
        <Sidebar
          activeView={activeView}
          onNavigate={handleNavigate}
          mediaOpen={mediaOpen}
          setMediaOpen={setMediaOpen}
          supportOpen={supportOpen}
          setSupportOpen={setSupportOpen}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />
        <div className="store-layout-right">
          <Header userName={userName} onMobileMenuOpen={() => setMobileOpen(true)} />
          <main className="store-content">{renderContent()}</main>
        </div>
      </div>
    </>
  );
}
