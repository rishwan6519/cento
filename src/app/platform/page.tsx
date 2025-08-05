"use client";
import React, { useState, useEffect } from "react";
import Button from "@/components/Platform/Button";
import Card from "@/components/Platform/Card";
import DashboardView from "@/components/Platform/views/DashboardView";
import ManageDevicesView from "@/components/Platform/views/ManageDevicesView";
import ConnectedPlaylistsView from "@/components/Platform/modals/ConnectedPlaylistsView";
import AddPlaylistModal from "@/components/Platform/modals/AddPlaylistModal";
import { HiOutlineChevronDown, HiOutlineChevronRight } from "react-icons/hi";
import { dummyPlaylists } from "@/components/Platform/DummyData";
import { AnimatePresence, motion } from "framer-motion";
import {
  FaRobot,
  FaRegFileAudio,
  FaListAlt,
  FaPlug,
  FaMobileAlt,
  FaTachometerAlt,
  FaUser,
  FaMobile,
} from "react-icons/fa";
import { RiDashboardLine } from "react-icons/ri";
import { BsMusicNoteList } from "react-icons/bs";
import { IoMdSettings } from "react-icons/io";
import PlaylistManager from "@/components/ShowPlaylist/showPlaylist";
import {
  Device,
  Playlist,
  MenuKey,
  DeviceFormData,
  DeviceReference,
} from "@/components/Platform/types";
import PlaylistSetup from "@/components/PlaylistSetup/PlaylistSetup";
import { MdOutlinePlaylistPlay } from "react-icons/md";
import CreateMedia from "@/components/CreateMedia/createMedia";
import ShowMedia from "@/components/ShowMedia/showMedia";
import ConnectPlaylist from "@/components/ConnectPlaylist/connectPlaylist";
import OnboardingPage from "@/components/onboardDevice/onboardDevice";
import CreateUser from "@/components/CreateUser/CreateUser";
import LoadingState from "@/components/Platform/LoadingState";
import ShowUsers from "@/components/ShowUsers/ShowUsers";
import AssignDevice from "@/components/AssignDevice/AssignDevice";
import toast from "react-hot-toast";
import Announcement from "@/components/Announcement/Announcement";
import CreateAnnouncement from "@/components/CreateAnnouncement/CreateAnnouncement";
import ShowAnnouncement from "@/components/Announcement/ShowAnnouncement";

