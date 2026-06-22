"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FaTh,
  FaUser,
  FaHeadset,
  FaSignOutAlt,
  FaBell,
  FaChevronDown,
  FaChevronRight,
  FaPlus,
  FaSearch,
  FaWifi,
  FaArrowRight,
  FaTimes,
  FaBars,
  FaMusic,
  FaBullhorn,
} from "react-icons/fa";
import { MdCampaign, MdComputer } from "react-icons/md";
import { BsMusicNoteList } from "react-icons/bs";

import MediaManagementOverview from "./MediaManagementOverview";
import ViewAllCampaigns from "./ViewAllCampaigns";
import CreateMediaPlaylist from "./CreateMediaPlaylist";
import CreateInstantPlaylist from "./CreateInstantPlaylist";
import CreateAnnouncement from "./CreateAnnouncement";
import ProfileView from "./ProfileView";

// ─── Types ───────────────────────────────────────────────────────────────────
export type ViewKey =
  | "dashboard"
  | "mediaManagement"
  | "viewAllCampaigns"
  | "createMediaPlaylist"
  | "createAnnouncementPlaylist"
  | "instantPlaylist"
  | "createAnnouncement"
  | "createInstantAnnouncement"
  | "profile"
  | "support";

interface OfflineDevice {
  id: string;
  name: string;
  type: string;
  sn: string;
  lastSync: string;
  status: string; // 'online', 'offline', 'inactive'
}

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
    activeView === "createMediaPlaylist" ||
    activeView === "createAnnouncementPlaylist" ||
    activeView === "instantPlaylist" ||
    activeView === "createAnnouncement";

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
            <MdComputer size={20} />
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
          <button
            className={`store-nav-item ${isActive("dashboard") ? "store-nav-item--active" : ""}`}
            onClick={() => onNavigate("dashboard")}
          >
            <FaTh className="store-nav-item__icon" />
            <span>Dashboard</span>
          </button>

          <button
            className={`store-nav-item ${isMediaActive ? "store-nav-item--active" : ""}`}
            onClick={() => onNavigate("mediaManagement")}
          >
            <BsMusicNoteList className="store-nav-item__icon" />
            <span>Create New Store Campaign</span>
          </button>

          <button
            className={`store-nav-item ${isActive("viewAllCampaigns") ? "store-nav-item--active" : ""}`}
            onClick={() => onNavigate("viewAllCampaigns")}
          >
            <MdCampaign className="store-nav-item__icon" />
            <span>View all active campaigns</span>
          </button>

          <button
            className={`store-nav-item ${isActive("profile") ? "store-nav-item--active" : ""}`}
            onClick={() => onNavigate("profile")}
          >
            <FaUser className="store-nav-item__icon" />
            <span>Profile</span>
          </button>

          <button
            className={`store-nav-item ${isActive("support") ? "store-nav-item--active" : ""}`}
            onClick={() => { window.location.href = "mailto:contact@centelonrobotics.tech"; }}
          >
            <FaHeadset className="store-nav-item__icon" />
            <span>Support</span>
          </button>

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
          <div className="store-header__avatar">{initials || "U"}</div>
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
  devices: OfflineDevice[];
  onNavigate: (view: ViewKey) => void;
}

