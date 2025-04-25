"use client";

import { ReactElement, useState } from "react";
import { FaRegFileAudio, FaListAlt, FaPlug, FaMobileAlt, FaPlus, FaRobot, FaEdit, FaEllipsisV, FaTachometerAlt } from "react-icons/fa";
import { IoMdSettings } from "react-icons/io";
import { RiDashboardLine } from "react-icons/ri";
import { BsMusicNoteList, BsCollectionPlay } from "react-icons/bs";
import { HiOutlineChevronDown, HiOutlineChevronRight } from "react-icons/hi";
import { MdPlaylistAdd, MdOutlineDataSaverOn } from "react-icons/md";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import PlaylistManager from "@/components/ShowPlaylist/showPlaylist";

// Types
type DeviceStatus = "Connected" | "Disconnected" | "Offline";
type ButtonVariant = "primary" | "secondary" | "success" | "danger";
type MenuKey = "dashboard" | "createMedia" | "setupPlaylist" | "connectPlaylist" | "onboardDevice" | "connectedPlaylists";

interface Device {
  id: number;
  name: string;
  type: string;
  color: string;
  image: string;
  status: DeviceStatus;
  lastActive: string;
  batteryLevel: string;
  location?: string;
  connectedPlaylists?: Playlist[];
}

interface Playlist {
  id: number;
  name: string;
  tracks: number;
  duration: string;
  lastPlayed: string;
  deviceIds: number[];
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  icon?:  React.ReactNode;
  loading?: boolean;
}

interface DeviceCardProps {
  device: Device;
  onEdit: (device: Device) => void;
  onManagePlaylists?: (device: Device) => void;
}

interface MenuItem {
  key: MenuKey;
  label: string;
  icon:  React.ReactNode;
  subItems?: MenuItem[];
  expanded?: boolean;
}

interface DeviceFormData {
  name: string;
  type: string;
  color: string;
}

// Design Tokens
const colors = {
  primary: {
    500: "#3B82F6",
    600: "#2563EB",
    700: "#1D4ED8",
  },
  secondary: {
    500: "#64748B",
    600: "#475569",
    700: "#334155",
  },
  success: {
    500: "#10B981",
    600: "#059669",
    700: "#047857",
  },
  danger: {
    500: "#EF4444",
    600: "#DC2626",
    700: "#B91C1C",
  },
  background: "#F8FAFC",
  card: "#FFFFFF",
  text: {
    primary: "#1E293B",
    secondary: "#64748B",
  },
};

// Reusable UI Components
const Card: React.FC<CardProps> = ({ children, className = "", hoverEffect = true }) => (
  <motion.div 
    className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all ${className}`}
    whileHover={hoverEffect ? { y: -2, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" } : {}}
  >
    {children}
  </motion.div>
);

const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = "primary", 
  className = "",
  disabled = false,
  type = "button",
  icon,
  loading = false,
}) => {
  const baseClasses = "px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 text-sm";
  const variantClasses = {
    primary: `bg-primary-500 text-white hover:bg-primary-600 disabled:bg-primary-300 ${loading ? "bg-primary-400" : ""}`,
    secondary: `bg-white text-secondary-600 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 disabled:bg-gray-100 disabled:text-gray-400`,
    success: `bg-success-500 text-white hover:bg-success-600 disabled:bg-success-300 ${loading ? "bg-success-400" : ""}`,
    danger: `bg-danger-500 text-white hover:bg-danger-600 disabled:bg-danger-300 ${loading ? "bg-danger-400" : ""}`,
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled || loading}
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
      ) : (
        icon && <span className="text-base">{icon}</span>
      )}
      {children}
    </button>
  );
};

const StatusBadge: React.FC<{ status: DeviceStatus }> = ({ status }) => {
  const statusConfig = {
    Connected: {
      bg: "bg-green-50",
      text: "text-green-700",
      dot: "bg-green-500",
    },
    Disconnected: {
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      dot: "bg-yellow-500",
    },
    Offline: {
      bg: "bg-red-50",
      text: "text-red-700",
      dot: "bg-red-500",
    },
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[status].bg} ${statusConfig[status].text}`}>
      <span className={`w-2 h-2 rounded-full mr-1.5 ${statusConfig[status].dot}`}></span>
      {status}
    </span>
  );
};

