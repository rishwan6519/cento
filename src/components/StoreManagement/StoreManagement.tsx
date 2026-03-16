"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaStore,
  FaPlus,
  FaTrash,
  FaArrowLeft,
  FaPlug,
  FaBullhorn,
  FaMapMarkerAlt,
  FaUser,
  FaTimes,
  FaImage,
} from "react-icons/fa";
import { MdDevices } from "react-icons/md";
import { BsMusicNoteList } from "react-icons/bs";
import { FiLink2 } from "react-icons/fi";
import toast from "react-hot-toast";

// ---- Types ----
interface User {
  _id: string;
  username: string;
  role: string;
  controllerId: string;
  createdAt: string;
  storeName?: string;
  storeLocation?: string;
}

interface DeviceInfo {
  _id: string;
  name: string;
  serialNumber: string;
  typeId: string;
  imageUrl?: string;
  color: string;
  status: string;
}

interface ConnectedDevice {
  _id: string;
  deviceId: DeviceInfo;
  userId: string;
  assignedAt: string;
  assignedBy: string;
}

interface AvailableDevice {
  _id: string;
  deviceId: DeviceInfo;
  typeId: string;
  userId: string;
}

// ---- Helper: get device icon ----
function getDeviceIcon(name: string, imageUrl?: string) {
  return imageUrl || "/placeholder.jpg";
}

// ---- Props ----
interface StoreManagementProps {
  onNavigate: (menu: string) => void;
}

