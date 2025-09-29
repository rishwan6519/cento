"use client";
import React, { useState, useEffect, Fragment } from "react";
import { Transition } from "@headlessui/react";
import toast from "react-hot-toast";
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
  FaSearch,
  FaUserCircle,
  FaBroadcastTower,
  FaSyncAlt,
  FaRedoAlt,
  FaExchangeAlt,
  FaInfoCircle,
  FaPauseCircle,
  FaChromecast, 
  FaThLarge,
  FaMap,
  FaBell,
  FaDownload,
  FaChartLine,
  FaHistory,
  FaFileAlt,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaDesktop
} from "react-icons/fa";
import { FaDisplay } from "react-icons/fa6";
import { RiArrowDropDownLine, RiDashboardLine } from "react-icons/ri";
import { MdOutlinePlaylistPlay, MdAnnouncement } from "react-icons/md";
import { Device, MenuKey } from "@/components/Platform/types";
import Image from "next/image";
import { Search, Bell, User } from "lucide-react";
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
import Scheduler from "@/components/Scheduler/Scheduler";
// import RobotIcon from "@/components/icons/centelon-logo.svg";

// Define interfaces
interface UserData {
  _id: string;
  username: string;
  role: string;
}

// type ExtendedMenuKey =
//   | MenuKey
//   | "createAnnouncement"
//   | "setupAnnouncement"
//   | "showAnnouncement"
//   | "connectAnnouncement"
//   | "InstantaneousAnnouncement"
//   | "showAnnouncementList"
//   | "TextToSpeech";
type ExtendedMenuKey =
  | MenuKey
  // Announcement
  | "createAnnouncement"
  | "setupAnnouncement"
  | "showAnnouncement"
  | "connectAnnouncement"
  | "InstantaneousAnnouncement"
  | "showAnnouncementList"
  | "TextToSpeech"
  | "scheduleAnnouncement"
  | "announcementPlaylist"
  | "announcementLibrary"
  | "connectDeviceZone"
  | "instantTrigger"
  | "announcementTemplate"

  // Media
  | "mediaManagement"
  | "mediaLibrary"
  | "createPlaylist"
  | "showPlaylist"
  | "connectPlaylist"
  | "playlistTemplates"

  // Device
  | "storeDeviceList"
  | "addPairDevice"
  | "deviceStatus"
  | "zoneMapping"

  // Scheduler
  | "calendarView"
  | "conflictAlerts"
  | "autoSchedule"

  // Reports
  | "playbackHistory"
  | "announcementLog"
  | "engagementTrends"
  | "exportReports"

  // Settings
  | "zoneSetup"
  | "notificationPreferences";

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

// Dummy data for recently played (replace with real data as needed)
const recentPlayed = [
  {
    id: 1,
    playlistName: "Playlist name",
    creator: "Sean swadder",
    duration: "2:34:45",
    image: "/assets/service_robot.jpg",
  },
  {
    id: 2,
    playlistName: "Playlist name",
    creator: "Dj YK mule",
    duration: "1:02:42",
    image: "/assets/service_robot.jpg",
  },
  {
    id: 3,
    playlistName: "Playlist name",
    creator: "Obi Datti",
    duration: "2:01:25",
    image: "/assets/service_robot.jpg",
  },
];
const slides = [
  { id: 1, src: "/assets/slider1home.jpg", alt: "Robot 1" },
  { id: 2, src: "/assets/engagement_robot.jpg", alt: "Robot 2" },
  { id: 3, src: "/assets/service_robot.jpg", alt: "Robot 3" },
];
export default function UserPlatform(): React.ReactElement {
  const [selectedMenu, setSelectedMenu] = useState<ExtendedMenuKey>("dashboard");
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["playlist", "announcement"])
  );
