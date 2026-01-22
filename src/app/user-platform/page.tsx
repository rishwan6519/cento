"use client";
import React, { useState, useEffect, Fragment, useRef } from "react";
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
import { FaBolt, FaDisplay, FaUpload } from "react-icons/fa6";
import { RiArrowDropDownLine, RiDashboardLine } from "react-icons/ri";
import { MdOutlinePlaylistPlay, MdAnnouncement } from "react-icons/md";
import { Device, MenuKey } from "@/components/Platform/types";
import Image from "next/image";
import { Search, Bell, User, Clock, PlayCircle, Music, FileText } from "lucide-react";
import Button from "@/components/Platform/Button";
import Card from "@/components/Platform/Card";
import DashboardView from "@/components/Platform/views/DashboardView";
import PlaylistSetup from "@/components/PlaylistSetup/PlaylistSetup";
import CreateVideo from "@/components/CreateMedia/createMedia";
import CreateImage from "@/components/UploadImage/UploadImage";
import CreateAudio from "@/components/UploadAudio/UploadAudio";


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
import ViewGroups from "@/components/ViewGroups/ViewGroups";
import DeviceDetails from "@/components/DeviceDetails/DeviceDetails";
import { Play } from "next/font/google";
import CreatePresentation from "@/components/Presentation/Presentation";

// import RobotIcon from "@/components/icons/centelon-logo.svg";

interface DeviceStatuses {
  [serial: string]: {
    status: "online" | "offline";
    lastSync: string;
  };
}

interface DeviceCardProps {
  device: Device;
  deviceStatuses: DeviceStatuses;
  onClick: () => void; // Add onClick prop
}
// Define interfaces
interface UserData {
  _id: string;
  username: string;
  role: string;
}
interface Slide {
  id: string;
  src: string;
  alt: string;
  description: string;
}

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
  | "uploadVideo"
  |"uploadImage"
  |"uploadAudio"
  | "showPlaylist"
  | "connectPlaylist"
  | "playlistTemplates"
  |"viewGroups"
  |"presentation"

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

interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  items?: MenuItem[];
}



// const slides = [
//   { id: 1, src: "/assets/slider1home.jpg", alt: "Robot 1" },
//   { id: 2, src: "/assets/engagement_robot.jpg", alt: "Robot 2" },
//   { id: 3, src: "/assets/service_robot.jpg", alt: "Robot 3" },
// ];

export default function UserPlatform(): React.ReactElement {
  const [selectedMenu, setSelectedMenu] = useState<ExtendedMenuKey>("dashboard");
  const [sliderData, setSliderData] = useState<{ url: string; description: string; _id: string }[]>([]);
  // State for selected device
const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  

  useEffect(() => {
    const fetchSliderData = async () => {
      try {
        const response = await fetch(
          "https://iot.centelon.com/api/get-slider?userId=688c8989c3f5fa5504dfb2f6"
        );
        const result = await response.json();
        console.log(result,"result")
       

        if (result.success && result.data?.length > 0) {
          const sliderItems = result.data[0].sliderId?.sliders || [];

          const formattedSlides: Slide[] = sliderItems.map((item: any, index: number) => ({
            id: item._id || index.toString(),
            src: `https://iot.centelon.com${item.url}`, // prepend base URL
            alt: item.description || `Slide ${index + 1}`,
            description: item.description || "",
          }));

          setSlides(formattedSlides);
        } else {
          console.error("Invalid slider data structure:", result);
        }
      } catch (error) {
        console.error("Error fetching slider data:", error);
      }
    };

    fetchSliderData();
  }, []);

  // Auto slide every 4 seconds
  // useEffect(() => {
  //   if (slides.length > 0) {
  //     const interval = setInterval(() => {
  //       setCurrentIndex((prev) => (prev + 1) % slides.length);
  //     }, 4000);
  //     return () => clearInterval(interval);
  //   }
  // }, [slides]);
 useEffect(() => {
  const fetchSliderData = async () => {
    try {
      const response = await fetch(`/api/assign-device?userId=${localStorage.getItem("userId")}`);
      if (!response.ok) throw new Error("Failed to fetch slider data");
      const data = await response.json();
      if (data.success && data.data?.length > 0) {
        const sliders = data.data[0].sliderId.sliders.map((slide: any) => ({
          url: slide.url,
          description: slide.description,
        }));
        setSliderData(sliders);
      }
    } catch (err) {
      console.error("Error fetching slider data:", err);
    }
  };

  fetchSliderData();
}, []);


  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["playlist", "announcement"])
  );



  // Autoplay every 3 seconds

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

