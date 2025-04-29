"use client";
import React, { useState, useEffect } from "react";

import Button from "@/components/Platform/Button";
import Card from "@/components/Platform/Card";
import DashboardView from "@/components/Platform/views/DashboardView";
import ManageDevicesView from "@/components/Platform/views/ManageDevicesView";
import ConnectedPlaylistsView from "@/components/Platform/modals/ConnectedPlaylistsView";
import OnboardDeviceModal from "@/components/Platform/modals/OnboardDeviceModal";
import AddPlaylistModal from "@/components/Platform/modals/AddPlaylistModal";
import { HiOutlineChevronDown, HiOutlineChevronRight } from "react-icons/hi";
import { dummyDevices, dummyPlaylists } from "@/components/Platform/DummyData";


import { AnimatePresence, motion } from "framer-motion";

import {
  FaRobot,
  FaPlus,
  FaRegFileAudio,
  FaListAlt,
  FaPlug,
  FaMobileAlt,
  FaTachometerAlt,
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
} from "@/components/Platform/types";
import PlaylistSetup from "@/components/PlaylistSetup/PlaylistSetup";
import { MdOutlinePlaylistPlay } from "react-icons/md";
import CreateMedia from "@/components/CreateMedia/createMedia";

export default function RoboticPlatform(): React.ReactElement {
  const [selectedMenu, setSelectedMenu] = useState<MenuKey>("dashboard");
  const [devices, setDevices] = useState<Device[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>(dummyPlaylists);
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
    const fetchDevices = async () => {
      try {
        setIsLoading(true);
        const userId = localStorage.getItem("userId");
        if (!userId) {
          throw new Error("User ID not found in localStorage");
        }

        const response = await fetch(`/api/onboarded-devices?userId=${userId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch devices");
        }

        const data = await response.json();
        if (data.success) {
          const devicesArray = Array.isArray(data.data) ? data.data : [data.data];
          console.log(devicesArray, "devicesArray");
          setDevices(devicesArray.map(device => ({
            ...device,
            batteryLevel: "100%",
            location: "Not specified",
            lastActive: new Date(device.updatedAt).toLocaleString(),
            status: device.status === "active" ? "Connected" : "Disconnected"

          })));
          
        } else {
          throw new Error(data.message || "Failed to fetch devices");
        }
      } catch (err) {
        console.error("Error fetching devices:", err);
        setError(err.message || "Failed to load devices");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDevices();
  }, []);

  const devicesWithPlaylistInfo = devices.map((device) => ({
    ...device,
    connectedPlaylists: playlists.filter((p) =>
      p.deviceIds.includes(device._id)
    ),
  }));

  const menuItems = [
    { key: "dashboard", label: "Dashboard", icon: <RiDashboardLine /> },
    { key: "createMedia", label: "Create Media", icon: <FaRegFileAudio /> },
    { key: "setupPlaylist", label: "Setup Playlist", icon: <FaListAlt /> },
    {
      key: "show Playlist",
      label: "Show Playlist",
      icon: <MdOutlinePlaylistPlay />,
    },
    { key: "connectPlaylist", label: "Connect Playlist", icon: <FaPlug /> },
    {
      key: "onboardDevice",
      label: "Manage Devices",
      icon: <FaMobileAlt />,
      subItems: [
        {
          key: "onboardDevice",
          label: "All Devices",
          icon: <FaTachometerAlt />,
        },
        {
          key: "connectedPlaylists",
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
      setError(err.message || "Failed to add device");
    }
  };

  const addNewPlaylist = (name: string): void => {
    const newPlaylist: Playlist = {
      id: playlists.length + 1,
      name,
      tracks: 0,
      duration: "0 min",
      lastPlayed: "Never",
      deviceIds: [],
    };
    setPlaylists([...playlists, newPlaylist]);
    setShowPlaylistModal(false);
  };

  const connectPlaylist = (playlistId: number, deviceId: string): void => {
    setPlaylists(
      playlists.map((playlist) =>
        playlist.id === playlistId
          ? { ...playlist, deviceIds: [...playlist.deviceIds, deviceId] }
          : playlist
      )
    );
  };

  const handleEditDevice = async (device: Device): Promise<void> => {
    try {
      const newStatus = device.status === "Connected" ? "Disconnected" : "Connected";
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
      setError(err.message || "Failed to update device");
    }
  };

  const handleManagePlaylists = (device: Device): void => {
    setSelectedDevice(device);
    setSelectedMenu("connectedPlaylists");
  };

  const renderContent = (): React.ReactElement => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading devices...</p>
        </div>
      );
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
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Error</h3>
          <p className="text-gray-500 max-w-md mb-6">{error}</p>
          <Button
            variant="secondary"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </Card>
      );
    }

    switch (selectedMenu) {
      case "dashboard":
        return (
          <DashboardView
            devices={devicesWithPlaylistInfo}
            onAddNew={() => setShowOnboardModal(true)}
            onEditDevice={handleEditDevice}
            onManagePlaylists={handleManagePlaylists}
          />
        );
      case "onboardDevice":
        return (
          <ManageDevicesView
            devices={devicesWithPlaylistInfo}
            onAddNew={() => setShowOnboardModal(true)}
            onEditDevice={handleEditDevice}
            onManagePlaylists={handleManagePlaylists}
          />
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
      
      case "show Playlist":
        return <PlaylistManager />;

      case "createMedia":
        return <CreateMedia />;

      case "connectPlaylist":
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

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
      {/* Mobile Menu Button */}
      <div className="lg:hidden p-4 bg-white border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-bold text-primary-600 flex items-center gap-2">
          <FaRobot className="text-primary-500" />
          Robotic Platform
        </h2>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {isMobileMenuOpen ? (
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
          ) : (
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
          )}
        </button>
      </div>
      {/* Sidebar */}
      <aside
        className={`w-full lg:w-64 bg-white shadow-md border-r border-gray-200 lg:block transition-all duration-300 z-20 ${
          isMobileMenuOpen ? "fixed inset-0 overflow-auto" : "hidden"
        } lg:relative`}
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
          {menuItems.map((item) => (
            <div key={item.key}>
              {item.subItems ? (
                <>
                  <div
                    className={`flex items-center justify-between px-4 py-3 cursor-pointer rounded-lg transition-all mb-1 ${
                      selectedMenu === item.key ||
                      (item.subItems &&
                        item.subItems.some((sub) => sub.key === selectedMenu))
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
                      (devices.filter((d) => d.status === "Connected").length /
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
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div className="flex-grow">
                <p className="text-sm font-medium text-gray-800">Admin User</p>
                <p className="text-xs text-gray-500">
                  admin@roboticplatform.com
                </p>
              </div>
              <button className="p-1.5 rounded-lg hover:bg-gray-100">
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </nav>
      </aside>
      {/* Content */}
      <main className="flex-1 p-4 md:p-6 overflow-auto">
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
        {showOnboardModal && (
          <OnboardDeviceModal
            onClose={() => setShowOnboardModal(false)}
            onSave={addNewDevice}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showPlaylistModal && (
          <AddPlaylistModal
            onClose={() => setShowPlaylistModal(false)}
            onSave={addNewPlaylist}
          />  
        )}
      </AnimatePresence>
    </div>
  );
}