const [current, setCurrent] = useState(0);

  // Autoplay every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);
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
          throw new Error("Failed to fetch assigned devices");
        }

        const data = await response.json();
        if (data?.success && Array.isArray(data.data)) {
          const mappedDevices = data.data
            .map((assignment: any) => ({
              _id: assignment._id || "unknown-id",
              deviceId: {
                _id: assignment.deviceId?._id || "unknown-device-id",
                name: assignment.deviceId?.name || "Unknown Device",
                serialNumber: assignment.deviceId?.serialNumber || "N/A",
                status: assignment.deviceId?.status || "inactive",
                imageUrl:
                  assignment.deviceId?.imageUrl || "/default-device-image.png",
              },
              typeId: {
                _id: assignment.deviceId?.typeId?._id || "unknown-type",
                name: assignment.deviceId?.typeId?.name || "Standard Device",
              },
              userId: { _id: userId },
              connectedPlaylists: [],
              createdAt: assignment.assignedAt || new Date().toISOString(),
              updatedAt: assignment.updatedAt || new Date().toISOString(),
              __v: 0,
              status:
                assignment.deviceId?.status === "active"
                  ? "Connected"
                  : "Disconnected",
              lastActive: assignment.updatedAt
                ? new Date(assignment.updatedAt).toLocaleString()
                : "N/A",
            }))
            .filter(Boolean);
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
            d._id === device._id
              ? { ...d, status: newStatus, lastActive: new Date().toLocaleString() }
              : d
          )
        );
        toast.success(`Device status updated to ${newStatus}`);
      }
    } catch (err) {
      console.error("Error updating device:", err);
      toast.error(err instanceof Error ? err.message : "Failed to update device status.");
    }
  };

//   const menuSections: MenuSection[] = [
//     // { key: "dashboard", label: "Dashboard", icon: <RiDashboardLine size={20} /> },
// { key: "dashboard", label: "Dashboard", icon: <FaThLarge  size={15} /> },

