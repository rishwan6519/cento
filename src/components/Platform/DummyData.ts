// dummyData.ts

export interface Device {
    id: number;
    name: string;
    type: string;
    color: string;
    image: string;
    status: string;
    lastActive: string;
    batteryLevel: string;
    location: string;
    connectedPlaylists: number[];
  }
  
  export interface Playlist {
    id: number;
    name: string;
    tracks: number;
    duration: string;
    lastPlayed: string;
    deviceIds: number[];
  }
  
  // Dummy data for devices
  export const dummyDevices: Device[] = [
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
      image: "/uploads/1745388687556-service-robot.jpg",
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
      image: "/uploads/1745388687556-service-robot.jpg",
      status: "Offline",
      lastActive: "5 days ago",
      batteryLevel: "12%",
      location: "Lab",
      connectedPlaylists: []
    }
  ];
  
  // Dummy data for playlists
  export const dummyPlaylists: Playlist[] = [
    {
      id: 1,
      name: "Morning Love",
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
  