const menuSections: MenuItem[] = [
  { key: "dashboard", label: "Dashboard", icon: <FaThLarge size={15} /> },
  {
    key: "mediaManagement",
    label: "Media Management",
    icon: <FaMusic size={20} />,
    items: [
      {
        key: "upload",
        label: "Upload",
        icon: <FaUpload size={15} />,
        items: [
          { key: "uploadVideo", label: "Upload Video", icon: <FaListAlt /> },
          { key: "uploadAudio", label: "Upload Audio", icon: <FaMusic /> },
          { key: "uploadImage", label: "Upload Image", icon: <FaRegFileAudio /> },
        ],
      },
      {
        key: "media",
        label: "Media",
        icon: <FaMusic size={15} />,
        items: [
          { key: "mediaLibrary", label: "Media Library", icon: <FaRegFileAudio /> },
          // {key:"presentation", label:"Presentation", icon:<FaDesktop />}
        ],
      },
      {
        key: "playlist",
        label: "Playlist",
        icon: <MdOutlinePlaylistPlay size={15} />,
        items: [
          { key: "setupPlaylist", label: "Setup Playlist", icon: <FaListAlt /> },
          { key: "showPlaylist", label: "Show Playlist", icon: <MdOutlinePlaylistPlay /> },
          { key: "viewGroups", label: "Quick PLaylist", icon: <FaThLarge /> },
          { key: "connectPlaylist", label: "Connect Playlist", icon: <FaPlug /> },
        ],
      },
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
      { key: "InstantaneousAnnouncement", label: "Instantaneous Announcement", icon: <FaBolt /> },
    ],
  },
  {
    key: "scheduler",
    label: "Scheduler", 
    icon: <FaCalendarAlt size={20} />,
    items: [
      { key: "calendarView", label: "Calendar view", icon: <FaCalendarAlt /> },
    ],
  },
];

const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