//     {
//       key: "playlist",
//       label: "Media Management",
//       icon: <FaMusic size={20} />,
//       items: [
//         { key: "createMedia", label: "Create Media", icon: <FaRegFileAudio /> },
//         { key: "showMedia", label: "Show Media", icon: <FaPlay /> },
//         { key: "setupPlaylist", label: "Setup Playlist", icon: <FaListAlt /> },
//         { key: "showPlaylist", label: "Show Playlist", icon: <MdOutlinePlaylistPlay /> },
//         { key: "connectPlaylist", label: "Connect & Disconnect Playlist", icon: <FaPlug /> },
//       ],
//     },
//     {
//       key: "announcement",
//       label: "Announcement Hub",
//       icon: <FaBullhorn size={20} />,
//       items: [
//         { key: "createAnnouncement", label: "Create Announcement", icon: <MdAnnouncement /> },
//         { key: "setupAnnouncement", label: "Setup Announcement", icon: <FaCog /> },
//         { key: "TextToSpeech", label: "Text to Speech", icon: <FaVolumeUp /> },
//         { key: "showAnnouncement", label: "Show Announcement", icon: <FaDisplay /> },
//         { key: "showAnnouncementList", label: "Announcement List", icon: <FaListAlt /> },
//         { key: "connectAnnouncement", label: "Connect & Disconnect Announcement", icon: <FaLink /> },
//         { key: "InstantaneousAnnouncement", label: "Instant Announcement", icon: <FaVolumeUp /> },
//       ],
//     },
//   ];
const menuSections: MenuSection[] = [
  { key: "dashboard", label: "Dashboard", icon: <FaThLarge size={15} /> },
  {
    key: "media",
    label: "Media Management",
    icon: <FaMusic size={20} />,
    items: [
      // { key: "mediaManagement", label: "Media management", icon: <FaMusic /> },
      { key: "createPlaylist", label: "Create playlist", icon: <FaListAlt /> },
      { key: "mediaLibrary", label: "Media library", icon: <FaRegFileAudio /> },

        { key: "setupPlaylist", label: "Setup Playlist", icon: <FaListAlt /> },

      { key: "showPlaylist", label: "Show playlist", icon: <MdOutlinePlaylistPlay /> },
      { key: "connectPlaylist", label: "Connect playlist to store", icon: <FaPlug /> },
      { key: "playlistTemplates", label: "Playlist templates", icon: <FaListAlt /> },
    ],
  },
  {
    key: "announcement",
    label: "Announcement Hub",
    icon: <FaBullhorn size={20} />,
    items: [
      { key: "createAnnouncement", label: "Create new announcement", icon: <MdAnnouncement /> },
      { key: "scheduleAnnouncement", label: "Schedule announcement", icon: <FaCog /> },
      { key: "announcementPlaylist", label: "Announcement playlist", icon: <FaListAlt /> },
      { key: "announcementLibrary", label: "Announcement library", icon: <FaRegFileAudio /> },
      { key: "connectAnnouncement", label: "Connect announcement", icon: <FaLink /> },
      { key: "connectDeviceZone", label: "Connect to device to zone", icon: <FaLink /> },
      { key: "instantTrigger", label: "Instant announcement trigger", icon: <FaVolumeUp /> },
      { key: "announcementTemplate", label: "Announcement template", icon: <FaDisplay /> },
    ],
  },
  {
    key: "device",
    label: "Device Management",
    icon: <FaDesktop size={20} />,
    items: [
      { key: "storeDeviceList", label: "Store device list", icon: <FaDesktop /> },
      { key: "addPairDevice", label: "Add/Pair device", icon: <FaPlug /> },
      { key: "deviceStatus", label: "Device status", icon: <FaDisplay /> },
      { key: "zoneMapping", label: "Zone mapping per store", icon: <FaMap /> },
    ],
  },
  {
    key: "scheduler",
    label: "Scheduler",
    icon: <FaCalendarAlt size={20} />,
    items: [
      { key: "calendarView", label: "Calendar view", icon: <FaCalendarAlt /> },
      { key: "conflictAlerts", label: "Conflict alerts", icon: <FaExclamationTriangle /> },
      { key: "autoSchedule", label: "Auto scheduling assistant", icon: <FaRobot /> },
    ],
  },
  {
    key: "reports",
    label: "Reports and Logs",
    icon: <FaFileAlt size={20} />,
    items: [
      { key: "playbackHistory", label: "Playback history", icon: <FaHistory /> },
      { key: "announcementLog", label: "Announcement delivery log", icon: <FaBullhorn /> },
      { key: "engagementTrends", label: "Engagement/usage trends", icon: <FaChartLine /> },
      { key: "exportReports", label: "Export reports", icon: <FaDownload /> },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: <FaCog size={20} />,
    items: [
      { key: "zoneSetup", label: "Zone setup", icon: <FaMap /> },
      { key: "notificationPreferences", label: "Notification preferences", icon: <FaBell /> },
    ],
  },
];

const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

const handleMenuToggle = (key: string) => {
  setExpandedMenu((prev) => (prev === key ? null : key));
};
  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => {
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

  // Device Card Component (matches style from your image)
  const DeviceCard = ({ device }: { device: Device }) => {
    // Dummy placeholders for last sync and playlist playing info
    const isConnected = device.status === "Connected" ||  "Online";
    const lastSync = "5 min ago";
    // Use device connectedPlaylists or mock if empty
    const playingPlaylist = device.connectedPlaylists?.length
      ? device.connectedPlaylists[0].name
      : isConnected
      ? "Soft Playlist"
      : null;
    const remainingTime = isConnected ? "30 min left" : null;

    return (
      <div
        className={`relative flex flex-col rounded-xl shadow-lg overflow-hidden w-72 cursor-pointer select-none transition-transform transform hover:scale-[1.02] ${
          isConnected ? "bg-gradient-to-tr from-blue-200 to-blue-100" : "bg-gray-100"
        }`}
      >
        {/* Device Image */}
        <div className="relative h-44 w-full overflow-hidden rounded-t-xl">
          <img
            src={device.deviceId.imageUrl ?? "/default-device-image.png"}
            alt={device.deviceId.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
          {/* Status Icon */}
          <div className="absolute top-3 right-3">
            {isConnected ? (
              <div className="bg-orange-500 rounded-full p-2 shadow-lg" title="Playing">
                <FaPlay className="text-white w-4 h-4" />
              </div>
            ) : (
              <div className="bg-gray-500 rounded-full p-2 shadow-lg" title="Info">
                <FaInfoCircle className="text-white w-4 h-4" />
              </div>
            )}
          </div>
        </div>
        {/* Info Section */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-lg text-gray-900">{device.deviceId.name || "Device Name"}</h3>
            <p className="text-xs text-gray-600 mt-1">
              Type : Audio player
              <span className="mx-1">|</span>
              Zone : Entrance
            </p>
            {/* Status Details */}
            <div className="mt-2 space-y-1 text-sm">
              <p className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full inline-block ${
                    isConnected ? "bg-green-500" : "bg-red-500"
                  }`}
                />{" "}
                {isConnected ? "Connected" : "Online"}
              </p>
              <p className="flex items-center gap-2">
                <FaSyncAlt className="inline" />
                Last sync - {lastSync}
              </p>
              <p className="flex items-center gap-2 truncate">
                {isConnected && playingPlaylist ? (
                  <>
                    <FaPlay className="inline text-orange-600" />
                    Playing {playingPlaylist} | {remainingTime}
                  </>
                ) : (
                  <>
                    <FaPauseCircle className="inline text-red-600" />
                    Playlist is not connected
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Footer with actions */}
        <div className="bg-slate-900 text-white flex justify-between rounded-b-xl px-4 py-2">
          {isConnected ? (
            <>
              <button
                onClick={() => handleEditDevice(device)}
                className="text-sm hover:underline focus:outline-none"
                title="Disconnect"
              >
                Disconnect
              </button>
              <button
                onClick={() => alert("Restart device functionality")}
                className="text-sm hover:underline focus:outline-none"
                title="Restart"
              >
                Restart
              </button>
              <button
                onClick={() => alert("Reassign device functionality")}
                className="text-sm hover:underline focus:outline-none"
                title="Reassign"
              >
                Reassign
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleEditDevice(device)}
                className="text-sm hover:underline focus:outline-none"
                title="Connect"
              >
                Connect
              </button>
              <button
                onClick={() => alert("Restart device functionality")}
                className="text-sm hover:underline focus:outline-none"
                title="Restart"
              >
                Restart
              </button>
              <button
                onClick={() => alert("Reassign device functionality")}
                className="text-sm hover:underline focus:outline-none"
                title="Reassign"
              >
                Reassign
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  // Dashboard content matching image layout
  const DashboardContent = () => (
    <div className="flex flex-col space-y-8">
      {/* Welcome Header */}
      {/* <header className="px-4 pt-4 pb-2 border-b border-gray-200">
        <h1 className="text-2xl font-semibold text-gray-900 font-sans mb-1">
          Welcome Back, {userData?.username || "John"}!
        </h1>
        <p className="text-gray-700 font-sans text-sm max-w-xl">
          Here’s what’s happening with your store today.
        </p>
      </header> */}
        <header className="px-6 pt-4 pb-3 border-b border-gray-200 bg-[#E6F9FD] flex items-center justify-between">
      {/* Left Content */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 font-sans mb-1">
          Welcome Back, {userData?.username || "John"}!
        </h1>
        <p className="text-gray-700 font-sans text-sm max-w-xl">
          Here’s what’s happening with your store today.
        </p>
      </div>

      {/* Right Content */}
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="flex items-center bg-white rounded-xl shadow px-3 py-1.5">
          <Search className="text-gray-400 w-4 h-4 mr-2" />
          <input
            type="text"
            placeholder="Search"
            className="outline-none text-sm w-32 md:w-48 bg-transparent"
          />
        </div>

        {/* Notification Icon */}
        <button className="bg-white shadow rounded-xl p-2 hover:bg-gray-50 transition">
          <Bell className="text-orange-500 w-5 h-5" />
        </button>

        {/* Profile Icon */}
        <button className="bg-white shadow rounded-xl p-2 hover:bg-gray-50 transition">
          <User className="text-orange-500 w-5 h-5" />
        </button>
      </div>
    </header>

      {/* Top Content - Wide */}
      {/* <div className="flex flex-wrap gap-8"> */}
        {/* Left Large Image + text */}
        {/* <div className="flex-1 min-w-[320px] max-w-3xl rounded-xl overflow-hidden shadow-xl bg-white relative">
          <img
            src="/assets/slider1home.jpg"
            alt="Featured Robot"
            className="w-full object-cover max-h-60 sm:max-h-72"
            loading="lazy"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white font-sans text-sm rounded-b-xl">
            Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy
          </div>
        </div> */}

        {/* Recently Played */}
        {/* <aside className="w-72 flex flex-col space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 font-sans mb-2">Recently played</h2>
          <div className="space-y-4 max-h-[19rem] overflow-y-auto">
            {recentPlayed.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 bg-white rounded-xl shadow-lg p-2 items-center cursor-pointer"
              >
                <img
                  src={item.image}
                  alt={item.playlistName}
                  className="h-14 w-14 rounded-lg object-cover"
                  loading="lazy"
                />
                <div className="flex flex-col flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.playlistName}</p>
                  <p className="text-xs font-sans text-gray-600 truncate">{item.creator}</p>
                  <p className="text-xs font-sans text-gray-500 mt-auto">{item.duration}</p>
                </div>
                <button
                  aria-label="RSS Icon"
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                  onClick={() => alert("Cast action")}
                >
                  <FaBroadcastTower className="text-orange-500 w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </aside> */}
      {/* </div> */}
  <div className="flex flex-col lg:flex-row gap-8">
      {/* Left: Slider */}
      <div className="relative flex-1 min-w-[320px] rounded-2xl overflow-hidden shadow-lg">
        {/* Slides container */}
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {slides.map((slide) => (
            <img
              key={slide.id}
              src={slide.src}
              alt={slide.alt}
              className="w-full object-cover max-h-[22rem] flex-shrink-0"
            />
          ))}
        </div>

        {/* Caption */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-6 py-4 text-white text-sm">
          Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy.
        </div>

        {/* Dots */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
          {slides.map((_, index) => (
            <span
              key={index}
              onClick={() => setCurrent(index)}
              className={`h-2.5 w-2.5 rounded-full cursor-pointer ${
                index === current ? "bg-white" : "bg-gray-400"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Right: Recently Played */}
      <aside className="w-full lg:w-80 flex flex-col space-y-4">
        <h2 className="text-lg font-bold text-gray-900 font-sans">Recently played</h2>
        <div className="space-y-4">
          {recentPlayed.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 bg-white rounded-2xl shadow-md p-3 hover:shadow-lg transition cursor-pointer"
            >
              <img
                src={item.image}
                alt={item.playlistName}
                className="h-14 w-14 rounded-xl object-cover"
                loading="lazy"
              />
              <div className="flex flex-col flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{item.playlistName}</p>
                <p className="text-xs text-gray-600 truncate">{item.creator}</p>
                <p className="text-xs text-gray-500">{item.duration}</p>
              </div>
              <button
                aria-label="Cast Icon"
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <FaChromecast  className="text-orange-500 w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </aside>
    </div>
      {/* Devices Section */}
      <section>
        <h2 className="text-lg font-semibold font-sans mb-5">Devices</h2>
        {isLoading ? (
          <p className="text-gray-500 font-sans">Loading devices...</p>
        ) : devices.length === 0 ? (
          <p className="text-gray-500 font-sans">No devices found.</p>
        ) : (
          <div className="flex flex-wrap gap-6">
            {devices.map((device) => (
              <DeviceCard key={device._id} device={device} />
            ))}
          </div>
        )}
      </section>
    </div>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full  text-white font-sans select-none" style={{backgroundColor:"#07323C"}}>
      <div className="px-6 py-6 border-b border-teal-800 flex items-center gap-4">
        {/* <FaRobot className="text-emerald-300" size={28} />
         <RobotIcon size={28} className="text-emerald-300" /> */}
          <Image
      src="/assets/centelon-logo.svg"
      alt="Centelon Logo"
      width={30}
      height={30}
    />
        <span className="font-semibold text-[12px]">Centelon Robotics</span>
      </div>
      <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-6">
        {/* {menuSections.map((section) => (
          <div key={section.key}>
            {section.items ? (
              <>
                <h3 className="uppercase text-xs tracking-wider text-teal-400 mb-3 select-none">{section.label}</h3>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => handleMenuClick(item.key)}
                      className={`flex items-center gap-3 w-full py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        selectedMenu === item.key
                          ? "bg-custom-cyan text-white"
                          : "text-custom-white hover:bg-[#041C22]"
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <button
                onClick={() => handleMenuClick(section.key as ExtendedMenuKey)}
              //   className={`flex items-center gap-3 w-full py-3 px-4 rounded-lg text-sm font-semibold transition-colors ${
              //     selectedMenu === section.key
              //       ? "bg-emerald-400 text-white shadow-lg"
              //       : "text-teal-200 hover:bg-teal-700"
              //   } `}
              // >
              //   {section.icon}
              className={`flex items-center gap-3 w-full py-3 px-4 rounded-lg text-sm font-semibold transition-colors ${
  selectedMenu === section.key
    ? "bg-custom-cyan text-white shadow-lg"
    : "text-custom-white hover:bg-[#041C22]"
}`}
>
  {section.icon}

                <span>{section.label}</span>
              </button>
            )}
          </div>
        ))} */}
        
{menuSections.map((section) => (
  <div key={section.key}>
    {section.items ? (
      <>
        {/* Main menu button */}
        <button
          onClick={() => handleMenuToggle(section.key)}
          className={`flex items-center justify-between w-full py-3 px-4 rounded-lg font-semibold transition-colors text-[12px] ${
            expandedMenu === section.key
              ? "bg-custom-cyan text-white shadow-lg"
              : "text-[#9898A6] hover:bg-[#041C22]"
          }`}
        >
          <div className="flex items-center gap-3">
            {section.icon}
            <span>{section.label}</span>
          </div>
          <RiArrowDropDownLine
            className={`transition-transform duration-200 ${
              expandedMenu === section.key ? "rotate-180" : ""
            }`}
            size={20}
          />
        </button>

        {/* Sub-items */}
        {expandedMenu === section.key && (
          <div className="space-y-1 ml-6 mt-2">
            {section.items.map((item) => (
              <button
                key={item.key}
                onClick={() => handleMenuClick(item.key)}
                className={`flex items-center gap-3 w-full py-2 px-3 rounded-md text-[12px] font-medium transition-colors ${
                  selectedMenu === item.key
                    ? "bg-custom-cyan text-white"
                    : "text-custom-white hover:bg-[#041C22]"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </>
    ) : (
      <button
        onClick={() => handleMenuClick(section.key as ExtendedMenuKey)}
        className={`flex items-center gap-3 w-full py-3 px-4 rounded-lg font-semibold text-[14px] transition-colors ${
          expandedMenu === section.key
            ? "bg-custom-cyan text-white shadow-lg"
            : "text-[#9898A6] hover:bg-[#041C22]"
        }`}
      >
        {section.icon}
        <span>{section.label}</span>
      </button>
    )}
  </div>
))}

        {/* Device Management Static Links */}
        {/* <div className="mt-8 text-xs text-teal-400 uppercase font-semibold tracking-wide select-none">
          DEVICE MANAGEMENT
        </div>
        <div className="flex flex-col mt-2 space-y-2">
          {["Store device list", "Add/Pair device", "Device Status", "Zone mapping per store"].map((label) => (
            <button
              key={label}
              className="text-teal-300 hover:text-white text-sm text-left px-3 py-1 rounded cursor-pointer transition-colors"
              onClick={() => alert(`Clicked ${label}`)}
            >
              {label}
            </button>
          ))}
        </div> */}
      </nav>
      <div className="px-6 py-4 border-t border-teal-800 flex items-center gap-4">
        {userData ? (
          <>
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold select-none">
              {userData.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{userData.username}</span>
              <span className="text-xs text-teal-300">{userData.role}</span>
            </div>
          </>
        ) : null}
        <button
          onClick={handleLogout}
          title="Logout"
          className="ml-auto bg-emerald-600 hover:bg-emerald-700 rounded px-3 py-1.5 flex items-center gap-2 text-sm transition-colors"
        >
          <FaSignOutAlt />
          Logout
        </button>
      </div>
    </div>
  );

  // const renderContent = (): React.ReactElement => {
  //   if (selectedMenu !== "dashboard") {
  //     // Render original content pages if not dashboard to keep existing functionality
  //     return (
  //       <div className="p-4">
  //         <p className="text-gray-700 text-center py-20">
  //           {`Content for "${selectedMenu}" is not yet styled with new design.`}
  //         </p>
  //         <button
  //           onClick={() => setSelectedMenu("dashboard")}
  //           className="text-blue-600 hover:underline"
  //         >
  //           Return to Dashboard
  //         </button>
  //       </div>
  //     );
  //   }

  //   if (isLoading) return <p className="text-center font-sans text-gray-500 pt-16">Loading devices...</p>;
  //   if (error)
  //     return (
  //       <div className="flex flex-col items-center justify-center py-16 text-center bg-red-50 rounded-lg max-w-md mx-auto">
  //         <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
  //           <FaTimes className="w-8 h-8 text-red-500" />
  //         </div>
  //         <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h3>
  //         <p className="text-gray-600 max-w-md mb-6">{error}</p>
  //         <button
  //           onClick={() => window.location.reload()}
  //           className="bg-red-600 hover:bg-red-700 text-white rounded px-6 py-2 font-semibold transition"
  //         >
  //           Try Again
  //         </button>
  //       </div>
  //     );

  //   return <DashboardContent />;
  // };
//  const renderContent = (): React.ReactElement => {
//     if (isLoading) return <LoadingState />;
//     if (error) return (
//       <Card className="flex flex-col items-center justify-center py-16 text-center bg-red-50">
//         <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
//           <FaTimes className="w-8 h-8 text-red-500" />
//         </div>
//         <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h3>
//         <p className="text-gray-600 max-w-md mb-6">{error}</p>
//         <Button variant="primary" onClick={() => window.location.reload()}>Try Again</Button>
//       </Card>
//     );

//     switch (selectedMenu) {
//       // case "dashboard": return <DashboardView devices={devices} setDevices={setDevices} onAddNew={() => { }} onEditDevice={handleEditDevice} onManagePlaylists={() => { }} userRole="user" />;
//       case "createMedia": return <CreateMedia onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("showMedia")} />;
//       case "showMedia": return <ShowMedia onCancel={() => setSelectedMenu("dashboard")} />;
//       case "setupPlaylist": return <PlaylistSetup />;
//       case "showPlaylist": return <PlaylistManager />;
//       case "connectPlaylist": return <ConnectPlaylist onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("showPlaylist")} />;
//       case "createAnnouncement": return <CreateAnnouncement onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("showAnnouncement")} />;
//       case "setupAnnouncement": return <Announcement />;
//       case "InstantaneousAnnouncement": return <InstantaneousAnnouncement onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("showAnnouncement")} />;
//       case "showAnnouncement": return <ShowAnnouncement onCancel={() => setSelectedMenu("dashboard")} />;
//       case "connectAnnouncement": return <ConnectAnnouncement onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("dashboard")} />;
//       case "showAnnouncementList": return <AnnouncementList />;
//       case "TextToSpeech": return < TTSCreator/>;
//       default: return <div className="text-center py-20"><p className="text-gray-500">Select a menu item to view its content.</p></div>;
//     }
//   };
const renderContent = (): React.ReactElement => {
  if (selectedMenu !== "dashboard") {
    // Render original content pages if not dashboard to keep existing functionality
    switch (selectedMenu) {
      case "createPlaylist":
        return <CreateMedia onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("mediaLibrary")} />;
      case "mediaLibrary":
        return <ShowMedia  />;
      case "setupPlaylist":
        return <PlaylistSetup />;
      case "showPlaylist":
        return <PlaylistManager />;
      case "connectPlaylist":
        return <ConnectPlaylist onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("showPlaylist")} />;
      case "createAnnouncement":
        return <CreateAnnouncement onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("showAnnouncement")} />;
      case "setupAnnouncement":
        return <Announcement />;
      case "instantTrigger":
        return <InstantaneousAnnouncement onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("showAnnouncement")} />;
      case "showAnnouncement":
        return <ShowAnnouncement onCancel={() => setSelectedMenu("dashboard")} />;
      case "connectAnnouncement":
        return <ConnectAnnouncement onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("dashboard")} />;
      case "showAnnouncementList":
        return <AnnouncementList />;
      case "TextToSpeech":
        return <TTSCreator />;
      case "calendarView":
        return <Scheduler />;
      default:
        return (
          <div className="p-4 text-center py-20">
            <p className="text-gray-700">{`Content for "${selectedMenu}" is not yet styled with new design.`}</p>
            <button
              onClick={() => setSelectedMenu("dashboard")}
              className="text-blue-600 hover:underline mt-4"
            >
              Return to Dashboard
            </button>
          </div>
        );
    }
  }

  // If dashboard is selected, handle loading, error, and dashboard content
  if (isLoading) {
    return <p className="text-center font-sans text-gray-500 pt-16">Loading devices...</p>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-red-50 rounded-lg max-w-md mx-auto">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <FaTimes className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h3>
        <p className="text-gray-600 max-w-md mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-red-600 hover:bg-red-700 text-white rounded px-6 py-2 font-semibold transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  return <DashboardContent />;
};

  return (
    <div className="flex h-screen bg-[#e6f2f7] text-gray-800 font-sans overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-shrink-0 w-85">
        <SidebarContent />
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
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          </Transition.Child>

          {/* Sidebar slide */}
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <aside className="fixed inset-y-0 left-0 w-64 bg-teal-900 z-50">
              <SidebarContent />
            </aside>
          </Transition.Child>
        </div>
      </Transition>

      {/* Main */}
      <div className="flex flex-col flex-1 w-full max-h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 bg-white shadow-md z-30 flex items-center justify-between px-4 py-3 border-b border-gray-200 font-sans">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FaRobot className="text-emerald-600" /> Dashboard
          </h2>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
            aria-label={isMobileMenuOpen ? "Close Menu" : "Open Menu"}
          >
            {isMobileMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
          </button>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">{renderContent()}</main>
      </div>
    </div>
  );
}
