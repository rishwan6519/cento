import React from "react";
import  Card from "../Card";
import  Button from "../Button";
import  EmptyState from "../EmpthyState";

import Image from "next/image";
import { Device } from "../types";
import { FaPlus, FaEdit, FaRobot } from "react-icons/fa";
import { BsMusicNoteList } from "react-icons/bs";


interface ManageDevicesViewProps {
  devices: Device[];
  onAddNew: () => void;
  onEditDevice: (device: Device) => void;
  onManagePlaylists: (device: Device) => void;
}

const ManageDevicesView: React.FC<ManageDevicesViewProps> = ({
  devices,
  onAddNew,
  onEditDevice,
  onManagePlaylists,
}) => (
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
          <svg
            className="w-4 h-4 text-gray-400 absolute left-3 top-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
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
                <th className="px-4 py-3 font-medium text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {devices.map((device) => (
                <tr key={device._id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={device.deviceId.imageUrl}
                          alt={device.name}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {device.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {device.deviceId.color}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {device.typeId.name}
                  </td>
                  <td className="px-4 py-3">
                  
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {device.lastActive}
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          parseInt(device.batteryLevel) > 50
                            ? "bg-green-500"
                            : parseInt(device.batteryLevel) > 20
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${device.batteryLevel}` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {device.batteryLevel}
                    </p>
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

export default ManageDevicesView;