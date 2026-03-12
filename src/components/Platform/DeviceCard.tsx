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
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deviceName: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-100 transform transition-all">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <IoMdTrash className="text-red-500 text-2xl" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Remove Device</h3>
            <p className="text-sm text-gray-500 mt-1">
              Delete <span className="font-semibold text-gray-700">{deviceName}</span>?
            </p>
          </div>
        </div>
        <p className="text-gray-600/90 text-sm mb-8 leading-relaxed">
          This action will permanently remove the device from your dashboard. It cannot be undone.
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
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/20 transition-all active:scale-95"
          >
            Yes, Remove
          </button>
        </div>
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
    }>;
    createdAt: string;
    updatedAt: string;
    __v: number;
  };
  onEdit: (device: any) => void;
  onManagePlaylists?: (device: any) => void;
  onRemoveDevice?: (deviceId: string) => void;
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
  onEdit,
  onManagePlaylists,
  onRemoveDevice,
}) => {
  if (!device) {
    return <NoDeviceCard onboardDevice={() => onEdit(null)} />;
  }

  const [showPlaylists, setShowPlaylists] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);

  const { deviceId, typeId, connectedPlaylists } = device;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("userRole");
      setUserRole(role);
    }
  }, []);

  const isValidImageUrl = (url?: string) => {
    return url && url.trim() !== "" && !url.includes("undefined");
  };



  const handleRemoveDevice = () => {
    if (onRemoveDevice) {
      onRemoveDevice(device._id);
      setShowRemoveModal(false);
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
          {isValidImageUrl(deviceId.imageUrl) ? (
            <img
              src={deviceId.imageUrl}
              alt={`Device ${deviceId.name}`}
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-2xl">📷</span>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-2">
           {/* Status Badge */}
           <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            deviceId.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}>
             <span className={`w-2 h-2 rounded-full ${deviceId.status === "active" ? "bg-emerald-500" : "bg-red-500"}`} />
             {deviceId.status === "active" ? "Online" : "Offline"}
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
        <h4 className="font-extrabold text-gray-900 text-xl tracking-tight mb-1 truncate">{deviceId.name}</h4>
        <div className="flex items-center text-xs text-gray-500 font-medium tracking-wide gap-2">
           <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md uppercase">{typeId.name}</span>
           <span>S/N: {deviceId.serialNumber}</span>
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
                  <div className="flex items-center mb-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center mr-3 flex-shrink-0">
                      <BsMusicNoteList size={10} />
                    </div>
                    <span className="font-semibold truncate pr-2">{playlist.name}</span>
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
      {userRole === "superUser" && (
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
            onClick={() => setShowRemoveModal(true)}
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
      onClose={() => setShowRemoveModal(false)}
      onConfirm={handleRemoveDevice}
      deviceName={deviceId.name}
    />
    <EditDeviceModal
      isOpen={showEditModal}
      onClose={() => setShowEditModal(false)}
      onSave={handleSaveEdit}
      initialName={deviceId.name}
      initialImageUrl={deviceId.imageUrl || ""}
      deviceId={deviceId._id}
    />
    </>
  );
};

export default DeviceCard;