const toggleMenu = (key: string) => {
  setExpandedMenus((prev) => {
    const newSet = new Set(prev);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    return newSet;
  });
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
      setSelectedDevice(null); // Add this line to clear selected device when menu is clicked

    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // Device Card Component (matches style from your image)
  // const DeviceCard = ({ device }: { device: Device }) => {
  //   // Dummy placeholders for last sync and playlist playing info
  //   const isConnected = device.status === "Connected" ||  "Online";
  //   const lastSync = "5 min ago";
  //   // Use device connectedPlaylists or mock if empty
  //   const playingPlaylist = device.connectedPlaylists?.length
  //     ? device.connectedPlaylists[0].name
  //     : isConnected
  //     ? "Soft Playlist"
  //     : null;
  //   const remainingTime = isConnected ? "30 min left" : null;

  //   return (
  //     <div
  //       className={`relative flex flex-col rounded-xl shadow-lg overflow-hidden w-72 cursor-pointer select-none transition-transform transform hover:scale-[1.02] ${
  //         isConnected ? "bg-gradient-to-tr from-blue-200 to-blue-100" : "bg-gray-100"
  //       }`}
  //     >
  //       {/* Device Image */}
  //       <div className="relative h-44 w-full overflow-hidden rounded-t-xl">
  //         <img
  //           src={device.deviceId.imageUrl ?? "/default-device-image.png"}
  //           alt={device.deviceId.name}
  //           loading="lazy"
  //           className="w-full h-full object-cover"
  //         />
  //         {/* Status Icon */}
  //         <div className="absolute top-3 right-3">
  //           {isConnected ? (
  //             <div className="bg-orange-500 rounded-full p-2 shadow-lg" title="Playing">
  //               <FaPlay className="text-white w-4 h-4" />
  //             </div>
  //           ) : (
  //             <div className="bg-gray-500 rounded-full p-2 shadow-lg" title="Info">
  //               <FaInfoCircle className="text-white w-4 h-4" />
  //             </div>
  //           )}
  //         </div>
  //       </div>
  //       {/* Info Section */}
  //       <div className="flex-1 p-4 flex flex-col justify-between">
  //         <div>
  //           <h3 className="font-semibold text-lg text-gray-900">{device.deviceId.name || "Device Name"}</h3>
  //           <p className="text-xs text-gray-600 mt-1">
  //             Type : Audio player
  //             <span className="mx-1">|</span>
  //             Zone : Entrance
  //           </p>
  //           {/* Status Details */}
  //           <div className="mt-2 space-y-1 text-sm">
  //             <p className="flex items-center gap-2">
  //               <span
  //                 className={`w-2 h-2 rounded-full inline-block ${
  //                   isConnected ? "bg-green-500" : "bg-red-500"
  //                 }`}
  //               />{" "}
  //               {isConnected ? "Connected" : "Online"}
  //             </p>
  //             <p className="flex items-center gap-2">
  //               <FaSyncAlt className="inline" />
  //               Last sync - {lastSync}
  //             </p>
  //             <p className="flex items-center gap-2 truncate">
  //               {isConnected && playingPlaylist ? (
  //                 <>
  //                   <FaPlay className="inline text-orange-600" />
  //                   Playing {playingPlaylist} | {remainingTime}
  //                 </>
  //               ) : (
  //                 <>
  //                   <FaPauseCircle className="inline text-red-600" />
  //                   Playlist is not connected
  //                 </>
  //               )}
  //             </p>
  //           </div>
  //         </div>
  //       </div>

  //       {/* Footer with actions */}
  //       <div className="bg-slate-900 text-white flex justify-between rounded-b-xl px-4 py-2">
  //         {isConnected ? (
  //           <>
  //             <button
  //               onClick={() => handleEditDevice(device)}
  //               className="text-sm hover:underline focus:outline-none"
  //               title="Disconnect"
  //             >
  //               Disconnect
  //             </button>
  //             <button
  //               onClick={() => alert("Restart device functionality")}
  //               className="text-sm hover:underline focus:outline-none"
  //               title="Restart"
  //             >
  //               Restart
  //             </button>
  //             <button
  //               onClick={() => alert("Reassign device functionality")}
  //               className="text-sm hover:underline focus:outline-none"
  //               title="Reassign"
  //             >
  //               Reassign
  //             </button>
  //           </>
  //         ) : (
  //           <>
  //             <button
  //               onClick={() => handleEditDevice(device)}
  //               className="text-sm hover:underline focus:outline-none"
  //               title="Connect"
  //             >
  //               Connect
  //             </button>
  //             <button
  //               onClick={() => alert("Restart device functionality")}
  //               className="text-sm hover:underline focus:outline-none"
  //               title="Restart"
  //             >
  //               Restart
  //             </button>
  //             <button
  //               onClick={() => alert("Reassign device functionality")}
  //               className="text-sm hover:underline focus:outline-none"
  //               title="Reassign"
  //             >
  //               Reassign
  //             </button>
  //           </>
  //         )}
  //       </div>
  //     </div>
  //   );
  // };
// const DeviceCard = ({ device }: { device: Device }) => {
//   const [deviceStatus, setDeviceStatus] = useState<"online" | "offline" | null>(null);
//   const [lastSync, setLastSync] = useState<string>("");
//   const previousStatus = useRef<"online" | "offline" | null>(null);
//   const hasShownOfflineToast = useRef(false);

//   useEffect(() => {
//     if (!device?.deviceId?.serialNumber) return;

//     const fetchDeviceStatus = async () => {
//       try {
//         const response = await fetch(
//           `https://iot.centelon.com/api/status-check?serialNumber=${device.deviceId.serialNumber}`
//         );
//         const data = await response.json();

//         if (data.success) {
//           const currentStatus = data.status as "online" | "offline";
//           const currentLastSync = data.lastConnection
//             ? new Date(data.lastConnection).toLocaleString()
//             : "";

//           // ✅ Update only when data changed (prevents blinking)
//           setDeviceStatus((prev) => (prev !== currentStatus ? currentStatus : prev));
//           setLastSync((prev) => (prev !== currentLastSync ? currentLastSync : prev));

//           // ✅ Trigger toast only once when goes offline
//           if (previousStatus.current === "online" && currentStatus === "offline") {
//             if (!hasShownOfflineToast.current) {
//               toast.error("Device is offline");
//               hasShownOfflineToast.current = true;
//             }
//           }

//           // ✅ Reset toast flag if device comes back online
//           if (currentStatus === "online") {
//             hasShownOfflineToast.current = false;
//           }

//           previousStatus.current = currentStatus;
//         }
//       } catch (error) {
//         console.error("Error fetching device status:", error);
//       }
//     };

//     // Initial check
//     fetchDeviceStatus();

//     // Poll every 10 seconds
//     const intervalId = setInterval(fetchDeviceStatus, 10000);
//     return () => clearInterval(intervalId);
//   }, [device?.deviceId?.serialNumber]);

//   const isOnline = deviceStatus === "online";
//   const playingPlaylist = device.connectedPlaylists?.length
//     ? device.connectedPlaylists[0].name
//     : isOnline
//     ? "Soft Playlist"
//     : null;
//   const remainingTime = isOnline ? "30 min left" : null;

//   return (
//     <div
//       className={`relative flex flex-col rounded-xl shadow-lg overflow-hidden w-72 cursor-pointer select-none transition-transform transform hover:scale-[1.02] ${
//         isOnline ? "bg-gradient-to-tr from-blue-200 to-blue-100" : "bg-gray-100"
//       }`}
//     >
//       {/* Device Image */}
//       <div className="relative h-44 w-full overflow-hidden rounded-t-xl">
//         <img
//           src={device.deviceId.imageUrl ?? "/default-device-image.png"}
//           alt={device.deviceId.name}
//           loading="lazy"
//           className="w-full h-full object-cover"
//         />
//         <div className="absolute top-3 right-3">
//           {isOnline ? (
//             <div className="bg-orange-500 rounded-full p-2 shadow-lg" title="Playing">
//               <FaPlay className="text-white w-4 h-4" />
//             </div>
//           ) : (
//             <div className="bg-gray-500 rounded-full p-2 shadow-lg" title="Offline">
//               <FaInfoCircle className="text-white w-4 h-4" />
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Info Section */}
//       <div className="flex-1 p-4 flex flex-col justify-between">
//         <div>
//           <h3 className="font-semibold text-lg text-gray-900">
//             {device.deviceId.name || "Device Name"}
//           </h3>
//           <p className="text-xs text-gray-600 mt-1">
//             Type : Audio player <span className="mx-1">|</span> Zone : Entrance
//           </p>