// ==== MANAGE CONTENT MODAL ====
const ManageContentModal = ({
  isOpen,
  onClose,
  device,
  userId,
}: {
  isOpen: boolean;
  onClose: () => void;
  device: ConnectedDevice | null;
  userId: string;
}) => {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [sliders, setSliders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && device) {
      fetchContent();
    }
  }, [isOpen, device]);

  const fetchContent = async () => {
    if (!device) return;
    setLoading(true);
    try {
      // 1. Fetch Playlists
      const plRes = await fetch(`/api/device-playlists?userId=${userId}`);
      if (plRes.ok) {
        const plData = await plRes.json();
        const connectedPlaylists = plData.filter((pl: any) => 
          pl.deviceIds && pl.deviceIds.includes(device.deviceId._id)
        );
        setPlaylists(connectedPlaylists);
      }

      // 2. Fetch Announcements
      const annRes = await fetch(`/api/announcement/playlist?userId=${userId}`);
      const connAnnRes = await fetch(`/api/announcement/device-announcement?deviceId=${device.deviceId._id}`);
      if (annRes.ok && connAnnRes.ok) {
        const annData = await annRes.json();
        const connAnnData = await connAnnRes.json();
        
        const connectedIds = connAnnData.announcementPlaylistIds || [];
        const connectedAnns = (annData.playlists || []).filter((a: any) => 
          connectedIds.includes(a._id)
        );
        setAnnouncements(connectedAnns);
      }

      // 3. Fetch Sliders
      const sliderRes = await fetch(`/api/sliders`);
      const assignedRes = await fetch(`/api/assign-slider?deviceId=${device.deviceId._id}`);
      if (sliderRes.ok && assignedRes.ok) {
        const sliderData = await sliderRes.json();
        const assignedData = await assignedRes.json();
        // Assuming assign-slider returns an array of assignments
        const assignedIds = (assignedData.data || []).map((a: any) => a.sliderId);
        const connectedSliders = (sliderData.data || []).filter((s: any) => 
          assignedIds.includes(s._id)
        );
        setSliders(connectedSliders);
      }
    } catch (err) {
      toast.error("Failed to fetch device content");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkPlaylist = async (playlistId: string) => {
    if (!device) return;
    try {
      const res = await fetch(`/api/device-playlists?deviceId=${device.deviceId._id}&playlistId=${playlistId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success("Playlist unlinked");
        fetchContent(); // Refresh
      } else throw new Error();
    } catch {
      toast.error("Failed to unlink playlist");
    }
  };

  const handleUnlinkAnnouncement = async (annId: string) => {
    if (!device) return;
    try {
      const res = await fetch(`/api/announcement/device-announcement?deviceId=${device.deviceId._id}&announcementPlaylistId=${annId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success("Announcement unlinked");
        fetchContent(); // Refresh
      } else throw new Error();
    } catch {
      toast.error("Failed to unlink announcement");
    }
  };

  const handleUnlinkSlider = async (sliderId: string) => {
    if (!device) return;
    try {
      const res = await fetch(`/api/assign-slider?deviceId=${device.deviceId._id}&sliderId=${sliderId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success("Slider unlinked");
        fetchContent(); // Refresh
      } else throw new Error();
    } catch {
      toast.error("Failed to unlink slider");
    }
  };

  if (!isOpen || !device) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BsMusicNoteList className="text-indigo-600" />
              Manage Content
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Connected to <span className="font-semibold">{device.deviceId.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
            <FaTimes size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
          {loading ? (
             <div className="flex justify-center py-12">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
             </div>
          ) : (
            <div className="space-y-8">
              {/* Playlists Section */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FaPlug className="text-emerald-500" /> Connected Playlists
                </h3>
                {playlists.length === 0 ? (
                  <div className="text-center py-6 bg-white rounded-xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400">No playlists connected</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {playlists.map(pl => (
                      <div key={pl.playlistData._id} className="flex flex-col bg-white p-4 rounded-xl border border-gray-100 shadow-sm gap-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{pl.playlistData.name || "Unnamed Playlist"}</p>
                            <p className="text-xs text-gray-500 max-w-[200px] truncate">{pl.playlistData._id}</p>
                          </div>
                          <button 
                            onClick={() => handleUnlinkPlaylist(pl.playlistData._id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <FiLink2 className="rotate-45" /> Unlink
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sliders Section */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FaBullhorn className="text-indigo-500" /> Connected Sliders
                </h3>
                {sliders.length === 0 ? (
                  <div className="text-center py-6 bg-white rounded-xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400">No sliders connected</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sliders.map(s => (
                      <div key={s._id} className="flex flex-col bg-white p-4 rounded-xl border border-gray-100 shadow-sm gap-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{s.sliderName}</p>
                            <p className="text-xs text-gray-500">{s.sliders.length} Images</p>
                          </div>
                          <button 
                            onClick={() => handleUnlinkSlider(s._id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <FiLink2 className="rotate-45" /> Unlink
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Announcements Section */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FaBullhorn className="text-orange-500" /> Connected Announcements
                </h3>
                {announcements.length === 0 ? (
                  <div className="text-center py-6 bg-white rounded-xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400">No announcements connected</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {announcements.map(ann => (
                      <div key={ann._id} className="flex flex-col bg-white p-4 rounded-xl border border-gray-100 shadow-sm gap-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{ann.name || "Unnamed Announcement"}</p>
                            <p className="text-xs text-gray-500 max-w-[200px] truncate">{ann._id}</p>
                          </div>
                          <button 
                            onClick={() => handleUnlinkAnnouncement(ann._id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <FiLink2 className="rotate-45" /> Unlink
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ===================================================
// MAIN COMPONENT
// ===================================================
const StoreManagement: React.FC<StoreManagementProps> = ({ onNavigate }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);

  // Modals
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<AvailableDevice[]>([]);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [assigningDeviceId, setAssigningDeviceId] = useState<string | null>(null);

  // Content Modal
  const [showContentModal, setShowContentModal] = useState(false);
  const [managingDevice, setManagingDevice] = useState<ConnectedDevice | null>(null);

  const controllerId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  // Fetch users/stores
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/user?controllerId=${controllerId}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.data?.filter((u: User) => u.role === "user") || []);
    } catch {
      toast.error("Failed to load stores");
    } finally {
      setLoading(false);
    }
  };

  // Fetch connected devices for selected user
  const fetchConnectedDevices = async (userId: string) => {
    try {
      setDevicesLoading(true);
      const res = await fetch(`/api/assign-device?userId=${userId}`);
      if (!res.ok) throw new Error("Failed to fetch devices");
      const data = await res.json();
      setConnectedDevices(data.data || []);
    } catch {
      toast.error("Failed to load devices");
      setConnectedDevices([]);
    } finally {
      setDevicesLoading(false);
    }
  };

  // Open store detail
  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    fetchConnectedDevices(user._id);
  };

  // Back to stores
  const handleBack = () => {
    setSelectedUser(null);
    setConnectedDevices([]);
  };

  // Disconnect/remove device from user
  const handleRemoveDevice = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to remove this device from the store?")) return;
    try {
      const res = await fetch(`/api/assign-device?userId=${assignmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Device removed from store");
      if (selectedUser) fetchConnectedDevices(selectedUser._id);
    } catch {
      toast.error("Failed to remove device");
    }
  };

  // Open onboard modal
  const handleOpenOnboard = async () => {
    setShowOnboardModal(true);
    setAvailableLoading(true);
    try {
      const res = await fetch(`/api/available-devices?id=${controllerId}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAvailableDevices(data.data || []);
    } catch {
      toast.error("Failed to load available devices");
    } finally {
      setAvailableLoading(false);
    }
  };

  // Assign device to selected user
  const handleAssignDevice = async (device: AvailableDevice) => {
    if (!selectedUser) return;
    try {
      setAssigningDeviceId(device._id);
      const res = await fetch("/api/assign-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser._id,
          deviceId: device.deviceId._id,
          assignedBy: controllerId,
          status: "active",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.success) {
        toast.success("Device assigned to store!");
        setShowOnboardModal(false);
        // Refresh global data and navigate to All Devices section
        if ((window as any).refreshPlatformData) (window as any).refreshPlatformData();
        onNavigate("dashboard");
      } else {
        throw new Error(data.message || "Assignment failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to assign device");
    } finally {
      setAssigningDeviceId(null);
    }
  };

  // ===== RENDER =====
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // ---- STORE DETAIL VIEW ----
  if (selectedUser) {
    return (
      <div className="space-y-6">
        {/* Back + Store Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <FaArrowLeft className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedUser.storeName || selectedUser.username}
            </h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              {selectedUser.storeLocation && (
                <span className="flex items-center gap-1">
                  <FaMapMarkerAlt className="text-red-400" />
                  {selectedUser.storeLocation}
                </span>
              )}
              <span className="flex items-center gap-1">
                <FaUser className="text-blue-400" />
                {selectedUser.username}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Connected Devices</p>
            <p className="text-3xl font-bold text-gray-900">{connectedDevices.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Active</p>
            <p className="text-3xl font-bold text-green-600">
              {connectedDevices.filter((d) => d.deviceId?.status === "active").length}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Inactive</p>
            <p className="text-3xl font-bold text-red-500">
              {connectedDevices.filter((d) => d.deviceId?.status !== "active").length}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleOpenOnboard}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
          >
            <FaPlus /> Assign Device
          </button>
          <button
            onClick={() => onNavigate("connectPlaylist")}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200"
          >
            <FaPlug /> Connect Playlist
          </button>
          <button
            onClick={() => onNavigate("setupAnnouncement")}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors shadow-md shadow-orange-200"
          >
            <FaBullhorn /> Announcement
          </button>
          <button
            onClick={() => onNavigate("assignSlider")}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl font-semibold text-sm hover:bg-purple-700 transition-colors shadow-md shadow-purple-200"
          >
            <FaImage /> Slider
          </button>
        </div>

        {/* Connected Devices Grid */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Connected Devices</h3>
          {devicesLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            </div>
          ) : connectedDevices.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
              <MdDevices className="mx-auto text-4xl text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No devices connected to this store yet.</p>
              <button
                onClick={handleOpenOnboard}
                className="mt-4 px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                Assign First Device
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {connectedDevices.map((device) => (
                <motion.div
                  key={device._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group"
                >
                  {/* Device Image */}
                  <div className="h-36 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
                    <img
                      src={getDeviceIcon(device.deviceId?.name, device.deviceId?.imageUrl)}
                      alt={device.deviceId?.name}
                      className="h-16 w-16 object-contain rounded-full"
                    />
                    <span
                      className={`absolute top-3 right-3 w-3 h-3 rounded-full border-2 border-white ${
                        device.deviceId?.status === "active" ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                  </div>

                  {/* Device Info */}
                  <div className="p-4">
                    <h4 className="font-bold text-gray-900 text-lg truncate">
                      {device.deviceId?.name || "Unknown Device"}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      SN: {device.deviceId?.serialNumber}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          device.deviceId?.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {device.deviceId?.status === "active" ? "Active" : "Inactive"}
                      </span>
                      <span className="text-xs text-gray-400">
                        Since {new Date(device.assignedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Device Actions */}
                    <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setManagingDevice(device);
                          setShowContentModal(true);
                        }}
                        className="flex-1 text-center py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        View Content
                      </button>
                      <button
                        onClick={() => onNavigate("setupAnnouncement")}
                        className="flex-1 text-center py-2 text-xs font-semibold text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                      >
                        Announce
                      </button>
                      <button
                        onClick={() => handleRemoveDevice(device._id)}
                        className="px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Onboard/Assign Device Modal */}
        <AnimatePresence>
          {showOnboardModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
              >
                {/* Modal Header */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Assign Device</h2>
                    <p className="text-sm text-gray-500">
                      Assign a device to{" "}
                      <span className="font-semibold text-indigo-600">
                        {selectedUser.storeName || selectedUser.username}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => setShowOnboardModal(false)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <FaTimes size={18} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1">
                  {availableLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
                    </div>
                  ) : availableDevices.length === 0 ? (
                    <div className="text-center py-12">
                      <MdDevices className="mx-auto text-4xl text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">No available devices to assign.</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Onboard new devices first from Device Management.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {availableDevices.map((device) => (
                        <div
                          key={device._id}
                          className="border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                              <img
                                src={getDeviceIcon(device.deviceId?.name, device.deviceId?.imageUrl)}
                                alt={device.deviceId?.name}
                                className="w-8 h-8 object-contain rounded-full"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-900 truncate">
                                {device.deviceId?.name}
                              </h4>
                              <p className="text-xs text-gray-500">
                                SN: {device.deviceId?.serialNumber}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAssignDevice(device)}
                            disabled={assigningDeviceId === device._id}
                            className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {assigningDeviceId === device._id ? "Assigning..." : "Assign to Store"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Manage Content Modal */}
        <ManageContentModal 
          isOpen={showContentModal}
          onClose={() => setShowContentModal(false)}
          device={managingDevice}
          userId={selectedUser._id}
        />
      </div>
    );
  }

  // ---- STORES GRID VIEW ----
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Stores</h3>
          <p className="text-gray-500">Select a store to manage its devices and content</p>
        </div>
        <button
          onClick={() => onNavigate("createUser")}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
        >
          <FaPlus /> Create New Store
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Total Stores</p>
          <p className="text-3xl font-bold text-gray-900">{users.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">With Locations</p>
          <p className="text-3xl font-bold text-emerald-600">
            {users.filter((u) => u.storeLocation).length}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Without Location</p>
          <p className="text-3xl font-bold text-amber-500">
            {users.filter((u) => !u.storeLocation).length}
          </p>
        </div>
      </div>

      {/* Store Cards Grid */}
      {users.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
          <FaStore className="mx-auto text-5xl text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium text-lg">No stores created yet.</p>
          <p className="text-sm text-gray-400 mt-1">Create your first store to get started.</p>
          <button
            onClick={() => onNavigate("createUser")}
            className="mt-5 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors"
          >
            Create Store
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {users.map((user, index) => (
            <motion.div
              key={user._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleSelectUser(user)}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
            >
              {/* Store Header Gradient */}
              <div className="h-28 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 relative flex items-center justify-center">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <FaStore className="text-white text-2xl" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
              </div>

              {/* Store Info */}
              <div className="p-4 -mt-2 relative">
                <h4 className="font-bold text-gray-900 text-lg truncate">
                  {user.storeName || user.username}
                </h4>
                <p className="text-sm text-gray-500 truncate mt-0.5">@{user.username}</p>

                {user.storeLocation && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                    <FaMapMarkerAlt className="text-red-400 flex-shrink-0" />
                    <span className="truncate">{user.storeLocation}</span>
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                    Manage →
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StoreManagement;
