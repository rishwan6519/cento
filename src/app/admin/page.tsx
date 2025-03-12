"use client";
import { useState, useEffect } from "react";
import { PlusCircle, Database, XCircle, Trash2, PlusCircleIcon } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { FcDataConfiguration } from "react-icons/fc";

interface DeviceType {
  id: string;
  name: string;
  type: 'robot' | 'other';
}

interface Device {
  id: string;
  name: string;
  imageUrl: string;
  typeId: string;
  serialNumber?: string;
  color?: string;
  description?: string;
  features?: string[];
  handMovements?: string[];
}

export default function RobotAdminDashboard() {
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [customDeviceName, setCustomDeviceName] = useState<string>("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [newDevice, setNewDevice] = useState<{ name: string; imageFile: File | null; typeId: string }>({
    name: "",
    imageFile: null,
    typeId: "",
  });
  const [activeSection, setActiveSection] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const [deviceDetails, setDeviceDetails] = useState<Device>({
    id: "",
    name: "",
    imageUrl: "",
    typeId: "",
    serialNumber: "",
    color: "",
    description: "",
    features: [],
    handMovements: [],
  });

  useEffect(() => {
    fetchDeviceTypes();
    fetchDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      const device = devices.find(d => d.id === selectedDevice);
      if (device) {
        setDeviceDetails({
          ...device,
          features: device.features || [],
          handMovements: device.handMovements || []
        });
      }
    }
  }, [selectedDevice, devices]);

  const fetchDevices = async () => {
    try {
      const response = await fetch("/api/devices");
      if (!response.ok) throw new Error(`Failed to fetch devices: ${response.status}`);
      const data = await response.json();
      setDevices(data);
    } catch (error) {
      console.error("Error fetching devices:", error);
      toast.error("Error fetching devices!");
    }
  };

  const fetchDeviceTypes = async () => {
    try {
      const response = await fetch("/api/device-types");
      if (!response.ok) throw new Error(`Failed to fetch device types`);
      const data = await response.json();
      setDeviceTypes(data);
    } catch (error) {
      console.error("Error fetching device types:", error);
      toast.error("Error fetching device types!");
    }
  };

  const handleImageUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Image upload error:", errorData);
        throw new Error(`Image upload failed: ${response.status}`);
      }

      const data = await response.json();
      return data.imageUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const addDevice = async () => {
    if (!newDevice.name) {
      toast.error("Device name is required!");
      return;
    }
    
    if (!newDevice.imageFile) {
      toast.error("Device image is required!");
      return;
    }

    setIsLoading(true);
    
    try {
      const imageUrl = await handleImageUpload(newDevice.imageFile);
      const response = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newDevice.name, 
          imageUrl,
          typeId: newDevice.typeId || "ROBO"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Device save error:", errorData);
        throw new Error(`Failed to add device: ${response.status}`);
      }
      
      const result = await response.json();
      toast.success("Device added successfully!");
      setNewDevice({ name: "", imageFile: null, typeId: "" });
      fetchDevices();
      setActiveSection("");
    } catch (error) {
      console.error("Error adding device:", error);
      toast.error("Failed to add device!");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDevice = async (id: string) => {
    if (!confirm("Are you sure you want to delete this device?")) {
      return;
    }
    
    try {
      const response = await fetch("/api/devices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete device");
      }
      
      toast.success("Device deleted successfully!");
      fetchDevices();
    } catch (error) {
      console.error("Error deleting device:", error);
      toast.error("Failed to delete device!");
    }
  };

  const addDeviceType = async () => {
    if (!customDeviceName) {
      toast.error("Please enter a name!");
      return;
    }
  
    try {
      const response = await fetch("/api/device-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customDeviceName,
        }),
      });
  
      if (!response.ok) {
        throw new Error("Failed to add device type");
      }
  
      const newType = await response.json();
      toast.success("Device type added successfully!");
      setDeviceTypes(prev => [...prev, newType]);
      setCustomDeviceName("");
      setActiveSection("");
    } catch (error) {
      console.error("Error adding device type:", error);
      toast.error("Failed to add device type!");
    }
  };

  const configureDevice = async () => {
    if (!selectedDevice) {
      toast.error("Please select a device to configure!");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const configData = {
        ...deviceDetails,
        id: selectedDevice
      };
      
      const response = await fetch("/api/configure-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configData),
      });
      
      if (!response.ok) throw new Error("Failed to configure device");
      
      toast.success("Device configured successfully!");
      fetchDevices();
      setActiveSection("");
      setDeviceDetails({
        id: "",
        name: "",
        imageUrl: "",
        typeId: "",
        serialNumber: "",
        color: "",
        description: "",
        features: [],
        handMovements: [],
      });
      setSelectedDevice("");
    } catch (error) {
      console.error("Error configuring device:", error);
      toast.error("Failed to configure device!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigInputChange = (field: keyof Device, value: any) => {
    setDeviceDetails((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Toaster />
      <h1 className="text-center text-4xl font-bold text-gray-800 mb-8">
        🤖 Robot Admin Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
          <Database size={40} className="text-blue-500 mx-auto" />
          <h2 className="text-lg text-center font-semibold mt-2">Total Devices</h2>
          <p className="text-2xl font-bold text-center text-blue-500">{devices.length}</p>
        </div>

        <div
          className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
          onClick={() => setActiveSection("addDevice")}
        >
          <PlusCircle size={40} className="text-green-500 mx-auto" />
          <h2 className="text-lg text-center font-semibold mt-2">Add Device</h2>
        </div>

        <div
          className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
          onClick={() => setActiveSection("addDeviceType")}
        >
          <PlusCircleIcon size={40} className="text-blue-500 mx-auto" />
          <h2 className="text-lg text-center font-semibold mt-2">Add Device Type</h2>
        </div>

        <div
          className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
          onClick={() => setActiveSection("configureDevice")}
        >
          <FcDataConfiguration size={40} className="mx-auto" />
          <h2 className="text-lg text-center font-semibold mt-2">Configure Device</h2>
        </div>
      </div>

      {/* Device List */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Device List</h2>
        
        {devices.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No devices added yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => (
              <div key={device.id} className="border rounded-xl p-4 relative hover:shadow-md transition-shadow">
                <button
                  onClick={() => deleteDevice(device.id)}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                  title="Delete device"
                >
                  <Trash2 size={20} />
                </button>
                
                <div className="h-48 mb-2 overflow-hidden rounded-md bg-gray-100 flex items-center justify-center">
                  <img
                    src={device.imageUrl}
                    alt={device.name}
                    className="object-contain h-full w-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder-image.jpg";
                    }}
                  />
                </div>
                <h3 className="font-semibold text-center">{device.name}</h3>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Device Modal */}
      {activeSection === "addDevice" && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={() => setActiveSection("")}
        >
          <div
            className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={() => setActiveSection("")}
            >
              <XCircle size={24} />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-gray-800">Add New Device</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Device Name
                </label>
                <input
                  value={newDevice.name}
                  onChange={(e) =>
                    setNewDevice({ ...newDevice, name: e.target.value })
                  }
                  placeholder="Enter device name"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Device Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setNewDevice({
                      ...newDevice,
                      imageFile: e.target.files?.[0] || null,
                    })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {newDevice.imageFile && (
                  <p className="mt-1 text-sm text-gray-500">
                    Selected: {newDevice.imageFile.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Device Type
                </label>
                <select
                  value={newDevice.typeId}
                  onChange={(e) =>
                    setNewDevice({ ...newDevice, typeId: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a type</option>
                  {deviceTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={addDevice}
                disabled={isLoading}
                className={`w-full py-3 rounded-lg ${
                  isLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                } text-white font-semibold transition-colors duration-200 ease-in-out transform hover:scale-105`}
              >
                {isLoading ? "Adding..." : "Add Device"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Device Type Modal */}
      {activeSection === "addDeviceType" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={() => setActiveSection("")}
            >
              <XCircle size={24} />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-gray-800">Add Device Type</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Device Type Name
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter device type name"
                  value={customDeviceName}
                  onChange={(e) => setCustomDeviceName(e.target.value)}
                />
              </div>

              <button
                onClick={addDeviceType}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg
                          transition-colors duration-200 ease-in-out transform hover:scale-105"
              >
                Add Device Type
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configure Device Modal */}
      {activeSection === "configureDevice" && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={() => setActiveSection("")}
        >
          <div
            className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md relative overflow-y-auto max-h-screen"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={() => setActiveSection("")}
            >
              <XCircle size={24} />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-gray-800">Configure Device</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Device
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                >
                  <option value="">Select a device</option>
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={deviceDetails.serialNumber || ""}
                  onChange={(e) => handleConfigInputChange("serialNumber", e.target.value)}
                  placeholder="Enter serial number"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Color
                </label>
                <input
                  type="text"
                  value={deviceDetails.color || ""}
                  onChange={(e) => handleConfigInputChange("color", e.target.value)}
                  placeholder="Enter color"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={deviceDetails.description || ""}
                  onChange={(e) => handleConfigInputChange("description", e.target.value)}
                  placeholder="Enter description"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Features (comma-separated)
                </label>
                <input
                  type="text"
                  value={deviceDetails.features?.join(",") || ""}
                  onChange={(e) => handleConfigInputChange("features", e.target.value.split(",").map(item => item.trim()))}
                  placeholder="Enter features"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Hand Movements (comma-separated)
                </label>
                <input
                  type="text"
                  value={deviceDetails.handMovements?.join(",") || ""}
                  onChange={(e) => handleConfigInputChange("handMovements", e.target.value.split(",").map(item => item.trim()))}
                  placeholder="Enter hand movements"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={configureDevice}
                disabled={isLoading || !selectedDevice}
                className={`w-full py-3 rounded-lg ${
                  isLoading || !selectedDevice
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                } text-white font-semibold transition-colors duration-200 ease-in-out transform hover:scale-105`}
              >
                {isLoading ? "Configuring..." : "Save Configuration"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}