//           <div className="mt-2 space-y-1 text-sm">
//             <p className="flex items-center gap-2">
//               <span
//                 className={`w-2 h-2 rounded-full inline-block ${
//                   isOnline ? "bg-green-500" : "bg-red-500"
//                 }`}
//               />
//               {isOnline ? "Online" : "Offline"}
//             </p>
//             <p className="flex items-center gap-2">
//               <FaSyncAlt className="inline" />
//               Last connection - {lastSync || "Fetching..."}
//             </p>
//             <p className="flex items-center gap-2 truncate">
//               {isOnline && playingPlaylist ? (
//                 <>
//                   <FaPlay className="inline text-orange-600" />
//                   Playing {playingPlaylist} | {remainingTime}
//                 </>
//               ) : (
//                 <>
//                   <FaPauseCircle className="inline text-red-600" />
//                   Playlist is not connected
//                 </>
//               )}
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };
// const DeviceCard = ({ device }: { device: Device }) => {
//   const [deviceStatus, setDeviceStatus] = useState<"online" | "offline" | null>(null);
//   const [lastSync, setLastSync] = useState<string>("");
//   const previousStatus = useRef<"online" | "offline" | null>(null);

//   useEffect(() => {
//     if (!device?.deviceId?.serialNumber) return;

//     const fetchDeviceStatus = async () => {
//       try {
//         console.log("Checking status for:", device.deviceId.serialNumber);
//         const response = await fetch(
//           `https://iot.centelon.com/api/status-check?serialNumber=${device.deviceId.serialNumber}`
//         );
//         const data = await response.json();
//         console.log("API response:", data);

//         if (data.success) {
//           console.log("last",data);
          
//           const currentStatus = data.status as "online" | "offline";
//           setDeviceStatus(currentStatus);
//           setLastSync(data.lastConnection ? new Date(data.lastConnection).toLocaleString() : "");

//           // Show toast immediately if device is offline at first load
//           if (previousStatus.current === null && currentStatus === "offline") {
//             toast.error(`The device ${device.deviceId.serialNumber} is offline.`);
//           }

//           // Show toast when status changes from online → offline
//           if (previousStatus.current === "online" && currentStatus === "offline") {
//             toast.error(`The device ${device.deviceId.serialNumber} is offline.`);
//           }

//           previousStatus.current = currentStatus;
//         } else {
//           console.warn("API failed:", data);
//         }
//       } catch (error) {
//         console.error("Error fetching device status:", error);
//       }
//     };

//     // Initial call
//     fetchDeviceStatus();

//     // Poll every 10 seconds
//     const intervalId = setInterval(fetchDeviceStatus, 10000);
//     return () => clearInterval(intervalId);
//   }, [device?.deviceId?.serialNumber]);

//   const isOnline = deviceStatus === "online";
//   const playingPlaylist = device.connectedPlaylists?.length
//     ? device.connectedPlaylists[0].name
//     : isOnline
//     ? "Soft Playlist"
//     : null;
//   const remainingTime = isOnline ? "30 min left" : null;

//   return (
//     <div
//       className={`relative flex flex-col rounded-xl shadow-lg overflow-hidden w-72 cursor-pointer select-none transition-transform transform hover:scale-[1.02] ${
//         isOnline ? "bg-gradient-to-tr from-blue-200 to-blue-100" : "bg-gray-100"
//       }`}
//     >
//       {/* Device Image */}
//       <div className="relative h-44 w-full overflow-hidden rounded-t-xl">
//         <img
//           src={device.deviceId.imageUrl ?? "/default-device-image.png"}
//           alt={device.deviceId.name}
//           loading="lazy"
//           className="w-full h-full object-cover"
//         />
//         <div className="absolute top-3 right-3">
//           {isOnline ? (
//             <div className="bg-orange-500 rounded-full p-2 shadow-lg" title="Playing">
//               <FaPlay className="text-white w-4 h-4" />
//             </div>
//           ) : (
//             <div className="bg-gray-500 rounded-full p-2 shadow-lg" title="Offline">
//               <FaInfoCircle className="text-white w-4 h-4" />
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Info Section */}
//       <div className="flex-1 p-4 flex flex-col justify-between">
//         <div>
//           <h3 className="font-semibold text-lg text-gray-900">
//             {device.deviceId.name || "Device Name"}
//           </h3>
//           <p className="text-xs text-gray-600 mt-1">
//             Type : {device.deviceId?._id} <span className="mx-1">|</span> Zone :{" "}
//             {device.deviceId?.serialNumber}
//           </p>