const DeviceCard: React.FC<DeviceCardProps> = ({ device, onEdit, onManagePlaylists }) => {
  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-start space-x-4">
        <div className="relative w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
          <Image
            src={device.image}
            alt={device.name}
            width={64}
            height={64}
            className="object-cover"
          />
          <div className="absolute inset-0 border border-gray-100 rounded-xl pointer-events-none"></div>
        </div>
        <div className="flex-grow">
          <div className="flex justify-between items-start">
            <h4 className="font-semibold text-gray-900">{device.name}</h4>
            <StatusBadge status={device.status} />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
            <div>
              <p className="text-gray-500">Type</p>
              <p className="text-gray-800 font-medium">{device.type}</p>
            </div>
            <div>
              <p className="text-gray-500">Color</p>
              <p className="text-gray-800 font-medium capitalize">{device.color}</p>
            </div>
            <div>
              <p className="text-gray-500">Battery</p>
              <p className="text-gray-800 font-medium">{device.batteryLevel}</p>
            </div>
            <div>
              <p className="text-gray-500">Playlists</p>
              <p className="text-gray-800 font-medium">{device.connectedPlaylists?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between">
        <Button 
          variant="secondary" 
          onClick={() => onManagePlaylists && onManagePlaylists(device)} 
          className="text-sm"
          icon={<BsMusicNoteList />}
        >
          Playlists
        </Button>
        <Button 
          variant="secondary" 
          onClick={() => onEdit(device)} 
          className="text-sm"
          icon={<IoMdSettings />}
        >
          Manage
        </Button>
      </div>
    </Card>
  );
};

