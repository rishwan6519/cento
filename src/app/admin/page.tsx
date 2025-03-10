"use client"
import { useState } from "react";
import { PlusCircle, Database, Settings } from "lucide-react";

interface Device {
  name: string;
  image: File | null;
}

interface DeviceType {
  type: string;
  details: string;
}

interface Config {
  serialNumber: string;
  color: string;
  movements: string;
}

export default function RobotAdminDashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [newDevice, setNewDevice] = useState<Device>({ name: "", image: null });
  const [newDeviceType, setNewDeviceType] = useState<DeviceType>({ type: "", details: "" });
  const [showConfig, setShowConfig] = useState<boolean>(false);

  const addDevice = () => {
    if (newDevice.name && newDevice.image) {
      setDevices([...devices, newDevice]);
      setNewDevice({ name: "", image: null });
    }
  };

  const addDeviceType = () => {
    if (newDeviceType.type) {
      setDeviceTypes([...deviceTypes, newDeviceType]);
      setNewDeviceType({ type: "", details: "" });
    }
  };

  return (
    <div style={{ padding: "24px", backgroundColor: "#f3f4f6", minHeight: "100vh" }}>
      <h1 style={{ textAlign: "center", fontSize: "24px", fontWeight: "bold", color: "#1f2937" }}>Robot Admin Dashboard</h1>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <div style={{ padding: "16px", borderLeft: "4px solid blue", backgroundColor: "white", boxShadow: "0px 2px 4px rgba(0,0,0,0.1)" }}>
          <Database size={40} color="blue" />
          <h2>Total Users</h2>
          <p style={{ fontSize: "24px", fontWeight: "bold", color: "blue" }}>100</p>
        </div>
        
        <div style={{ padding: "16px", borderLeft: "4px solid green", backgroundColor: "white", boxShadow: "0px 2px 4px rgba(0,0,0,0.1)" }}>
          <Database size={40} color="green" />
          <h2>Total Devices</h2>
          <p style={{ fontSize: "24px", fontWeight: "bold", color: "green" }}>{devices.length}</p>
        </div>
        
        <button 
          onClick={() => setShowConfig(!showConfig)}
          style={{ backgroundColor: "purple", color: "white", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", border: "none", cursor: "pointer" }}>
          <Settings size={18} /> Configure Device
        </button>
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
        <div style={{ padding: "16px", backgroundColor: "white", boxShadow: "0px 2px 4px rgba(0,0,0,0.1)" }}>
          <h2>Add Device</h2>
          <label>Device Name</label>
          <input 
            value={newDevice.name}
            onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
            placeholder="Enter device name"
            style={{ width: "100%", padding: "8px", marginBottom: "8px" }}
          />
          <label>Device Image</label>
          <input 
            type="file"
            onChange={(e) => setNewDevice({ ...newDevice, image: e.target.files ? e.target.files[0] : null })}
            style={{ width: "100%", padding: "8px", marginBottom: "8px" }}
          />
          <button 
            onClick={addDevice}
            style={{ width: "100%", padding: "12px", backgroundColor: "blue", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <PlusCircle size={18} /> Add Device
          </button>
        </div>
        
        <div style={{ padding: "16px", backgroundColor: "white", boxShadow: "0px 2px 4px rgba(0,0,0,0.1)" }}>
          <h2>Add Device Type</h2>
          <label>Device Type</label>
          <input 
            value={newDeviceType.type}
            onChange={(e) => setNewDeviceType({ ...newDeviceType, type: e.target.value })}
            placeholder="Enter device type"
            style={{ width: "100%", padding: "8px", marginBottom: "8px" }}
          />
          <label>Device Details</label>
          <input 
            value={newDeviceType.details}
            onChange={(e) => setNewDeviceType({ ...newDeviceType, details: e.target.value })}
            placeholder="Enter additional details"
            style={{ width: "100%", padding: "8px", marginBottom: "8px" }}
          />
          <button 
            onClick={addDeviceType}
            style={{ width: "100%", padding: "12px", backgroundColor: "green", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <PlusCircle size={18} /> Add Type
          </button>
        </div>
      </div>
    </div>
  );
}