//           <div className="mt-2 space-y-1 text-sm">
//             <p className="flex items-center gap-2">
//               <span
//                 className={`w-2 h-2 rounded-full inline-block ${
//                   isOnline ? "bg-green-500" : "bg-red-500"
//                 }`}
//               />
//               {isOnline ? "Online" : "Offline"}
//             </p>

//             <p className="flex items-center gap-2">
//               <FaSyncAlt className="inline" />
//               Last connection - {lastSync || "Fetching..."}
//             </p>

//             <p className="flex items-center gap-2 truncate">
//               {isOnline && playingPlaylist ? (
//                 <>
//                   <FaPlay className="inline text-orange-600" />
//                   Playing {playingPlaylist} | {remainingTime}
//                 </>
//               ) : (
//                 <>
//                   <FaPauseCircle className="inline text-red-600" />
//                   Playlist is not connected
//                 </>
//               )}
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };
// console.log("devices",devices);

// useEffect(() => {
//   // if (!device?.deviceId?.serialNumber) return;

//   const fetchDeviceStatus = async () => {
//     try {
//       const response = await fetch(
//         `https://iot.centelon.com/api/status-check?serialNumber=${devices.map((i)=>i.deviceId.serialNumber)}`
//       );
//       const data = await response.json();

//       if (data.success) {
//         const currentStatus = data.status as "online" | "offline";
//         const currentLastSync = data.lastConnection
//           ? new Date(data.lastConnection).toLocaleString()
//           : "";

//         // setDeviceStatus(currentStatus);
//         // setLastSync(currentLastSync);

//         // Toast show only once on first offline
//         if (currentStatus === "offline") {
//           toast.error(`The device  is offline.`);
//         }
//       }
//     } catch (error) {
//       console.error("Error fetching device status:", error);
//     }
//   };

//   // Call API only once
//   fetchDeviceStatus();

// }, [devices]);
const [deviceStatus, setDeviceStatus] = useState<"online" | "offline" | null>(null);
  const [lastSync, setLastSync] = useState<string>("");
  const previousStatus = useRef<"online" | "offline" | null>(null);
  const previousLastSync = useRef<string>("");
  const [deviceStatuses, setDeviceStatuses] = useState({});
    const [recentPlaylists, setRecentPlaylists] = useState<any[]>([]);


useEffect(() => {
  if (!devices?.length) return;

  const fetchStatuses = async () => {
    const statuses: any = {};
    for (const d of devices) {
      const serial = d?.deviceId?.serialNumber;
      if (!serial) continue;
      try {
        const response = await fetch(
          `https://iot.centelon.com/api/status-check?serialNumber=${serial}`
        );
        const data = await response.json();
        if (data.success) {
          statuses[serial] = {
            status: data.status,
            lastSync: data.lastConnection
              ? new Date(data.lastConnection).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                }).replace("AM", "am").replace("PM", "pm")
              : "",
          };
        }
      } catch (error) {
        console.error("Error fetching device status:", error);
      }
    }
    setDeviceStatuses(statuses); // Update once per interval
  };

  fetchStatuses();
  const intervalId = setInterval(fetchStatuses, 10000);
  return () => clearInterval(intervalId);
}, [devices]);



 useEffect(() => {
    const fetchRecentPlaylists = async () => {
      try {
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        // Fetch all playlists for the user
        const response = await fetch(`/api/playlists?userId=${userId}`);
        if (!response.ok) throw new Error("Failed to fetch playlists");
        
        const data = await response.json();
        // Get the 4 most recently created/updated playlists
        const recent = data
          .sort((a: any, b: any) => 
            new Date(b.createdAt || b.updatedAt).getTime() - 
            new Date(a.createdAt || a.updatedAt).getTime()
          )
          .slice(0, 3);
        
        setRecentPlaylists(recent);
      } catch (error) {
        console.error("Error fetching recent playlists:", error);
      }
    };

    if (localStorage.getItem("userId")) {
      fetchRecentPlaylists();
    }
  }, []);

// useEffect(() => {
//   if (!devices?.length) return;