const PlaylistCard: React.FC<{ playlist: Playlist, devices: Device[], onConnect: (playlistId: number, deviceId: number) => void }> = ({ playlist, devices, onConnect }) => {
  const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);
  
  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-900 flex items-center">
          <BsCollectionPlay className="mr-2 text-primary-500" />
          {playlist.name}
        </h4>
        <div className="relative">
          <button 
            onClick={() => setShowDeviceDropdown(!showDeviceDropdown)}
            className="p-1.5 rounded-full hover:bg-gray-100"
          >
            <FaEllipsisV className="text-gray-500" />
          </button>
          
          {showDeviceDropdown && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-100 z-10"
            >
              <div className="p-2">
                <p className="text-xs font-medium text-gray-500 px-3 py-1.5">Connect to device</p>
                {devices.filter(d => !playlist.deviceIds.includes(d.id)).length > 0 ? (
                  devices.filter(d => !playlist.deviceIds.includes(d.id)).map(device => (
                    <button 
                      key={device.id}
                      onClick={() => {
                        onConnect(playlist.id, device.id);
                        setShowDeviceDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center"
                    >
                      <span className="w-2 h-2 rounded-full mr-2 bg-gray-400"></span>
                      {device.name}
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 px-3 py-1.5">Connected to all devices</p>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-4">
        <div>
          <p className="text-gray-500">Tracks</p>
          <p className="text-gray-800 font-medium">{playlist.tracks}</p>
        </div>
        <div>
          <p className="text-gray-500">Duration</p>
          <p className="text-gray-800 font-medium">{playlist.duration}</p>
        </div>
      </div>
      
      <div className="mt-auto">
        <p className="text-xs text-gray-500">Connected to:</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {playlist.deviceIds.length > 0 ? (
            playlist.deviceIds.map(id => {
              const connectedDevice = devices.find(d => d.id === id);
              return (
                <span 
                  key={id} 
                  className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs"
                >
                  {connectedDevice?.name || `Device ${id}`}
                </span>
              );
            })
          ) : (
            <span className="text-xs text-gray-500">Not connected to any device</span>
          )}
        </div>
      </div>
    </Card>
  );
};

const EmptyState: React.FC<{ onAddNew: () => void;
  message: string;
  icon: ReactElement;
  buttonText: string;}> = ({ onAddNew, message, icon, buttonText }) => (
  <Card className="col-span-full flex flex-col items-center justify-center py-12 text-center" hoverEffect={false}>
    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
      {icon}
    </div>
    <h4 className="text-xl font-semibold text-gray-900 mb-1">No Items Found</h4>
    <p className="text-gray-500 mb-6 max-w-md">{message}</p>
    <Button onClick={onAddNew} icon={<FaPlus />}>
      {buttonText}
    </Button>
  </Card>
);

// Modal Component
const OnboardDeviceModal: React.FC<{
  onClose: () => void;
  onSave: (data: DeviceFormData) => void;
}> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState<DeviceFormData>({
    name: "",
    type: "cento_v2",
    color: "white"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    onSave(formData);
    setIsSubmitting(false);
  };

  const isFormValid = formData.name.trim() !== "";

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Onboard New Device</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Device Name <span className="text-danger-500">*</span>
            </label>
            <input 
              id="name"
              name="name"
              type="text" 
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
              placeholder="e.g. Robo-001"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Device Type
              </label>
              <select 
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="cento_v2">Cento V2</option>
                <option value="cento_v3">Cento V3</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <select 
                id="color"
                name="color"
                value={formData.color}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="white">White</option>
                <option value="black">Black</option>
                <option value="silver">Silver</option>
                <option value="blue">Blue</option>
              </select>
            </div>
          </div>
          
          <div className="pt-2 flex justify-end space-x-3">
            <Button 
              variant="secondary" 
              onClick={onClose} 
              type="button"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!isFormValid || isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting ? "Onboarding..." : "Onboard Device"}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// Modal for adding new playlist
const AddPlaylistModal: React.FC<{
  onClose: () => void;
  onSave: (name: string) => void;
}> = ({ onClose, onSave }) => {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    onSave(name);
    setIsSubmitting(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Create New Playlist</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Playlist Name <span className="text-danger-500">*</span>
            </label>
            <input 
              id="name"
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
              placeholder="e.g. Morning Greetings"
              required
            />
          </div>
          
          <div className="pt-2 flex justify-end space-x-3">
            <Button 
              variant="secondary" 
              onClick={onClose} 
              type="button"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!name.trim() || isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Playlist"}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// Content Components
const DashboardView: React.FC<{
  devices: Device[];
  onAddNew: () => void;
  onEditDevice: (device: Device) => void;
  onManagePlaylists: (device: Device) => void;
}> = ({ devices, onAddNew, onEditDevice, onManagePlaylists }) => {
  const connectedCount = devices.filter(d => d.status === "Connected").length;
  const totalCount = devices.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Device Dashboard</h3>
          <p className="text-gray-500">Monitor and manage your robotic devices</p>
        </div>
        <Button onClick={onAddNew} icon={<FaPlus />}>
          Onboard New Device
        </Button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Devices</p>
              <h4 className="text-2xl font-bold text-gray-900 mt-1">{totalCount}</h4>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <FaRobot className="text-blue-500 text-xl" />
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Connected</p>
              <h4 className="text-2xl font-bold text-gray-900 mt-1">{connectedCount}</h4>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Offline</p>
              <h4 className="text-2xl font-bold text-gray-900 mt-1">{totalCount - connectedCount}</h4>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.length > 0 ? (
          devices.map((device) => (
            <DeviceCard 
              key={device.id} 
              device={device} 
              onEdit={onEditDevice} 
              onManagePlaylists={onManagePlaylists}
            />
          ))
        ) : (
          <EmptyState 
            onAddNew={onAddNew} 
            message="You haven't onboarded any robotic devices yet. Get started by adding your first device."
            icon={<FaRobot className="text-blue-500 text-3xl" />}
            buttonText="Onboard New Device"
          />
        )}
      </div>
    </div>
  );
};

const ManageDevicesView: React.FC<{
  devices: Device[];
  onAddNew: () => void;
  onEditDevice: (device: Device) => void;
  onManagePlaylists: (device: Device) => void;
}> = ({ devices, onAddNew, onEditDevice, onManagePlaylists }) => (
  <div className="space-y-6">
    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
      <div>
        <h3 className="text-2xl font-bold text-gray-900">Device Management</h3>
        <p className="text-gray-500">Configure and monitor all your devices</p>
      </div>
      <Button onClick={onAddNew} icon={<FaPlus />}>
        Onboard New Device
      </Button>
    </div>
    
    <Card className="overflow-hidden" hoverEffect={false}>
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-semibold text-gray-900">All Devices</h4>
        <div className="relative">
          <input
            type="text"
            placeholder="Search devices..."
            className="pl-8 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      
      {devices.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-sm text-gray-500">
                <th className="px-4 py-3 font-medium">Device</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last Active</th>
                <th className="px-4 py-3 font-medium">Battery</th>
                <th className="px-4 py-3 font-medium">Playlists</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {devices.map((device) => (
                <tr key={device.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={device.image}
                          alt={device.name}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{device.name}</p>
                        <p className="text-xs text-gray-500">{device.color}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{device.type}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={device.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{device.lastActive}</td>
                  <td className="px-4 py-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          parseInt(device.batteryLevel) > 50 ? 'bg-green-500' : 
                          parseInt(device.batteryLevel) > 20 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} 
                        style={{ width: `${device.batteryLevel}` }}
                      ></div></div>
                      <p className="text-xs text-gray-500 mt-1">{device.batteryLevel}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">
                        {device.connectedPlaylists?.length || 0} connected
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="secondary" 
                          onClick={() => onManagePlaylists(device)} 
                          className="text-xs px-3 py-1.5"
                          icon={<BsMusicNoteList size={12} />}
                        >
                          Playlists
                        </Button>
                        <Button 
                          variant="secondary" 
                          onClick={() => onEditDevice(device)} 
                          className="text-xs px-3 py-1.5"
                          icon={<FaEdit size={12} />}
                        >
                          Manage
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <EmptyState 
              onAddNew={onAddNew} 
              message="You haven't onboarded any robotic devices yet. Get started by adding your first device."
              icon={<FaRobot className="text-blue-500 text-3xl" />}
              buttonText="Onboard New Device"
            />
          </div>
        )}
      </Card>
    </div>
  );
  
  // Connected Playlists View
  const ConnectedPlaylistsView: React.FC<{
    devices: Device[];
    playlists: Playlist[];
    selectedDevice: Device | null;
    onAddNewPlaylist: () => void;
    onConnectPlaylist: (playlistId: number, deviceId: number) => void;
    onBackToDevices: () => void;
  }> = ({ devices, playlists, selectedDevice, onAddNewPlaylist, onConnectPlaylist, onBackToDevices }) => {
    // Filter playlists for the selected device if one is selected
    const filteredPlaylists = selectedDevice 
      ? playlists.filter(p => p.deviceIds.includes(selectedDevice.id))
      : playlists;
  
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            {selectedDevice ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={onBackToDevices}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Connected Playlists: {selectedDevice.name}
                  </h3>
                  <p className="text-gray-500">
                    Manage media playlists for this device
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-2xl font-bold text-gray-900">All Playlists</h3>
                <p className="text-gray-500">Manage and connect playlists to your devices</p>
              </div>
            )}
          </div>
          <Button onClick={onAddNewPlaylist} icon={<MdPlaylistAdd />}>
            Create New Playlist
          </Button>
        </div>
        
        {selectedDevice && (
          <Card className="p-4" hoverEffect={false}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={selectedDevice.image}
                  alt={selectedDevice.name}
                  width={48}
                  height={48}
                  className="object-cover"
                />
              </div>
              <div className="flex-grow">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900">{selectedDevice.name}</h4>
                  <StatusBadge status={selectedDevice.status} />
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                  <span>{selectedDevice.type}</span>
                  <span>•</span>
                  <span>{selectedDevice.batteryLevel} battery</span>
                  <span>•</span>
                  <span>Last active: {selectedDevice.lastActive}</span>
                </div>
              </div>
            </div>
          </Card>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlaylists.length > 0 ? (
            filteredPlaylists.map((playlist) => (
              <PlaylistCard 
                key={playlist.id} 
                playlist={playlist} 
                devices={devices}
                onConnect={onConnectPlaylist}
              />
            ))
          ) : (
            <EmptyState 
              onAddNew={onAddNewPlaylist}
              message={selectedDevice 
                ? `No playlists are connected to ${selectedDevice.name} yet. Create a new playlist to get started.` 
                : "You haven't created any playlists yet. Create a new playlist to get started."}
              icon={<BsMusicNoteList className="text-blue-500 text-3xl" />}
              buttonText="Create New Playlist"
            />
          )}
        </div>
      </div>
    );
  };
  
  // Dummy data for onboarded devices
  const dummyDevices: Device[] = [
    {
      id: 1,
      name: "Robo-001",
      type: "Cento V2",
      color: "white",
      image: "/uploads/1745388687556-service-robot.jpg",
      status: "Connected",
      lastActive: "2 minutes ago",
      batteryLevel: "87%",
      location: "Main Hall",
      connectedPlaylists: []
    },
    {
      id: 2,
      name: "Robo-002",
      type: "Cento V3",
      color: "black",
      image: `/uploads/1745388687556-service-robot.jpg`,
      status: "Disconnected",
      lastActive: "3 hours ago",
      batteryLevel: "42%",
      location: "Warehouse",
      connectedPlaylists: []
    },
    {
      id: 3,
      name: "Robo-003",
      type: "Custom",
      color: "blue",
      image: `/uploads/1745388687556-service-robot.jpg`,
      status: "Offline",
      lastActive: "5 days ago",
      batteryLevel: "12%",
      location: "Lab",
      connectedPlaylists: []
    },
  ];
  
  // Dummy data for playlists
  const dummyPlaylists: Playlist[] = [
    {
      id: 1,
      name: "Morning Greetings",
      tracks: 12,
      duration: "18 min",
      lastPlayed: "Today, 9:30 AM",
      deviceIds: [1, 3]
    },
    {
      id: 2,
      name: "Tour Guide Script",
      tracks: 8,
      duration: "45 min",
      lastPlayed: "Yesterday",
      deviceIds: [1]
    },
    {
      id: 3,
      name: "Customer Service",
      tracks: 15,
      duration: "32 min",
      lastPlayed: "3 days ago",
      deviceIds: [2]
    },
    {
      id: 4,
      name: "Promotional Messages",
      tracks: 5,
      duration: "8 min",
      lastPlayed: "Last week",
      deviceIds: []
    }
  ];
  
  export default function RoboticPlatform(): React.ReactElement {
    const [selectedMenu, setSelectedMenu] = useState<MenuKey>("dashboard");
    const [devices, setDevices] = useState<Device[]>(dummyDevices);
    const [playlists, setPlaylists] = useState<Playlist[]>(dummyPlaylists);
    const [showOnboardModal, setShowOnboardModal] = useState<boolean>(false);
    const [showPlaylistModal, setShowPlaylistModal] = useState<boolean>(false);
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const [menuExpanded, setMenuExpanded] = useState<Record<string, boolean>>({
      devices: false
    });
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  
    // Update devices with connected playlists info
    const devicesWithPlaylistInfo = devices.map(device => ({
      ...device,
      connectedPlaylists: playlists.filter(p => p.deviceIds.includes(device.id))
    }));
  
    // Menu items
    const menuItems: MenuItem[] = [
      { key: "dashboard", label: "Dashboard", icon: <RiDashboardLine /> },
      { key: "createMedia", label: "Create Media", icon: <FaRegFileAudio /> },
      { key: "setupPlaylist", label: "Setup Playlist", icon: <FaListAlt /> },
      { key: "connectPlaylist", label: "Connect Playlist", icon: <FaPlug /> },
      { 
        key: "onboardDevice", 
        label: "Manage Devices", 
        icon: <FaMobileAlt />,
        subItems: [
          { key: "onboardDevice", label: "All Devices", icon: <FaTachometerAlt /> },
          { key: "connectedPlaylists", label: "Connected Playlists", icon: <BsMusicNoteList /> }
        ],
        expanded: menuExpanded.devices
      }
    ];
  
    // Toggle menu expansion
    const toggleMenuExpansion = (menuSection: string) => {
      setMenuExpanded(prev => ({
        ...prev,
        [menuSection]: !prev[menuSection]
      }));
    };
  
    // Function to add a new device
    const addNewDevice = (deviceData: DeviceFormData): void => {
      const newDevice: Device = {
        id: devices.length + 1,
        name: deviceData.name,
        type: deviceData.type,
        color: deviceData.color,
        image: `/uploads/1745388687556-service-robot.jpg`,
        status: "Disconnected",
        lastActive: "Just now",
        batteryLevel: "100%",
        location: "Not specified",
        connectedPlaylists: []
      };
      setDevices([...devices, newDevice]);
      setShowOnboardModal(false);
    };
  
    // Function to add a new playlist
    const addNewPlaylist = (name: string): void => {
      const newPlaylist: Playlist = {
        id: playlists.length + 1,
        name,
        tracks: 0,
        duration: "0 min",
        lastPlayed: "Never",
        deviceIds: []
      };
      setPlaylists([...playlists, newPlaylist]);
      setShowPlaylistModal(false);
    };
  
    // Function to connect a playlist to a device
    const connectPlaylist = (playlistId: number, deviceId: number): void => {
      setPlaylists(playlists.map(playlist => 
        playlist.id === playlistId 
          ? { ...playlist, deviceIds: [...playlist.deviceIds, deviceId] }
          : playlist
      ));
    };
  
    const handleEditDevice = (device: Device): void => {
      // In a real application, this would open device management
      console.log("Edit device:", device);
      // For demo purposes, toggle the status
      const newStatus = device.status === "Connected" ? "Disconnected" : "Connected";
      setDevices(devices.map(d => 
        d.id === device.id ? { ...d, status: newStatus } : d
      ));
    };
  
    const handleManagePlaylists = (device: Device): void => {
      setSelectedDevice(device);
      setSelectedMenu("connectedPlaylists");
    };
  
    const renderContent = (): React.ReactElement => {
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
          return (
           <PlaylistManager />
          );
          
        
        case "createMedia":
        case "setupPlaylist":
        case "connectPlaylist":
          return (
            <Card className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                {menuItems.find(item => item.key === selectedMenu)?.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {menuItems.find(item => item.key === selectedMenu)?.label}
              </h3>
              <p className="text-gray-500 max-w-md mb-6">
                This feature is currently under development. We're working hard to bring you the best experience.
              </p>
              <Button variant="secondary" onClick={() => setSelectedMenu("dashboard")}>
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
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
  
        {/* Sidebar */}
        <aside className={`w-full lg:w-64 bg-white shadow-md border-r border-gray-200 lg:block transition-all duration-300 z-20 ${
          isMobileMenuOpen ? 'fixed inset-0 overflow-auto' : 'hidden'
        } lg:relative`}>
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
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
                        (selectedMenu === item.key || (item.subItems && item.subItems.some(sub => sub.key === selectedMenu)))
                          ? "bg-blue-50 text-blue-600 font-semibold" 
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={() => toggleMenuExpansion('devices')}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-lg ${
                          (selectedMenu === item.key || (item.subItems && item.subItems.some(sub => sub.key === selectedMenu)))
                            ? "text-blue-500" 
                            : "text-gray-500"
                        }`}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>
                      <span>
                        {menuExpanded.devices ? 
                          <HiOutlineChevronDown className="text-gray-500" /> : 
                          <HiOutlineChevronRight className="text-gray-500" />
                        }
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
                          {item.subItems.map(subItem => (
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
                              <span className={`text-base ${selectedMenu === subItem.key ? "text-blue-500" : "text-gray-500"}`}>
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
                      <span className={`text-lg ${selectedMenu === item.key ? "text-blue-500" : "text-gray-500"}`}>
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
              <h5 className="text-xs uppercase text-gray-500 font-medium mb-2">Device Stats</h5>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600">Active</span>
                  <span className="text-xs font-medium text-gray-800">
                    {devices.filter(d => d.status === "Connected").length} / {devices.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                  <div 
                    className="h-1.5 rounded-full bg-green-500" 
                    style={{ width: `${(devices.filter(d => d.status === "Connected").length / devices.length) * 100}%` }}
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
                    style={{ width: `${Math.min(playlists.length / 10, 1) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            {/* User profile section */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-grow">
                  <p className="text-sm font-medium text-gray-800">Admin User</p>
                  <p className="text-xs text-gray-500">admin@roboticplatform.com</p>
                </div>
                <button className="p-1.5 rounded-lg hover:bg-gray-100">
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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