// src/components/platform/types.ts
import { ReactElement } from "react";

export type DeviceStatus = "Connected" | "Disconnected" | "Offline" | "active" | "inactive" | "pending";
export type ButtonVariant = "primary" | "secondary" | "success" | "danger";
export type MenuKey = 
  | "dashboard"
  | "createMedia"
  | "showMedia"
  | "setupPlaylist"
  | "showPlaylist"
  | "connectPlaylist"
  | "onboardDevice"
  | "connectedPlaylists";

export interface Device {
  _id: string;
  deviceId: {
    _id: string;
    name: string;
    serialNumber: string;
    imageUrl: string;
    status: DeviceStatus;
    color: string;
  };
  typeId: {
    _id: string;
    name: string;
  };
  userId: {
    _id: string;
  };
  status: DeviceStatus;
  name: string;
  batteryLevel: string;
  lastActive: string;
  connectedPlaylists?: Array<{
    id: string;
    name: string;
    status: string;
  }>;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface ConnectedPlaylist {
  id: string;
  name: string;
  status: DeviceStatus;  // Update this to use DeviceStatus type
}

export interface DeviceReference {
  id: string;
  name: string;
  status?: string;
  typeId?: string;
  batteryLevel?: string;
  lastActive?: string;
  imageUrl?: string;
}

export interface PlaylistFile {
  name: string;
  path: string;
  type: string;
  displayOrder: number;
  delay: number;
  backgroundImageEnabled: boolean;
  backgroundImage: string | null;
}

export interface Playlist {
  id: string;
  name: string;
  type: string;
  contentType: string;
  startTime: string;
  endTime: string;
  files: PlaylistFile[];
  deviceIds: DeviceReference[];
  status: string;
  createdAt: Date;
}

export interface CardProps {
  children: React.ReactNode;
  deviceIds: DeviceReference[];  // Make deviceIds required
}

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  icon?: React.ReactNode;
  loading?: boolean;
}

export interface DeviceCardProps {
  device: {
    _id: string;
    deviceId: {
      _id: string;
      name: string;
      serialNumber: string;
      imageUrl: string;
      status: DeviceStatus;
    };
    typeId: {
      _id: string;
      name: string;
    };
    userId: {
      _id: string;
    };
    connectedPlaylists?: ConnectedPlaylist[];
    createdAt: string;
    updatedAt: string;
    __v: number;
  };
  onEdit: (device: any) => void;
  onManagePlaylists?: (device: any) => void;
}

export interface PlaylistCardProps {
  playlist: Playlist;
  devices: Device[];
  onConnect: (playlistId: string, deviceId: string) => void; // Changed to string IDs
}

export interface EmptyStateProps {
  onAddNew: () => void;
  message: string;
  icon: ReactElement;
  buttonText: string;
}

export interface MenuItem {
  key: MenuKey;
  label: string;
  icon: React.ReactNode;
  subItems?: MenuItem[];
  expanded?: boolean;
}

export interface DeviceFormData {
  name: string;
  type: string;
  color: string;
}

export interface DashboardViewProps {
  devices: Device[];
  onAddNew: () => void;
  onEditDevice: (device: Device) => void;
  onManagePlaylists: (device: Device) => void;
}

export interface ManageDevicesViewProps {
  devices: Device[];
  onAddNew: () => void;
  onEditDevice: (device: Device) => void;
  onManagePlaylists: (device: Device) => void;
}

export interface ConnectedPlaylistsViewProps {
  devices: Device[];
  playlists?: Playlist[];
  selectedDevice: Device | null;
  onAddNewPlaylist: () => void;
  onConnectPlaylist: (playlistId: string, deviceId: string) => void; // Changed to string IDs
  onBackToDevices: () => void;
}

export interface OnboardDeviceModalProps {
  onClose: () => void;
  onSave: (data: DeviceFormData) => void;
}

export interface AddPlaylistModalProps {
  onClose: () => void;
  onSave: (name: string) => void;
}

export interface SidebarProps {
  selectedMenu: MenuKey;
  menuItems: MenuItem[];
  devices: Device[];
  playlists: Playlist[];
  isMobileMenuOpen: boolean;
  menuExpanded: Record<string, boolean>;
  setSelectedMenu: (key: MenuKey) => void;
  setIsMobileMenuOpen: (open: boolean) => void;
  toggleMenuExpansion: (menuSection: string) => void;
}

export const colors = {
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