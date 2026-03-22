import React from "react";
import { Device } from "../types";
import Card from "../Card";
import Button from "../Button";
import DeviceCard from "../DeviceCard";
import EmptyState from "../EmpthyState";
import { FaPlus, FaRobot } from "react-icons/fa";
import toast from "react-hot-toast";
import SliderDisplay from "../../Slider/SliderDisplay";

interface DashboardViewProps {
  devices: Device[];
  deviceStatuses: Record<string, { status: string; lastSync: string }>;
  onAddNew: () => void;
  onEditDevice: (device: Device) => void;
  onManagePlaylists: (device: Device) => void;
  setDevices: React.Dispatch<React.SetStateAction<Device[]>>;
  userRole?: string;
  onUnlinkPlaylist?: (deviceId: string, playlistId: string, type: 'regular' | 'announcement') => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  devices,
  deviceStatuses,
  onAddNew,
  onEditDevice,
  onManagePlaylists,
  setDevices,
  userRole,
  onUnlinkPlaylist,
}) => {
  const [showAllDevices, setShowAllDevices] = React.useState(false);
  const isSuperUser = userRole === "superUser";
  
  const getStatus = (device: Device) => {
    return deviceStatuses[device.deviceId.serialNumber]?.status || "offline";
  };

  const connectedCount = devices.filter((d) => getStatus(d) === "online").length;
  const offlineCount = devices.filter((d) => getStatus(d) === "offline").length;
  const totalCount = devices.length;
  const handleDeviceEdit = (updatedDevice: Device) => {
    setDevices((prevDevices) =>
      prevDevices.map((d) =>
        d.deviceId._id === updatedDevice.deviceId._id ? updatedDevice : d
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Device Dashboard</h3>
          <p className="text-gray-500">Monitor and manage your robotic devices</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-8">
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
                <h4 className="text-2xl font-bold text-gray-900 mt-1">{offlineCount}</h4>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* Device Cards or Empty State */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.length > 0 ? (
            devices.slice(0, 4).map((device) => (
              <DeviceCard
                key={device._id}
                device={device}
                deviceStatuses={deviceStatuses}
                onEdit={handleDeviceEdit}
                onManagePlaylists={onManagePlaylists}
                onRemoveDevice={async (deviceId) => {
                  try {
                    const res = await fetch(`api/onboarded-devices?deviceId=${deviceId}`, {
                      method: "DELETE",
                    });

                    if (res.ok) {
                      setDevices(devices.filter((d) => d._id !== deviceId));
                      toast.success(`Device ${deviceId} removed successfully`);
                    } else {
                      toast.error(`Failed to remove device ${deviceId}`);
                    }
                  } catch (error) {
                    console.error("Error removing device:", error);
                    toast.error("An error occurred while removing the device");
                  }
                }}
                onUnlinkPlaylist={async (deviceId, playlistId, type) => {
                  if (onUnlinkPlaylist) {
                    await onUnlinkPlaylist(deviceId, playlistId, type);
                    if ((window as any).refreshPlatformData) {
                      (window as any).refreshPlatformData();
                    }
                  }
                }}
              />
            ))
          ) : (
            <EmptyState
              onAddNew={isSuperUser ? onAddNew : undefined}
              message={
                isSuperUser
                  ? "You haven't onboarded any robotic devices yet. Get started by adding your first device."
                  : "You have no assigned device available here. Kindly contact your admin."
              }
              icon={<FaRobot className="text-blue-500 text-3xl" />}
              buttonText={isSuperUser ? "Onboard Device" : undefined}
              role={userRole}
            />
          )}
        </div>

        {devices.length > 4 && (
          <div className="flex justify-center mt-8">
            <Button
              variant="secondary"
              onClick={() => setShowAllDevices(true)}
              className="px-8 py-3 rounded-xl border-2 border-indigo-100 text-indigo-600 font-bold hover:bg-indigo-50 transition-all flex items-center gap-2"
            >
              View All {devices.length} Onboarded Devices
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Button>
          </div>
        )}
      </div>

      {/* View All Devices Modal */}
      {showAllDevices && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/20">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">Onboarded Devices</h3>
                <p className="text-gray-500 font-medium">Full list of your robotics network ({devices.length} total)</p>
              </div>
              <button 
                onClick={() => setShowAllDevices(false)}
                className="p-3 text-gray-400 hover:text-gray-900 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-gray-200"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {devices.map((device) => (
                  <DeviceCard
                    key={device._id}
                    device={device}
                    deviceStatuses={deviceStatuses}
                    onEdit={handleDeviceEdit}
                    onManagePlaylists={onManagePlaylists}
                    onRemoveDevice={async (deviceId) => {
                      try {
                        const res = await fetch(`api/onboarded-devices?deviceId=${deviceId}`, {
                          method: "DELETE",
                        });

                        if (res.ok) {
                          setDevices(devices.filter((d) => d._id !== deviceId));
                          toast.success("Device removed successfully");
                        } else {
                          toast.error("Failed to remove device");
                        }
                      } catch (error) {
                        console.error("Error removing device:", error);
                        toast.error("An error occurred while removing the device");
                      }
                    }}
                    onUnlinkPlaylist={async (deviceId, playlistId, type) => {
                      if (onUnlinkPlaylist) {
                        await onUnlinkPlaylist(deviceId, playlistId, type);
                        if ((window as any).refreshPlatformData) {
                          (window as any).refreshPlatformData();
                        }
                      }
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-end">
               <Button variant="primary" onClick={() => setShowAllDevices(false)} className="px-10 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 font-bold uppercase tracking-widest text-sm">
                 Close View
               </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