export default function RoboticPlatform(): React.ReactElement {
  const [selectedMenu, setSelectedMenu] = useState<MenuKey>("dashboard");
  const [devices, setDevices] = useState<Device[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showOnboardModal, setShowOnboardModal] = useState<boolean>(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState<boolean>(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [menuExpanded, setMenuExpanded] = useState<Record<string, boolean>>({
    devices: false,
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userRole = localStorage.getItem("userRole");
    if (userRole === "superUser") {
      toast.success("Welcome Super User!");
    } else {
      toast.error("You are not authorized to access this page.");
      window.location.href = "/login"; // Redirect to login page
    }

    const fetchDevices = async () => {
      try {
        setIsLoading(true);
        setError(null); // Reset error state

        const userId = localStorage.getItem("userId");
        if (!userId) {
          setError("Please log in to view devices");
          return;
        }

        const response = await fetch(
          `/api/onboarded-devices?userId=${userId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch devices");
        }

        const data = await response.json();
        console.log("Fetched devices:", data);

        if (data.success && Array.isArray(data.data)) {
          console.log(
            "Devices data:",
            data.data.map((device: any) => device.deviceId.status)
          );
          setDevices(
            data.data.map((device: any) => ({
              ...device,
              lastActive: new Date(device.updatedAt).toLocaleString(),
              status:
                device.deviceId.status === "active"
                  ? "Connected"
                  : "Disconnected",
            }))
          );
        } else {
          throw new Error("Invalid data format received from server");
        }
      } catch (err) {
        console.error("Error fetching devices:", err);
        setError(err instanceof Error ? err.message : "Failed to load devices");
        setDevices([]); // Reset devices on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchDevices();
  }, []); // Empty dependency array

  const devicesWithPlaylistInfo = devices.map((device) => ({
    ...device,
    connectedPlaylists: playlists.filter((p) =>
      p.deviceIds.some((deviceRef) => deviceRef.id === device._id)
    ),
  }));

  const menuItems = [
    {
      key: "dashboard" as MenuKey,
      label: "Dashboard",
      icon: <RiDashboardLine />,
    },
    {
      key: "onboardDevice" as MenuKey,
      label: "Onboard Devices",
      icon: <FaMobileAlt />,
    },
    {
      key: "createMedia" as MenuKey,
      label: "Create Media",
      icon: <FaRegFileAudio />,
    },
    {
      key: "showMedia" as MenuKey,
      label: "Show Media",
      icon: <FaRegFileAudio />,
    },
    {
      key: "setupPlaylist" as MenuKey,
      label: "Setup Playlist",
      icon: <FaListAlt />,
    },
    {key:"createAnnouncement" as MenuKey, label: "Create Announcement", icon: <IoMdSettings />},
    {
      key: "setupAnnouncement" as MenuKey,
      label: "Setup Announcement",
      icon: <IoMdSettings />,
    },
    { key: "createUser" as MenuKey, label: "Create User ", icon: <FaUser /> },
    { key: "showUser" as MenuKey, label: "Show User", icon: <FaUser /> },
    {
      key: "assignDevice" as MenuKey,
      label: "Assign Device",
      icon: <FaRobot />,
    },
    {
      key: "showPlaylist" as MenuKey,
      label: "Show Playlist",
      icon: <MdOutlinePlaylistPlay />,
    },
    {
      key: "connectPlaylist" as MenuKey,
      label: "Connect Playlist",
      icon: <FaPlug />,
    },
    {
      key: "ManageDevice" as MenuKey,
      label: "Manage Devices",
      icon: <FaMobileAlt />,
      subItems: [
        {
          key: "connectedPlaylists" as MenuKey,
          label: "Connected Playlists",
          icon: <BsMusicNoteList />,
        },
      ],
      expanded: menuExpanded.devices,
    },
  ];

  const toggleMenuExpansion = (menuSection: string) => {
    setMenuExpanded((prev) => ({
      ...prev,
      [menuSection]: !prev[menuSection],
    }));
  };

  const addNewDevice = async (deviceData: DeviceFormData): Promise<void> => {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        throw new Error("User ID not found in localStorage");
      }

      const response = await fetch("/api/onboarded-devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...deviceData,
          userId,
          status: "active",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add device");
      }

      const data = await response.json();
      if (data.success) {
        const newDevice = {
          ...data.data,
          batteryLevel: "100%",
          location: "Not specified",
          lastActive: "Just now",
          status: "Connected",
          connectedPlaylists: [],
        };
        setDevices([...devices, newDevice]);
        setShowOnboardModal(false);
      } else {
        throw new Error(data.message || "Failed to add device");
      }
    } catch (err) {
      console.error("Error adding device:", err);
      setError(err instanceof Error ? err.message : "Failed to add device");
    }
  };

  const addNewPlaylist = (name: string): void => {
    const newPlaylist: Playlist = {
      id: String(Date.now()), // Generate string ID
      name,
      type: "default",
      contentType: "audio",
      startTime: "",
      endTime: "",
      files: [],
      deviceIds: [],
      status: "active",
      createdAt: new Date(),
    };
    setPlaylists([...playlists, newPlaylist]);
    setShowPlaylistModal(false);
  };

  const connectPlaylist = (playlistId: string, deviceId: string): void => {
    const deviceToConnect = devices.find((d) => d._id === deviceId);
    if (!deviceToConnect) return;

    const deviceReference: DeviceReference = {
      id: deviceId,
      name: deviceToConnect.name,
    };

    setPlaylists((prevPlaylists) =>
      prevPlaylists.map((playlist) =>
        playlist.id === playlistId
          ? {
              ...playlist,
              deviceIds: [...playlist.deviceIds, deviceReference],
            }
          : playlist
      )
    );
  };

  const handleEditDevice = async (device: Device): Promise<void> => {
    try {
      const newStatus =
        device.status === "Connected" ? "Disconnected" : "Connected";
      const apiStatus = newStatus === "Connected" ? "active" : "inactive";

      const response = await fetch(`/api/onboarded-devices/${device._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: apiStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update device");
      }

      const data = await response.json();
      if (data.success) {
        setDevices(
          devices.map((d) =>
            d._id === device._id
              ? {
                  ...d,
                  status: newStatus,
                  lastActive: new Date().toLocaleString(),
                }
              : d
          )
        );
      } else {
        throw new Error(data.message || "Failed to update device");
      }
    } catch (err) {
      console.error("Error updating device:", err);
      setError(err instanceof Error ? err.message : "Failed to update device");
    }
  };

  const handleManagePlaylists = (device: Device): void => {
    setSelectedDevice(device);
    setSelectedMenu("connectedPlaylists");
  };

  const renderContent = (): React.ReactElement => {
    if (isLoading) {
      return <LoadingState />;
    }

    if (error) {
      return (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading Devices
          </h3>
          <p className="text-gray-500 max-w-md mb-6">{error}</p>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </Card>
      );
    }

    switch (selectedMenu) {
      case "dashboard":
        return (
          <DashboardView
            devices={devices}
            setDevices={setDevices}
            onAddNew={() => setShowOnboardModal(true)}
            onEditDevice={handleEditDevice}
            onManagePlaylists={handleManagePlaylists}
          />
        );
      case "onboardDevice":
        return (
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center justify-center py-8">
              <OnboardingPage />
            </div>
          </div>
        );
      case "connectedPlaylists":
        return (
          <ConnectedPlaylistsView
            devices={devicesWithPlaylistInfo}
            playlists={playlists}
            selectedDevice={selectedDevice}
            onAddNewPlaylist={() => setShowPlaylistModal(true)}
            onConnectPlaylist={connectPlaylist}
            onBackToDevices={() => {
              setSelectedDevice(null);
              setSelectedMenu("onboardDevice");
            }}
          />
        );

      case "setupPlaylist":
        return <PlaylistSetup />;
    // In your renderContent function
    case "setupAnnouncement":
      return <Announcement />;

    case "createAnnouncement":
      return <CreateAnnouncement onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("setupAnnouncement")} />;
      case "showAnnouncement":
        return <ShowAnnouncement onCancel={() => setSelectedMenu("dashboard")} />;
    case "assignDevice":
      return <AssignDevice />;

      case "showUser":
        return <ShowUsers />;
      case "showPlaylist":
        return <PlaylistManager />;
      case "createMedia":
        return (
          <CreateMedia
            onCancel={() => setSelectedMenu("dashboard")}
            onSuccess={() => setSelectedMenu("showMedia")}
          />
        );

      case "showMedia":
        return <ShowMedia onCancel={() => setSelectedMenu("onboardDevice")} />;
      case "connectPlaylist":
        return (
          <ConnectPlaylist
            onCancel={() => setSelectedMenu("dashboard")}
            onSuccess={() => setSelectedMenu("showPlaylist")}
          />
        );
      case "createUser":
        return <CreateUser />;

        return (
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              {menuItems.find((item) => item.key === selectedMenu)?.icon}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {menuItems.find((item) => item.key === selectedMenu)?.label}
            </h3>
            <p className="text-gray-500 max-w-md mb-6">
              This feature is currently under development. We're working hard to
              bring you the best experience.
            </p>
            <Button
              variant="secondary"
              onClick={() => setSelectedMenu("dashboard")}
            >
              Back to Dashboard
            </Button>
          </Card>
        );
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Select a menu item from the sidebar</p>
          </div>
        );
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const menuSections = [
    {
      title: "General",
      items: [
        {
          key: "dashboard" as MenuKey,
          label: "Dashboard",
          icon: <RiDashboardLine />,
        },
      ],
    },
    {
      title: "Device Management",
      items: [
        {
          key: "onboardDevice" as MenuKey,
          label: "Onboard Devices",
          icon: <FaMobileAlt />,
        },
        {
          key: "assignDevice" as MenuKey,
          label: "Assign Device",
          icon: <FaRobot />,
        },
        {
          key: "ManageDevice" as MenuKey,
          label: "Manage Devices",
          icon: <FaMobileAlt />,
          subItems: [
            {
              key: "connectedPlaylists" as MenuKey,
              label: "Connected Playlists",
              icon: <BsMusicNoteList />,
            },
          ],
        },
      ],
    },
    {
      title: "Media Management",
      items: [
        {
          key: "createMedia" as MenuKey,
          label: "Create Media",
          icon: <FaRegFileAudio />,
        },
        {
          key: "showMedia" as MenuKey,
          label: "Show Media",
          icon: <FaRegFileAudio />,
        },
        {
          key: "setupPlaylist" as MenuKey,
          label: "Setup Playlist",
          icon: <FaListAlt />,
        },
        {key: "setupAnnouncement" as MenuKey, label: "Setup Announcement", icon: <IoMdSettings />},
        {key: "createAnnouncement" as MenuKey, label: "Create Announcement", icon: <IoMdSettings />},
        { key: "showAnnouncement" as MenuKey, label: "Show Announcement", icon: <IoMdSettings /> },
        {
          key: "showPlaylist" as MenuKey,
          label: "Show Playlist",
          icon: <MdOutlinePlaylistPlay />,
        },
        {
          key: "connectPlaylist" as MenuKey,
          label: "Connect Playlist",
          icon: <FaPlug />,
        },
      ],
    },
    {
      title: "User Management",
      items: [
        {
          key: "createUser" as MenuKey,
          label: "Create User",
          icon: <FaUser />,
        },
        { key: "showUser" as MenuKey, label: "Show User", icon: <FaUser /> },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Menu Button at the very top */}
      <div className="lg:hidden p-4 bg-white border-b border-gray-200 flex items-center justify-between text-black">
        <h2 className="text-xl font-bold text-primary-600 flex items-center gap-2">
          <FaRobot className="text-primary-500" />
          Robotic Platform
        </h2>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50 text-black">
        {/* Sidebar */}
        <aside
          className={`w-full lg:w-64 bg-white shadow-md border-r border-gray-200 transition-all duration-300 z-30
      ${
        isMobileMenuOpen ? "fixed inset-0 overflow-auto" : "hidden"
      } lg:relative lg:block
      h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300`}
          style={{
            position: isMobileMenuOpen ? "fixed" : "sticky",
            top: 0,
            height: "100vh",
            overflowY: "auto",
          }}
        >
          <div className="sticky top-0 bg-white z-10">
            <div className="p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-primary-600 flex items-center gap-2">
                <FaRobot className="text-primary-500" />
                Robotic Platform
              </h2>
              <button
                className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="px-4 pb-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
                <svg
                  className="w-4 h-4 text-gray-400 absolute left-3 top-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
          <nav className="mt-2 px-2 pb-16">
            {menuSections.map((section) => (
              <div key={section.title} className="mb-4">
                <h5 className="text-xs uppercase text-gray-500 font-medium mb-2">
                  {section.title}
                </h5>
                {section.items.map((item) => (
                  <div key={item.key}>
                    {item.subItems ? (
                      <>
                        <div
                          className={`flex items-center justify-between px-4 py-3 cursor-pointer rounded-lg transition-all mb-1 ${
                            selectedMenu === item.key ||
                            (item.subItems &&
                              item.subItems.some(
                                (sub) => sub.key === selectedMenu
                              ))
                              ? "bg-blue-50 text-blue-600 font-semibold"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                          onClick={() => toggleMenuExpansion("devices")}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-lg ${
                                selectedMenu === item.key ||
                                (item.subItems &&
                                  item.subItems.some(
                                    (sub) => sub.key === selectedMenu
                                  ))
                                  ? "text-blue-500"
                                  : "text-gray-500"
                              }`}
                            >
                              {item.icon}
                            </span>
                            <span>{item.label}</span>
                          </div>
                          <span>
                            {menuExpanded.devices ? (
                              <HiOutlineChevronDown className="text-gray-500" />
                            ) : (
                              <HiOutlineChevronRight className="text-gray-500" />
                            )}
                          </span>
                        </div>
                        <AnimatePresence>
                          {menuExpanded.devices && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              {item.subItems.map((subItem) => (
                                <div
                                  key={subItem.key}
                                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer rounded-lg transition-all ml-6 text-sm mb-1 ${
                                    selectedMenu === subItem.key
                                      ? "bg-blue-50 text-blue-600 font-medium"
                                      : "text-gray-600 hover:bg-gray-100"
                                  }`}
                                  onClick={() => {
                                    setSelectedMenu(subItem.key);
                                    setIsMobileMenuOpen(false);
                                  }}
                                >
                                  <span
                                    className={`text-base ${
                                      selectedMenu === subItem.key
                                        ? "text-blue-500"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {subItem.icon}
                                  </span>
                                  <span>{subItem.label}</span>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    ) : (
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer rounded-lg transition-all mb-1 ${
                            selectedMenu === item.key
                              ? "bg-blue-50 text-blue-600 font-semibold"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                          onClick={() => {
                            setSelectedMenu(item.key);
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          <span
                            className={`text-lg ${
                              selectedMenu === item.key
                                ? "text-blue-500"
                                : "text-gray-500"
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            ))}
            {/* Bottom section - device stats */}
            <div className="mt-8 px-4">
              <h5 className="text-xs uppercase text-gray-500 font-medium mb-2">
                Device Stats
              </h5>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600">Active</span>
                  <span className="text-xs font-medium text-gray-800">
                    {devices.filter((d) => d.status === "Connected").length} /{" "}
                    {devices.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                  <div
                    className="h-1.5 rounded-full bg-green-500"
                    style={{
                      width: `${
                        (devices.filter((d) => d.status === "Connected")
                          .length /
                          devices.length) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600">Playlists</span>
                  <span className="text-xs font-medium text-gray-800">
                    {playlists.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-blue-500"
                    style={{
                      width: `${Math.min(playlists.length / 10, 1) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
            {/* User profile section */}
            <div className="mt-8 px-4">
              <button
                onClick={handleLogout}
                className="w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition"
              >
                Logout
              </button>
            </div>
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto h-screen scrollbar-thin scrollbar-thumb-gray-300">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedMenu}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Modals */}

        <AnimatePresence>
          {showPlaylistModal && (
            <AddPlaylistModal
              onClose={() => setShowPlaylistModal(false)}
              onSave={addNewPlaylist}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