//   const fetchStatuses = async () => {
//     for (const d of devices) {
//       const serial = d?.deviceId?.serialNumber;
//       if (!serial) continue;

//       try {
//         const response = await fetch(
//           `https://iot.centelon.com/api/status-check?serialNumber=${serial}`
//         );

//         const data = await response.json();
// console.log("data-->",data.device);

//          if (data.success) {
//         const currentStatus = data.status as "online" | "offline";
//         const currentLastSync = data.lastConnection
//           ? new Date(data.lastConnection).toLocaleString()
//           : "";

//         setDeviceStatus(currentStatus);
//         setLastSync(currentLastSync);

//         // Toast show only once on first offline
//         if (currentStatus === "offline") {
//           toast.error(`The device ${serial} is offline.`);
//         }
//       }
//       } catch (error) {
//         console.error("Error fetching device status:", error);
//       }
//     }
//   };

//   // Call all API requests only once
//   fetchStatuses();
//   const intervalId = setInterval(fetchStatuses, 10000);
//     return () => clearInterval(intervalId);

// }, [devices]);
// const DeviceCard = ({ device, deviceStatuses }) => {
const DeviceCard = ({ device, deviceStatuses, onClick }: DeviceCardProps) => {
  const serial = device.deviceId.serialNumber;
  const deviceState = deviceStatuses[serial] || {};
  const isOnline = deviceState.status === "online";
  const lastSync = deviceState.lastSync || "None";
    const imageUrl = device.deviceId.imageUrl || "/default-device-image.png"; // fallback


  const remainingTime = isOnline ? device.deviceId.status : null;

  return (
    <div
      className={`relative flex flex-col rounded-xl shadow-lg overflow-hidden w-72 cursor-pointer select-none transition-transform transform hover:scale-[1.02] ${
        isOnline
          ? "bg-gradient-to-tr from-blue-200 to-blue-100"
          : "bg-gray-100"
      }`}
      onClick={onClick} // Add click handler
    >

      {/* device image section .*/}
       {/* <div className="relative h-44 w-full overflow-hidden rounded-t-xl">
        <img
          src={imageUrl}
          alt={device.deviceId.name || "Device"}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div> */}
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-lg text-gray-900">
            {device.deviceId.name || "Device Name"}
          </h3>

          <p className="text-xs text-gray-600 mt-1">
            Type : {device.deviceId?.name || "Unknown Type"}
            <span className="mx-1">|</span>
            Serial Number : {serial}
          </p>

          <div className="mt-2 space-y-1 text-sm">
            <p className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full inline-block ${
                  isOnline ? "bg-green-500" : "bg-red-500"
                }`}
              />
              {isOnline ? "Online" : "Offline"}
            </p>

            <p className="flex items-center gap-2">
              <FaSyncAlt className="inline" />
              Last connection - {lastSync}
            </p>

            <p className="flex items-center gap-2 truncate">
             
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};




// const DeviceCard = ({ device }: { device: Device }) => {
  




//   const isOnline = deviceStatus === "online";
//   const playingPlaylist = device.connectedPlaylists?.length
//     ? device.connectedPlaylists[0].name
//     : isOnline
//     ? "Soft Playlist"
//     : null;
//   const remainingTime = isOnline ? "30 min left" : null;

//   return (
//     <div
//       className={`relative flex flex-col rounded-xl shadow-lg overflow-hidden w-72 cursor-pointer select-none transition-transform transform hover:scale-[1.02] ${
//         isOnline ? "bg-gradient-to-tr from-blue-200 to-blue-100" : "bg-gray-100"
//       }`}
//     >
//       {/* ... Keep all other UI same */}
//       <div className="flex-1 p-4 flex flex-col justify-between">
//         <div>
//           <h3 className="font-semibold text-lg text-gray-900">
//             {device.deviceId.name || "Device Name"}
//           </h3>

//           <p className="text-xs text-gray-600 mt-1">
//             Type : {device.deviceId?._id} <span className="mx-1">|</span> Zone :{" "}
//             {device.deviceId?.serialNumber}
//           </p>

//           <div className="mt-2 space-y-1 text-sm">
//             <p className="flex items-center gap-2">
//               <span
//                 className={`w-2 h-2 rounded-full inline-block ${
//                   isOnline ? "bg-green-500" : "bg-red-500"
//                 }`}
//               />
//               {isOnline ? "Online" : "Offline"}
//             </p>

//             <p className="flex items-center gap-2">
//               <FaSyncAlt className="inline" />
//               Last connection - {lastSync || "Fetching..."}
//             </p>

//             <p className="flex items-center gap-2 truncate">
//               {isOnline && playingPlaylist ? (
//                 <>
//                   <FaPlay className="inline text-orange-600" />
//                   Playing {playingPlaylist} | {remainingTime}
//                 </>
//               ) : (
//                 <>
//                   <FaPauseCircle className="inline text-red-600" />
//                   Playlist is not connected
//                 </>
//               )}
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };



  // Dashboard content matching image layout
  const DashboardContent = () => (
    <div className="flex flex-col space-y-8">
     
        <header className="px-6 pt-4 pb-3 border-b border-gray-200 bg-[#E6F9FD] flex items-center justify-between">
      {/* Left Content */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          Welcome Back, {userData?.username }!
        </h1>
        <p className="text-gray-700  text-sm max-w-xl">
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

     
  <div className="flex flex-col lg:flex-row gap-8">
      {/* Left: Slider */}
  {/* Left: Enhanced Slider */}
<div className="relative flex-1 min-w-[320px] h-[450px] rounded-2xl overflow-hidden shadow-2xl group bg-gray-900">
  {slides.length > 0 ? (
    <>
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 w-full h-full transition-all duration-1000 ease-in-out transform ${
            index === currentIndex
              ? "opacity-100 scale-100 z-10"
              : "opacity-0 scale-110 z-0"
          }`}
        >
          <img
            src={slide.src}
            alt={slide.alt}
            className="w-full h-full object-cover"
          />
          {/* Stylish Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        </div>
      ))}

      {/* Content Overlay (Text) */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-8 text-white">
        <div 
          className="transform transition-all duration-700 ease-out translate-y-0 opacity-100"
          key={currentIndex} // Key change triggers animation reset
        >
          <h3 className="text-lg md:text-xl font-bold mb-2 drop-shadow-md">
             {/* Fallback title if description is empty, or show description */}
            {slides[currentIndex]?.description || "Featured Highlight"}
          </h3>
        </div>
      </div>

      {/* Navigation Indicators (Pill Style) */}
      <div className="absolute bottom-6 right-6 z-20 flex gap-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 rounded-full transition-all duration-500 ${
              idx === currentIndex
                ? "w-8 bg-orange-500"
                : "w-2 bg-white/50 hover:bg-white"
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </>
  ) : (
    // Loading Skeleton if no slides
    <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center text-gray-400">
      Loading visuals...
    </div>
  )}
</div>





      {/* Right: Recently Played */}
  <aside className="w-full lg:w-80 flex flex-col space-y-6">
  <div className="flex items-center gap-2">
    <div className="h-8 w-1 bg-gradient-to-b bg-orange-600 rounded-full"></div>
    <h2 className="text-xl font-bold text-gray-900">Recently Connected PLaylist</h2>
  </div>
  
  <div className="space-y-3">
    {recentPlaylists.length === 0 ? (
      <div className="text-center py-12 px-4">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Music className="text-blue-500" size={28} />
        </div>
        <p className="text-gray-600 font-medium mb-1">No playlists yet</p>
        <p className="text-gray-400 text-sm">Connect your first playlist to get started</p>
      </div>
    ) : (
      recentPlaylists.map((playlist) => (
        <div
          key={playlist._id}
          className="group relative bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 p-4 cursor-pointer border border-gray-100 hover:border-blue-200 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <div className="relative flex items-start gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-orange-600 p-2.5 rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300">
              <Music className="text-white" size={20} />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate mb-2 group-hover:text-blue-600 transition-colors">
                {playlist.name}
              </h3>
              
              <div className="flex items-center text-xs text-gray-500 mb-3">
                <Clock size={12} className="mr-1.5 flex-shrink-0" />
                <span className="truncate">
                  {playlist.createdAt 
                    ? new Date(playlist.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : playlist.updatedAt 
                    ? new Date(playlist.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : "Unknown date"}
                </span>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium">
                  <FileText size={12} className="mr-1" />
                  {playlist.files?.length || 0}
                </span>
                <span className="text-xs px-2.5 py-1 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 rounded-lg font-medium">
                  {playlist.contentType}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))
    )}
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
          // <div className="flex flex-wrap gap-6">
          //   {devices.map((device) => (
          //     <DeviceCard key={device._id} device={device} />
          //   ))}
          // </div>
          <div className="flex flex-wrap gap-6">
  {devices.map((d) => (
    <DeviceCard
      key={d.deviceId.serialNumber}
      device={d}
      deviceStatuses={deviceStatuses}
      onClick={() => setSelectedDevice(d)} // Pass click handler
    />
  ))}
</div>

        )}
      </section>
    </div>
  );

  const SidebarContent = () => (
    // <div className="flex flex-col h-full  text-white font-sans select-none" style={{backgroundColor:"#07323C"}}>
     <div
  className="flex flex-col h-full w-100 text-white font-sans select-none"
  style={{ backgroundColor: "#07323C" }}
>
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
        
        
        {menuSections.map((section) => {
          const renderMenuItem = (item: MenuItem, depth = 0) => {
            const hasChildren = item.items && item.items.length > 0;
            const isExpanded = expandedMenus.has(item.key);
            const isSelected = selectedMenu === item.key;
            const paddingLeft = 16 + depth * 12;

            // Professional styles for sub-menu items
            const baseClass =
              "flex items-center justify-between w-full py-3 pr-4 rounded-lg transition-colors";
            const mainMenuClass =
              "font-semibold text-[13px]";
            const subMenuClass =
              "font-normal text-[12px] pl-3 border-l-2 border-transparent hover:border-cyan-400";
            const selectedClass =
              "bg-custom-cyan text-white shadow-lg";
            const unselectedClass =
              "text-[#9898A6] hover:bg-[#041C22]";

            return (
              <div key={item.key}>
                <button
                  onClick={() => {
                    if (hasChildren) {
                      toggleMenu(item.key);
                    } else {
                      handleMenuClick(item.key as ExtendedMenuKey);
                    }
                  }}
                  className={[
                    baseClass,
                    depth === 0 ? mainMenuClass : subMenuClass,
                    isSelected ? selectedClass : unselectedClass,
                  ].join(" ")}
                  style={{ paddingLeft: `${paddingLeft}px` }}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {hasChildren && (
                    <RiArrowDropDownLine
                      className={`transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      size={20}
                    />
                  )}
                </button>
                {hasChildren && isExpanded && (
                  <div className="mt-1 space-y-1">
                    {item.items!.map((subItem) => renderMenuItem(subItem, depth + 1))}
                  </div>
                )}
              </div>
            );
          };

          return renderMenuItem(section);
        })}

       
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

  const renderContent = (): React.ReactElement => {
  if (selectedDevice) {
    // Render device details if a device is selected
    return <DeviceDetails device={selectedDevice} onBack={() => setSelectedDevice(null)} />;
  }

  if (selectedMenu !== "dashboard") {
    // Render original content pages if not dashboard to keep existing functionality
    switch (selectedMenu) {
      case "uploadVideo":
        return <CreateVideo onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("mediaLibrary")} />;
        case "uploadImage":
        return <CreateImage onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("mediaLibrary")} />;
         case "uploadAudio":
        return <CreateAudio onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("mediaLibrary")} />;
      //    case "presentation":
      // return <CreatePresentation onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("mediaLibrary")} />;
      case "mediaLibrary":
        return <ShowMedia  />;
         case "viewGroups":
        return <ViewGroups />;
      case "setupPlaylist":
        return <PlaylistSetup onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("showPlaylist")} />;
      case "showPlaylist":
        return <PlaylistManager />;
      case "connectPlaylist":
        return <ConnectPlaylist onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("showPlaylist")} />;
      case "createAnnouncement":
        return <CreateAnnouncement onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("announcementLibrary")} />;
      case "scheduleAnnouncement":
        return <Announcement />;
      case "announcementPlaylist":
         return <AnnouncementList />;
         case "InstantaneousAnnouncement":
          return <InstantaneousAnnouncement onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("announcementLibrary")} />;
          
        // return <InstantaneousAnnouncement onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("showAnnouncement")} />;
      case "announcementLibrary":
        return <ShowAnnouncement onCancel={() => setSelectedMenu("dashboard")} />;
      case "calendarView":
        return < Scheduler />;
      case "connectAnnouncement":
        return <ConnectAnnouncement onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("dashboard")} />;
      case "connectDeviceZone":
        return <AnnouncementList />;
      case "TextToSpeech":
        return <TTSCreator />;
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
      <main className="flex-1 overflow-y-auto p-6">
  {renderContent()}
</main>
      </div>

{/* Floating Action Button - Instant Announcement */}
      <button
        onClick={() => {
            setSelectedMenu("InstantaneousAnnouncement");
            setIsMobileMenuOpen(false); // Close mobile menu if open
        }}
        className="fixed bottom-6 right-6 z-[60] flex items-center justify-center bg-orange-600 hover:bg-orange-700 text-white rounded-full p-4 shadow-[0_4px_20px_rgba(234,88,12,0.5)] transition-all duration-300 hover:scale-110 hover:-translate-y-1 active:scale-95 group"
        title="Make Instant Announcement"
      >
        <div className="relative">
          <FaBolt className="text-2xl animate-pulse" />
        </div>
        
        {/* Expandable Text (Visible on hover or make static if preferred) */}
        <span className="max-w-0 overflow-hidden group-hover:max-w-[150px] group-hover:ml-3 transition-all duration-500 ease-in-out whitespace-nowrap font-bold text-sm">
              Instant Announcement        </span>
      </button>

      {/* End of Main Wrapper. */}
    </div>
  );
}


