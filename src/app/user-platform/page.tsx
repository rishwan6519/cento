"use client";
import React, { useState, useEffect, Fragment } from "react";
import { Transition } from "@headlessui/react";
import toast from "react-hot-toast";

import Button from "@/components/Platform/Button";
import Card from "@/components/Platform/Card";
import DashboardView from "@/components/Platform/views/DashboardView";
import PlaylistSetup from "@/components/PlaylistSetup/PlaylistSetup";
import CreateMedia from "@/components/CreateMedia/createMedia";
import ShowMedia from "@/components/ShowMedia/showMedia";
import ConnectPlaylist from "@/components/ConnectPlaylist/connectPlaylist";
import LoadingState from "@/components/Platform/LoadingState";
import PlaylistManager from "@/components/ShowPlaylist/showPlaylist";
import Announcement from "@/components/Announcement/Announcement";
import CreateAnnouncement from "@/components/CreateAnnouncement/CreateAnnouncement";
import ShowAnnouncement from "@/components/Announcement/ShowAnnouncement";
import InstantaneousAnnouncement from "@/components/InstantaneousAnnouncement/InstantaneousAnnouncement";
import AnnouncementList from "@/components/Announcement/AnnouncementList";
import ConnectAnnouncement from "@/components/Announcement/ConnectAnnouncement";
import TTSCreator from "@/components/Announcement/AnnouncementTts";

import {
  FaRobot,
  FaRegFileAudio,
  FaListAlt,
  FaPlug,
  FaChevronDown,
  FaBullhorn,
  FaMusic,
  FaPlay,
  FaLink,
  FaVolumeUp,
  FaCog,
  FaTimes,
  FaBars,
  FaSignOutAlt,
} from "react-icons/fa";
import { FaDisplay } from "react-icons/fa6";
import { RiDashboardLine } from "react-icons/ri";
import { MdOutlinePlaylistPlay, MdAnnouncement } from "react-icons/md";
import { Device, MenuKey } from "@/components/Platform/types";

// Define interfaces
interface UserData {
  _id: string;
  username: string;
  role: string;
}

type ExtendedMenuKey = MenuKey | "createAnnouncement" | "setupAnnouncement" | "showAnnouncement" | "connectAnnouncement" | "InstantaneousAnnouncement" | "showAnnouncementList"|"TextToSpeech";

interface MenuSection {
  key: string;
  label: string;
  icon: React.ReactNode;
  items?: {
    key: ExtendedMenuKey;
    label: string;
    icon: React.ReactNode;
  }[];
}

