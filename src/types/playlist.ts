export interface PlaylistFile {
  id: string;
  name: string;
  type: string;
  url?: string;
  size?: number;
  createdAt?: Date;
}

export interface Playlist {
  id: string;
  name: string;
  type: string;
  files: PlaylistFile[];
  createdAt: Date;
  updatedAt: Date;
}