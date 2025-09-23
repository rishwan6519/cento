export interface DeviceType {
  id: string;
  name: string;
  type: 'robot' | 'other';
}

export interface Device {
  id: string;
  name: string;
  imageUrl?: string;
  type: string;
  serialNumber?: string;
  color?: string;
  description?: string;
  features?: string[];
  handMovements?: string[];
}

export interface SelectedFile {
  id: string;
  name: string;
  file: File;
}

export interface Playlist {
  id?: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  files: SelectedFile[];
  backgroundAudio?: File;
  volume: {
    main: number;
    background: number;
  };
}

export interface PlaylistSchedule {
  deviceTypeId: string;
  playlists: {
    playlistId: string;
    duration: number;
  }[];
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  activeDays: string[];
  exemptDays: string[];
}