export default function UserPlatform(): React.ReactElement {
  const [selectedMenu, setSelectedMenu] = useState<ExtendedMenuKey>("dashboard");
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["playlist", "announcement"]));

  useEffect(() => {
    const userRole = localStorage.getItem("userRole");
    if (userRole !== "user") {
      toast.error("You are not authorized to access this page.");
      window.location.href = "/login";
      return;
    }

    const fetchUserData = async () => {
      try {
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        const response = await fetch(`/api/user/users?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    };

    const fetchAssignedDevices = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const userId = localStorage.getItem("userId");
        if (!userId) {
          setError("Please log in to view devices");
          return;
        }

        const response = await fetch(`/api/assign-device?userId=${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch assigned devices');
        }

        const data = await response.json();
        if (data?.success && Array.isArray(data.data)) {
          const mappedDevices = data.data.map((assignment: any) => ({
            _id: assignment._id || 'unknown-id',
            deviceId: {
              _id: assignment.deviceId?._id || 'unknown-device-id',
              name: assignment.deviceId?.name || 'Unknown Device',
              serialNumber: assignment.deviceId?.serialNumber || 'N/A',
              status: assignment.deviceId?.status || 'inactive',
              imageUrl: assignment.deviceId?.imageUrl || '/default-device-image.png'
            },
            typeId: {
              _id: assignment.deviceId?.typeId?._id || 'unknown-type',
              name: assignment.deviceId?.typeId?.name || 'Standard Device'
            },
            userId: { _id: userId },
            connectedPlaylists: [],
            createdAt: assignment.assignedAt || new Date().toISOString(),
            updatedAt: assignment.updatedAt || new Date().toISOString(),
            __v: 0,
            status: assignment.deviceId?.status === "active" ? "Connected" : "Disconnected",
            lastActive: assignment.updatedAt ? new Date(assignment.updatedAt).toLocaleString() : 'N/A'
          })).filter(Boolean);
          setDevices(mappedDevices);
        } else {
          setDevices([]);
        }
      } catch (err) {
        console.error("Error fetching devices:", err);
        setError(err instanceof Error ? err.message : "Failed to load devices");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
    fetchAssignedDevices();
  }, []);

  const handleEditDevice = async (device: Device): Promise<void> => {
    try {
      const newStatus = device.status === "Connected" ? "Disconnected" : "Connected";
      const apiStatus = newStatus === "Connected" ? "active" : "inactive";

      const response = await fetch(`/api/assigned-devices/${device._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: apiStatus }),
      });

      if (!response.ok) throw new Error("Failed to update device");

      const data = await response.json();
      if (data.success) {
        setDevices(
          devices.map((d) =>
            d._id === device._id ? { ...d, status: newStatus, lastActive: new Date().toLocaleString() } : d
          )
        );
        toast.success(`Device status updated to ${newStatus}`);
      }
    } catch (err) {
      console.error("Error updating device:", err);
      toast.error(err instanceof Error ? err.message : "Failed to update device status.");
    }
  };

  const menuSections: MenuSection[] = [
    { key: "dashboard", label: "Dashboard", icon: <RiDashboardLine size={20} /> },
    {
      key: "playlist",
      label: "Playlist Management",
      icon: <FaMusic size={20} />,
      items: [
        { key: "createMedia", label: "Create Media", icon: <FaRegFileAudio /> },
        { key: "showMedia", label: "Show Media", icon: <FaPlay /> },
        { key: "setupPlaylist", label: "Setup Playlist", icon: <FaListAlt /> },
        { key: "showPlaylist", label: "Show Playlist", icon: <MdOutlinePlaylistPlay /> },
        { key: "connectPlaylist", label: "Connect & Disconnect Playlist", icon: <FaPlug /> }
      ]
    },
    {
      key: "announcement",
      label: "Announcements",
      icon: <FaBullhorn size={20} />,
      items: [
        { key: "createAnnouncement", label: "Create Announcement", icon: <MdAnnouncement /> },
        { key: "setupAnnouncement", label: "Setup Announcement", icon: <FaCog /> },
        {key : "TextToSpeech", label: "Text to Speech", icon: <FaVolumeUp />},
        { key: "showAnnouncement", label: "Show Announcement", icon: <FaDisplay /> },
        { key: "showAnnouncementList", label: "Announcement List", icon: <FaListAlt /> },
        { key: "connectAnnouncement", label: "Connect & Disconnect Announcement", icon: <FaLink /> },
        { key: "InstantaneousAnnouncement", label: "Instant Announcement", icon: <FaVolumeUp /> }
      ]
    }
  ];

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(sectionKey)) {
        newExpanded.delete(sectionKey);
      } else {
        newExpanded.add(sectionKey);
      }
      return newExpanded;
    });
  };

  const handleMenuClick = (key: ExtendedMenuKey) => {
    setSelectedMenu(key);
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const renderContent = (): React.ReactElement => {
    if (isLoading) return <LoadingState />;
    if (error) return (
      <Card className="flex flex-col items-center justify-center py-16 text-center bg-red-50">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <FaTimes className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h3>
        <p className="text-gray-600 max-w-md mb-6">{error}</p>
        <Button variant="primary" onClick={() => window.location.reload()}>Try Again</Button>
      </Card>
    );

    switch (selectedMenu) {
      case "dashboard": return <DashboardView devices={devices} setDevices={setDevices} onAddNew={() => { }} onEditDevice={handleEditDevice} onManagePlaylists={() => { }} userRole="user" />;
      case "createMedia": return <CreateMedia onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("showMedia")} />;
      case "showMedia": return <ShowMedia onCancel={() => setSelectedMenu("dashboard")} />;
      case "setupPlaylist": return <PlaylistSetup />;
      case "showPlaylist": return <PlaylistManager />;
      case "connectPlaylist": return <ConnectPlaylist onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("showPlaylist")} />;
      case "createAnnouncement": return <CreateAnnouncement onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("showAnnouncement")} />;
      case "setupAnnouncement": return <Announcement />;
      case "InstantaneousAnnouncement": return <InstantaneousAnnouncement onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("showAnnouncement")} />;
      case "showAnnouncement": return <ShowAnnouncement onCancel={() => setSelectedMenu("dashboard")} />;
      case "connectAnnouncement": return <ConnectAnnouncement onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("dashboard")} />;
      case "showAnnouncementList": return <AnnouncementList />;
      case "TextToSpeech": return < TTSCreator/>;
      default: return <div className="text-center py-20"><p className="text-gray-500">Select a menu item to view its content.</p></div>;
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <FaRobot className="text-blue-600" />
          <span>User Dashboard</span>
        </h2>
      </div>
      <nav className="flex-1 mt-4 px-3 pb-4 space-y-4 overflow-y-auto">
        {menuSections.map((section) => (
          <div key={section.key}>
            {section.items ? (
              <>
                <div
                  className="flex items-center justify-between px-3 py-2 cursor-pointer rounded-lg text-gray-600 hover:bg-gray-100"
                  onClick={() => toggleSection(section.key)}
                >
                  <div className="flex items-center gap-3">
                    {section.icon}
                    <span className="font-semibold text-sm uppercase tracking-wider">{section.label}</span>
                  </div>
                  <FaChevronDown className={`transition-transform duration-200 ${expandedSections.has(section.key) ? 'rotate-180' : ''}`} />
                </div>
                <Transition
                  show={expandedSections.has(section.key)}
                  enter="transition-all ease-in-out duration-300"
                  enterFrom="opacity-0 max-h-0"
                  enterTo="opacity-100 max-h-screen"
                  leave="transition-all ease-in-out duration-200"
                  leaveFrom="opacity-100 max-h-screen"
                  leaveTo="opacity-0 max-h-0"
                >
                  <div className="mt-2 space-y-1 pl-6 border-l-2 border-gray-200 ml-3">
                    {section.items.map((item) => (
                      <div
                        key={item.key}
                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md text-sm font-medium ${selectedMenu === item.key ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        onClick={() => handleMenuClick(item.key)}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </Transition>
              </>
            ) : (
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg text-sm font-semibold ${selectedMenu === section.key ? 'bg-blue-600 text-white shadow-md' : 'text-gray-800 hover:bg-gray-100'}`}
                onClick={() => handleMenuClick(section.key as ExtendedMenuKey)}
              >
                {section.icon}
                <span>{section.label}</span>
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="p-4 mt-auto border-t border-gray-200">
        {userData && (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold">
              {userData.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-800">{userData.username}</p>
              <p className="text-xs text-gray-500">{userData.role}</p>
            </div>
          </div>
        )}
        <Button
          variant="danger"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2"
        >
          <FaSignOutAlt />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800">
      {/* Static Sidebar for Desktop */}
      <aside className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-72 bg-white shadow-lg">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <Transition show={isMobileMenuOpen} as={Fragment}>
        <div className="lg:hidden" role="dialog" aria-modal="true">
          {/* Overlay */}
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)} />
          </Transition.Child>

          {/* Sidebar */}
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <aside className="fixed inset-y-0 left-0 w-72 bg-white z-40">
              <SidebarContent />
            </aside>
          </Transition.Child>
        </div>
      </Transition>

      <div className="flex flex-col flex-1 w-full">
        {/* Header for Mobile */}
        <header className="lg:hidden sticky top-0 bg-white shadow-md z-30">
          <div className="px-4 py-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FaRobot className="text-blue-600" /> Dashboard
            </h2>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
            >
              {isMobileMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}