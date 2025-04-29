import React from "react";
import { Device } from "../types";
import  Card from "../Card";
import  Button from "../Button";
import  DeviceCard from "../DeviceCard";
import  EmptyState from "../EmpthyState";
import { FaPlus, FaRobot } from "react-icons/fa";

interface DashboardViewProps {
  devices: Device[];
  onAddNew: () => void;
  onEditDevice: (device: Device) => void;
  onManagePlaylists: (device: Device) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  devices,
  onAddNew,
  onEditDevice,
  onManagePlaylists,
}) => {
  const connectedCount = devices.filter((d) => d.status === "Connected").length;
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
              <h4 className="text-2xl font-bold text-gray-900 mt-1">
                {totalCount - connectedCount}
              </h4>
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
              key={device._id}
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

export default DashboardView;