const StoreDashboard: React.FC<DashboardViewProps> = ({ userName, devices, onNavigate }) => {
  const [stats, setStats] = useState({ playlists: 0, announcements: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") ?? "" : "";
    if (!userId) { setLoadingStats(false); return; }

    Promise.all([
      fetch(`/api/playlists?userId=${userId}`).then(r => r.json()).catch(() => ([])),
      fetch(`/api/announcement/playlist?userId=${userId}`).then(r => r.json()).catch(() => ([]))
    ]).then(([playlistData, announcementData]) => {
      const regularPlaylists = Array.isArray(playlistData) ? playlistData : (playlistData.playlists || playlistData.data || []);
      const announcementPlaylists = Array.isArray(announcementData) ? announcementData : (announcementData.playlists || announcementData.data || []);
      
      const allPlaylists = [...regularPlaylists, ...announcementPlaylists];
      const mediaPlaylists = allPlaylists.filter((p: any) => p.type !== 'announcement' && p.type !== 'offer' && p.type !== 'alert');
      const annPlaylists = allPlaylists.filter((p: any) => p.type === 'announcement' || p.type === 'offer' || p.type === 'alert');
      
      setStats({
        playlists: mediaPlaylists.length,
        announcements: annPlaylists.length,
      });
    }).finally(() => setLoadingStats(false));
  }, []);

  return (
    <div className="store-dashboard-view">
      {/* Welcome Banner */}
      <div className="store-welcome-banner">
        <div className="store-welcome-banner__content">
          <h1 className="store-welcome-banner__title">Welcome back, {userName} !</h1>
          <p className="store-welcome-banner__subtitle">
            Here's what's happening with your accounts today.
          </p>
        </div>

        <div className="store-welcome-banner__stats">
          <div className="store-stat-card">
            <div className="store-stat-card__header">
              <span className="store-stat-card__label">Active media playlist</span>
              <FaMusic className="store-stat-card__icon" />
            </div>
            <p className="store-stat-card__value">
              {loadingStats ? "—" : stats.playlists}
            </p>
          </div>
          <div className="store-stat-card">
            <div className="store-stat-card__header">
              <span className="store-stat-card__label">Active announcement playlist</span>
              <FaBullhorn className="store-stat-card__icon" />
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                <path d="M12 9v4"></path>
                <path d="M12 17h.01"></path>
              </svg>
            </div>
            <h2 className="store-attention-section__title">Available Devices</h2>
          </div>

          {devices.length === 0 ? (
            <div className="store-no-issues">
              <p>No devices connected to this store.</p>
            </div>
          ) : (
            <div className="store-offline-devices">
              {devices.map((device) => {
                const statusStr = (device.status || "").toLowerCase();
                const isOnline = statusStr === 'online';
                return (
                  <div key={device.id} className="store-device-card" style={{ borderLeftColor: isOnline ? '#16A34A' : '#F05A28' }}>
                    <div className="store-device-card__content">
                      <div className="store-device-card__icon-wrap">
                        <MdComputer size={24} className="store-device-card__device-icon" style={{ color: isOnline ? '#16A34A' : '#F05A28' }} />
                      </div>
                      <div className="store-device-card__info">
                        <h3 className="store-device-card__name">{device.name}</h3>
                        <p className="store-device-card__meta">
                          Type : {device.type} | SN : {device.sn}
                        </p>
                        <p className="store-device-card__sync">Last sync : {device.lastSync}</p>
                        <button 
                          className="store-device-card__raise-btn" 
                          style={{ color: isOnline ? '#16A34A' : '#F05A28' }}
                          onClick={() => { window.location.href = "mailto:contact@centelonrobotics.tech"; }}
                        >
                          {isOnline ? 'View Details' : 'Raise issue'} <FaArrowRight size={10} />
                        </button>
                      </div>
                    </div>
                    <div className="store-device-card__badge" style={{ background: isOnline ? '#DCFCE7' : '#FFF2F2', color: isOnline ? '#166534' : '#DC2626' }}>
                      {isOnline ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
                          <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
                          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                          <line x1="12" y1="20" x2="12.01" y2="20"></line>
                        </svg>
                      ) : (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
                          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
                          <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
                          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
                          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                          <line x1="12" y1="20" x2="12.01" y2="20"></line>
                        </svg>
                      )}
                      <span>{device.status || 'inactive'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="store-quick-actions">
          <h3 className="store-quick-actions__title">Quick Actions</h3>
          <button
            className="store-quick-action-btn store-quick-action-btn--orange"
            onClick={() => onNavigate("mediaManagement")}
          >
            <span>Create new media playlist</span>
            <FaPlus size={12} />
          </button>
          <button
            className="store-quick-action-btn store-quick-action-btn--teal"
            onClick={() => onNavigate("mediaManagement")}
          >
            <span>Create new announcement playlist</span>
            <FaPlus size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StoreUserPage() {
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [mediaOpen, setMediaOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userName, setUserName] = useState("Loren Wilson");
  const [devices, setDevices] = useState<OfflineDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<any>(null);

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
    if (!token || !userId) {
      router.push("/login");
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
          setUserName(user.storeName || user.username || "Loren Wilson");
        }
      } catch (err) {
        console.error("Failed to fetch user", err);
      }
    };
    fetchUser();

    // Fetch real connected devices and filter for offline ones
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
  }, []);

  const handleNavigate = (view: ViewKey) => {
    // Clear editingPlaylist when going to any creation view directly
    // (the Edit flow sets editingPlaylist BEFORE calling handleNavigate, so it's safe)
    if (
      view === "createMediaPlaylist" ||
      view === "createAnnouncement" ||
      view === "createInstantAnnouncement" ||
      view === "createAnnouncementPlaylist" ||
      view === "instantPlaylist" ||
      view === "mediaManagement" ||
      view === "dashboard" ||
      view === "viewAllCampaigns"
    ) {
      setEditingPlaylist(null);
    }
    setActiveView(view);
    setMobileOpen(false);
    if (
      view === "mediaManagement" ||
      view === "createMediaPlaylist" ||
      view === "createAnnouncementPlaylist" ||
      view === "instantPlaylist" ||
      view === "createAnnouncement" ||
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
            devices={devices}
            onNavigate={handleNavigate}
          />
        );
      case "mediaManagement":
        return <MediaManagementOverview onNavigate={handleNavigate} />;
      case "viewAllCampaigns":
        return (
          <ViewAllCampaigns
            onNavigate={handleNavigate}
            onEdit={(p: any) => {
              const isAnn = !!p.announcements || ["announcement", "Instant Announcement", "offer", "alert", "info"].some(t => (p.type || "").toLowerCase().includes(t.toLowerCase()));
              if (isAnn) {
                handleNavigate("createAnnouncement");
              } else {
                handleNavigate("createMediaPlaylist");
              }
              // Set editingPlaylist AFTER handleNavigate clears it
              setTimeout(() => setEditingPlaylist(p), 0);
            }}
          />
        );
      case "createMediaPlaylist":
        return (
          <CreateMediaPlaylist
            onNavigate={handleNavigate}
            editingPlaylist={editingPlaylist}
          />
        );
      case "createAnnouncement":
        return (
          <CreateAnnouncement
            onNavigate={handleNavigate}
            isInstant={false}
            editingPlaylist={editingPlaylist}
          />
        );
      case "createInstantAnnouncement":
        return (
          <CreateAnnouncement
            onNavigate={handleNavigate}
            isInstant={true}
            editingPlaylist={editingPlaylist}
          />
        );
      case "createAnnouncementPlaylist":
        return (
          <CreateAnnouncement
            onNavigate={handleNavigate}
            isInstant={false}
            editingPlaylist={editingPlaylist}
          />
        );
      case "instantPlaylist":
        return (
          <CreateInstantPlaylist
            onNavigate={handleNavigate}
            editingPlaylist={editingPlaylist}
          />
        );
      case "profile":
        return <ProfileView onNavigate={handleNavigate} />;
      default:
        return (
          <div className="store-placeholder">
            <p>This page will be added after dashboard completion.</p>
          </div>
        );
    }
  };

  return (
    <>
      <style>{`
        /* ── Reset & Base ── */
        .store-root *, .store-root *::before, .store-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .store-root { display: flex; height: 100vh; overflow: hidden; font-family: 'Inter', 'Geist', sans-serif; background: #eaf6f8; }

        /* ── Sidebar ── */
        .store-sidebar {
          width: 250px; min-width: 250px; height: 100vh;
          background: #0B2830;
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
          display: flex; align-items: center; gap: 12px;
          padding: 24px 20px 20px;
          border-bottom: 1px dashed rgba(255,255,255,0.15);
          margin-bottom: 15px;
        }
        .store-logo-icon {
          width: 36px; height: 36px; border-radius: 8px;
          background: #11B5BB;
          display: flex; align-items: center; justify-content: center;
          color: white; flex-shrink: 0;
        }
        .store-logo-title { font-size: 1.05rem; font-weight: 700; color: #fff; line-height: 1.2; }
        .store-logo-subtitle { font-size: 0.75rem; color: #8CABB3; font-weight: 400; margin-top: 1px; }

        /* Nav */
        .store-sidebar__nav { flex: 1; padding: 0 14px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
        .store-nav-item {
          width: 100%; display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; border-radius: 8px;
          background: none; border: none; cursor: pointer;
          color: #8CABB3; font-size: 0.88rem; font-weight: 500;
          text-align: left; transition: all 0.15s ease;
        }
        .store-nav-item:hover { background: rgba(255,255,255,0.05); color: #d6eff4; }
        .store-nav-item--active { background: #F05A28 !important; color: #fff !important; font-weight: 600; }
        .store-nav-item--logout { margin-top: auto; margin-bottom: 10px; }
        .store-nav-item--logout:hover { background: rgba(240,90,40,0.1); color: #F05A28; }
        .store-nav-item__icon { font-size: 1.05rem; flex-shrink: 0; }

        /* Version */
        .store-sidebar__version {
          margin: 14px; padding: 14px 16px;
          background: rgba(255,255,255,0.03); border-radius: 12px;
        }
        .store-version-label { font-size: 0.72rem; color: #8CABB3; font-weight: 500; }
        .store-version-number { font-size: 1.05rem; color: #fff; font-weight: 700; margin: 3px 0 2px; }
        .store-version-date { font-size: 0.68rem; color: #64848D; }

        /* ── Layout Right ── */
        .store-layout-right { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

        /* ── Header ── */
        .store-header {
          display: flex; align-items: center; gap: 16px;
          padding: 14px 28px; background: #fff;
          border-bottom: 1px dashed #D6E6E9;
          height: 70px; flex-shrink: 0;
        }
        .store-header__menu-btn { display: none; background: none; border: none; cursor: pointer; font-size: 1.2rem; color: #555; }
        @media (max-width: 768px) { .store-header__menu-btn { display: flex; align-items: center; } }

        .store-header__search { 
          flex: 1; max-width: 500px; display: flex; align-items: center; gap: 10px; 
          background: #F8FAFB; border: 1px solid #EAEFEF; border-radius: 8px; 
          padding: 10px 16px; 
        }
        .store-header__search-icon { color: #A4B6B9; font-size: 0.95rem; flex-shrink: 0; }
        .store-header__search-input { background: none; border: none; outline: none; font-size: 0.88rem; color: #333; font-family: inherit; width: 100%; }
        .store-header__search-input::placeholder { color: #A4B6B9; }

        .store-header__actions { margin-left: auto; display: flex; align-items: center; gap: 20px; }
        .store-header__bell { position: relative; background: none; border: none; cursor: pointer; color: #445459; font-size: 1.2rem; display: flex; align-items: center; }
        .store-header__bell-badge { position: absolute; top: -1px; right: -1px; width: 8px; height: 8px; background: #E94622; border-radius: 50%; border: 1.5px solid #fff; }

        .store-header__user { display: flex; align-items: center; gap: 12px; cursor: pointer; }
        .store-header__avatar { width: 38px; height: 38px; border-radius: 50%; background: #11B5BB; color: #fff; font-size: 0.9rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .store-header__user-info { display: flex; flex-direction: column; }
        .store-header__user-name { font-size: 0.88rem; font-weight: 700; color: #162B30; line-height: 1.2; }
        .store-header__user-role { font-size: 0.72rem; color: #64848D; }
        .store-header__user-chevron { color: #A4B6B9; }

        /* ── Content Area ── */
        .store-content { flex: 1; overflow-y: auto; padding: 24px 28px; }
        
        .store-dashboard-view { display: flex; flex-direction: column; gap: 24px; }

        /* ── Welcome Banner ── */
        .store-welcome-banner {
          background: linear-gradient(135deg, #0B3D44 0%, #155E68 100%);
          border-radius: 24px; padding: 48px;
          color: #fff;
          display: flex;
          flex-direction: column;
          gap: 40px;
          box-shadow: 0 12px 30px rgba(0,0,0,0.15);
        }
        .store-welcome-banner__title { font-size: 2.2rem; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.01em; }
        .store-welcome-banner__subtitle { font-size: 1rem; color: #A4C5CB; font-weight: 400; opacity: 0.9; }
        .store-welcome-banner__stats { display: flex; gap: 24px; }
        @media (max-width: 900px) { .store-welcome-banner__stats { flex-direction: column; } }

        .store-stat-card { 
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); 
          backdrop-filter: blur(10px);
          border-radius: 16px; padding: 24px 30px; flex: 1;
          transition: transform 0.2s ease;
        }
        .store-stat-card:hover { transform: translateY(-2px); background: rgba(255,255,255,0.09); }
        .store-stat-card__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .store-stat-card__label { font-size: 0.95rem; color: #fff; font-weight: 600; opacity: 0.85; }
        .store-stat-card__icon { color: #fff; font-size: 1.2rem; opacity: 0.7; }
        .store-stat-card__value { font-size: 3.5rem; font-weight: 800; color: #fff; line-height: 1; letter-spacing: -0.02em; }

        /* ── Bottom Row ── */
        .store-bottom-row { display: grid; grid-template-columns: 1fr 340px; gap: 24px; }
        @media (max-width: 1000px) { .store-bottom-row { grid-template-columns: 1fr; } }

        /* ── Attention Section ── */
        .store-attention-section { }
        .store-attention-section__header { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
        .store-attention-icon {
          width: 38px; height: 38px; border-radius: 8px;
          background: #0D4954; color: #fff; 
          display: flex; align-items: center; justify-content: center;
        }
        .store-attention-section__title { font-size: 1.25rem; font-weight: 700; color: #162B30; }

        .store-offline-devices { display: flex; flex-direction: column; gap: 16px; }
        
        .store-device-card {
          position: relative; background: #fff; border-radius: 12px; 
          padding: 24px; border-left: 4px solid #F05A28;
          box-shadow: 0 4px 14px rgba(0,0,0,0.03);
        }
        .store-device-card__content { display: flex; flex-direction: row; align-items: flex-start; text-align: left; gap: 20px; }
        
        .store-device-card__icon-wrap {
          width: 56px; height: 56px; border-radius: 12px;
          background: #F1F6F8; display: flex; align-items: center; justify-content: center;
          color: #F05A28; 
        }
        .store-device-card__info { display: flex; flex-direction: column; align-items: flex-start; }
        .store-device-card__name { font-size: 1.05rem; font-weight: 700; color: #162B30; margin-bottom: 6px; }
        .store-device-card__meta { font-size: 0.8rem; color: #64848D; margin-bottom: 6px; font-weight: 500; }
        .store-device-card__sync { font-size: 0.75rem; color: #A4B6B9; margin-bottom: 16px; font-weight: 500; }
        .store-device-card__raise-btn {
          background: none; border: none; cursor: pointer;
          color: #F05A28; font-size: 0.85rem; font-weight: 700;
          display: flex; align-items: center; gap: 6px;
        }
        
        .store-device-card__badge {
          position: absolute; top: 16px; right: 16px;
          display: flex; align-items: center; gap: 5px;
          background: #FFF2F2; color: #DC2626; padding: 4px 10px; border-radius: 20px;
          font-size: 0.7rem; font-weight: 700; text-transform: lowercase; letter-spacing: 0.02em;
        }

        .store-no-issues { padding: 30px; text-align: center; background: #fff; border-radius: 12px; color: #64848D; font-size: 0.9rem; font-weight: 500; }

        /* ── Quick Actions ── */
        .store-quick-actions { background: #fff; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 16px; height: fit-content; box-shadow: 0 4px 14px rgba(0,0,0,0.02); }
        .store-quick-actions__title { font-size: 1.05rem; font-weight: 700; color: #162B30; margin-bottom: 4px; }
        .store-quick-action-btn {
          width: 100%; padding: 16px 20px; border: none; border-radius: 10px;
          font-size: 0.9rem; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; justify-content: space-between;
          transition: all 0.15s ease; color: #fff; font-family: inherit;
        }
        .store-quick-action-btn--orange { background: #F05A28; }
        .store-quick-action-btn--orange:hover { background: #DC4B1D; }
        .store-quick-action-btn--teal { background: #11B5BB; }
        .store-quick-action-btn--teal:hover { background: #0E9C9F; }

        .store-placeholder { padding: 40px; text-align: center; color: #64848D; font-size: 0.95rem; background: #fff; border-radius: 16px; }
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
