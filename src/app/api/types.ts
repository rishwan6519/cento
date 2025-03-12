export interface Device {
    _id: string;
    name: string;
    image: string; // URL of the image file
  }
  
  export interface DeviceType {
    _id: string;
    deviceId: string;
    type: string;
  }
  