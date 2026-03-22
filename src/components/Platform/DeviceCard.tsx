"use client";
import React, { useEffect, useState } from "react";
import Button from "./Button";
import Card from "./Card";
import { motion, AnimatePresence } from "framer-motion";
import { BsMusicNoteList } from "react-icons/bs";
import { IoMdTrash } from "react-icons/io";
import { MdAddCircleOutline } from "react-icons/md";
import { FiEdit2, FiCheck, FiX } from "react-icons/fi"; // Add edit icons
import toast from "react-hot-toast";

// RemoveDeviceModal component
const RemoveDeviceModal = ({
  isOpen,
  onClose,
  onConfirm,
  deviceName,
  assignedStores = [],
  isCheckingAssignments = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deviceName: string;
  assignedStores?: string[];
  isCheckingAssignments?: boolean;
}) => {
  if (!isOpen) return null;

  const hasAssignments = assignedStores.length > 0;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 transform transition-all">
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${hasAssignments ? 'bg-amber-50' : 'bg-red-50'}`}>
            {isCheckingAssignments ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : hasAssignments ? (
              <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.27 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            ) : (
              <IoMdTrash className="text-red-500 text-2xl" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {hasAssignments ? 'Warning: Device in Use' : 'Remove Device'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {isCheckingAssignments ? 'Checking assignments...' : (
                <>Remove <span className="font-semibold text-gray-700">{deviceName}</span>?</>
              )}
            </p>
          </div>
        </div>

        {isCheckingAssignments ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {hasAssignments && (
              <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <p className="text-amber-800 text-sm font-semibold mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                  </svg>
                  This device is connected to {assignedStores.length} store{assignedStores.length > 1 ? 's' : ''}:
                </p>
                <div className="space-y-1.5 ml-6">
                  {assignedStores.map((store, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-amber-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span className="font-medium capitalize">{store}</span>
                    </div>
                  ))}
                </div>
                <p className="text-amber-700 text-xs mt-3 leading-relaxed">
                  Removing this device will also disconnect it from all connected stores. The device will still be available at the admin level.
                </p>
              </div>
            )}

            <p className="text-gray-600/90 text-sm mb-8 leading-relaxed">
              {hasAssignments 
                ? 'Are you sure you want to proceed? This will remove the device from your dashboard and disconnect it from all store-level users.'
                : 'This action will remove the device from your dashboard. The device will still be available at the admin level for re-onboarding.'
              }
            </p>

            <div className="flex justify-end gap-3">
              <button 
                onClick={onClose} 
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-all active:scale-95 ${
                  hasAssignments 
                    ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' 
                    : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                }`}
              >
                {hasAssignments ? 'Proceed & Remove' : 'Yes, Remove'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// EditDeviceModal component
const EditDeviceModal = ({
  isOpen,
  onClose,
  onSave,
  initialName,
  initialImageUrl,
  deviceId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newName: string, newImageUrl: string) => void;
  initialName: string;
  initialImageUrl: string;
  deviceId: string;
}) => {
  const [name, setName] = useState(initialName);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(initialName);
    setImageUrl(initialImageUrl);
  }, [initialName, initialImageUrl, isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      setImageUrl(data.url);
      toast.success("Image uploaded!");
    } catch (err) {
      toast.error("Failed to upload image");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/devices`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deviceId, name, imageUrl }),
      });
      const result = await res.json();
      if (res.ok && result.device) {
        toast.success("Device updated!");
        onSave(name, imageUrl);
      } else {
        toast.error(result.message || "Failed to update");
      }
    } catch {
      toast.error("Failed to update device");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-white/20 relative overflow-hidden"
        >
          {/* Decorative background blur */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors z-10"
          >
            <FiX size={20} />
          </button>

          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center flex-shrink-0 border border-indigo-100/50">
              <FiEdit2 className="text-indigo-600 text-xl" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Edit Device</h3>
              <p className="text-sm text-gray-500 mt-0.5">Update configuration details</p>
            </div>
          </div>
          
          <div className="space-y-6 relative z-10">
            {/* Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Device Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                  placeholder="Enter device name"
                />
              </div>
            </div>

            {/* Image URL Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Image URL</label>
              <div className="relative">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 py-2">
              <div className="h-px bg-gray-200 flex-1" />
              <span className="text-xs font-semibold text-gray-400 uppercase">OR</span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>

            {/* File Upload */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Upload New Image</label>
              <div className="relative group cursor-pointer">
                 <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-full px-4 py-4 border-2 border-dashed border-gray-200 group-hover:border-indigo-400 bg-gray-50/50 group-hover:bg-indigo-50/50 rounded-xl transition-all flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-indigo-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-600 group-hover:text-indigo-600">Click to browse or drag & drop</span>
                  <span className="text-xs text-gray-400">PNG, JPG up to 5MB</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-10 relative z-10">
            <button 
              onClick={onClose} 
              disabled={loading} 
              className="px-6 py-3 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              disabled={loading} 
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-70"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <FiCheck size={16} />
              )}
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};

interface DeviceCardProps {
  device: {
    _id: string;
    deviceId: {
      _id: string;
      name: string;
      serialNumber: string;
      imageUrl: string;
      status: string;
    };
    typeId: {
      _id: string;
      name: string;
    };
    userId: {
      _id: string;
    };
    connectedPlaylists?: Array<{
      id: string;
      name: string;
      status: string;
      files?: any[];
      type?: 'regular' | 'announcement';
    }>;
    createdAt: string;
    updatedAt: string;
    __v: number;
  };
  deviceStatuses?: Record<string, { status: string; lastSync: string }>;
  onEdit: (device: any) => void;
  onManagePlaylists?: (device: any) => void;
  onRemoveDevice?: (deviceId: string) => void;
  onUnlinkPlaylist?: (deviceId: string, playlistId: string, type: 'regular' | 'announcement') => void;
}

const NoDeviceCard = ({ onboardDevice }: { onboardDevice: () => void }) => {
  return (
    <Card className="flex flex-col h-full justify-center items-center py-8">
      <div className="text-gray-400 text-6xl mb-4">
        <MdAddCircleOutline />
      </div>
      <h4 className="font-semibold text-gray-900 mb-2">No Devices Available</h4>
      <p className="text-gray-500 text-sm text-center mb-4">
        Get started by onboarding a new device
      </p>
      <Button
        variant="primary"
        onClick={onboardDevice}
        className="text-sm"
        icon={<MdAddCircleOutline />}
      >
        Onboard New Device
      </Button>
    </Card>
  );
};

const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  deviceStatuses = {},
  onEdit,
  onManagePlaylists,
  onRemoveDevice,
  onUnlinkPlaylist,
}) => {
  if (!device) {
    return <NoDeviceCard onboardDevice={() => onEdit(null)} />;
  }

  const [showPlaylists, setShowPlaylists] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [assignedStores, setAssignedStores] = useState<string[]>([]);
  const [isCheckingAssignments, setIsCheckingAssignments] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);

  const { deviceId, typeId, connectedPlaylists } = device;
  const anyDevice = device as any;
  const anyDeviceId = anyDevice.deviceId || {};
  const safeDeviceId = anyDeviceId;
  const safeTypeId = anyDevice.typeId || anyDeviceId.typeId || {};

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("userRole");
      setUserRole(role);
    }
  }, []);

  const isValidImageUrl = (url?: string) => {
    return url && url.trim() !== "" && !url.includes("undefined");
  };

  const handleOpenRemoveModal = async () => {
    setShowRemoveModal(true);
    setIsCheckingAssignments(true);
    setAssignedStores([]);
    try {
      const res = await fetch(`/api/onboarded-devices?deviceId=${device._id}&checkOnly=true`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success && data.hasAssignments) {
        setAssignedStores(data.assignedStores || []);
      }
    } catch (err) {
      console.error("Error checking assignments:", err);
    } finally {
      setIsCheckingAssignments(false);
    }
  };

  const handleRemoveDevice = () => {
    if (onRemoveDevice) {
      onRemoveDevice(device._id);
      setShowRemoveModal(false);
      setAssignedStores([]);
    }
  };

  const handleSaveEdit = (newName: string, newImageUrl: string) => {
    setShowEditModal(false);
    if (onEdit) {
      onEdit({ 
        ...device, 
        deviceId: {
          ...device.deviceId,
          name: newName,
          imageUrl: newImageUrl
        } 
      });
    }
  };

  return (
    <>
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full relative"
    >
      {/* Top Section */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm relative overflow-hidden">
          {isValidImageUrl(safeDeviceId.imageUrl) ? (
            <img
              src={safeDeviceId.imageUrl}
              alt={`Device ${safeDeviceId.name || 'Unknown'}`}
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-2xl">📷</span>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-2">
           {/* Status Badge */}
           <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            (deviceStatuses[safeDeviceId.serialNumber]?.status === "online") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}>
             <span className={`w-2 h-2 rounded-full ${(deviceStatuses[safeDeviceId.serialNumber]?.status === "online") ? "bg-emerald-500" : "bg-red-500"}`} />
             {(deviceStatuses[safeDeviceId.serialNumber]?.status === "online") ? "Online" : "Offline"}
           </div>

           {/* SuperUser Edit floaty button - now inline next to status */}
          {userRole === "superUser" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowEditModal(true);
              }}
              className="text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold uppercase tracking-wider"
              title="Edit Device Details"
            >
              <FiEdit2 size={12} /> Edit
            </button>
          )}
        </div>
      </div>

      {/* Main content body */}
      <div className="flex-grow flex flex-col mb-4">
        <h4 className="font-extrabold text-gray-900 text-xl tracking-tight mb-1 truncate">{safeDeviceId.name || "Unknown Device"}</h4>
        <div className="flex items-center text-xs text-gray-500 font-medium tracking-wide gap-2">
           <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md uppercase">{safeTypeId.name || "Unknown Type"}</span>
           <span>S/N: {safeDeviceId.serialNumber || "N/A"}</span>
        </div>
      </div>
      
      <div className="w-full bg-gray-100/80 h-px mb-4" />

      {/* Playlists Toggle Area */}
      {showPlaylists ? (
        <div className="mb-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Connected Playlists</p>
          <div className="max-h-28 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-gray-200">
            {connectedPlaylists && connectedPlaylists.length > 0 ? (
              connectedPlaylists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="flex flex-col text-xs p-3 bg-indigo-50/50 border border-indigo-100/50 rounded-xl text-indigo-900 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center mr-3 flex-shrink-0">
                        <BsMusicNoteList size={10} />
                      </div>
                      <span className="font-semibold truncate pr-2">{playlist.name}</span>
                      {playlist.type === 'announcement' && (
                        <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">Announcement</span>
                      )}
                    </div>
                    {onUnlinkPlaylist && (userRole === 'superUser' || userRole === 'user') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Unlink "${playlist.name}" from this device?`)) {
                            onUnlinkPlaylist(safeDeviceId._id || device._id, playlist.id, playlist.type || 'regular');
                          }
                        }}
                        className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-md transition-colors"
                        title="Unlink Playlist"
                      >
                        <FiX size={14} />
                      </button>
                    )}
                  </div>
                  {playlist.files && playlist.files.length > 0 && (
                     <div className="pl-3 mt-1 ml-3 border-l-2 border-indigo-200 py-1 space-y-1">
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Tracks ({playlist.files.length})</p>
                        <div className="max-h-20 overflow-y-auto pr-2 space-y-1 scrollbar-thin scrollbar-thumb-indigo-200">
                          {playlist.files.map((f, idx) => (
                            <p key={idx} className="text-xs text-slate-600 flex items-center gap-1.5">
                               <span className="w-1 h-1 rounded-full bg-indigo-300"></span>
                               {f.name || "Unnamed File"}
                            </p>
                          ))}
                        </div>
                     </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <BsMusicNoteList className="text-gray-300 text-xl mb-1" />
                <span className="text-gray-400 text-xs text-center font-medium">
                  No playlists connected
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
          <div className="mb-4 space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-600 border-b border-gray-50 pb-2">
              <span className="flex items-center gap-2 font-medium text-gray-500">
                <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-lg"><BsMusicNoteList size={14}/></div> 
                Total Playlists
              </span>
              <span className="font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-xl text-xs">
                  {connectedPlaylists ? connectedPlaylists.length : 0}
              </span>
            </div>
          </div>
      )}

      {/* Superuser Actions */}
      {(userRole === "superUser" || userRole === "user") && (
        <div className="flex items-center justify-between gap-3 mt-auto pt-2">
          <button
            onClick={() => {
              setShowPlaylists(!showPlaylists);
              // Commented out to prevent the entire page switching to the connectedPlaylists view
              // when the user only strictly wants to expand the accordion and see the files here.
              // if (onManagePlaylists) onManagePlaylists(device);
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-xs font-bold rounded-xl transition-all duration-300 shadow-sm"
          >
            <BsMusicNoteList size={14} />
            {showPlaylists ? "Hide Content" : "View Content"}
          </button>
          
          <button
            onClick={handleOpenRemoveModal}
            className="p-2.5 text-gray-400 hover:text-white hover:bg-red-500 bg-gray-50 rounded-xl transition-all duration-300 shadow-sm"
            title="Remove Device"
          >
            <IoMdTrash size={16} />
          </button>
        </div>
      )}

    </motion.div>

    <RemoveDeviceModal
      isOpen={showRemoveModal}
      onClose={() => { setShowRemoveModal(false); setAssignedStores([]); }}
      onConfirm={handleRemoveDevice}
      deviceName={safeDeviceId.name || "Unknown"}
      assignedStores={assignedStores}
      isCheckingAssignments={isCheckingAssignments}
    />
    <EditDeviceModal
      isOpen={showEditModal}
      onClose={() => setShowEditModal(false)}
      onSave={handleSaveEdit}
      initialName={safeDeviceId.name || ""}
      initialImageUrl={safeDeviceId.imageUrl || ""}
      deviceId={safeDeviceId._id || device._id}
    />
    </>
  );
};

export default DeviceCard;
