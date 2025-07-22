"use client";
import React, { useEffect, useState } from "react";
import Button from "./Button";
import Card from "./Card";
import Image from "next/image";
import { BsMusicNoteList } from "react-icons/bs";
import { IoMdTrash } from "react-icons/io";
import { MdAddCircleOutline } from "react-icons/md";

// RemoveDeviceModal component
const RemoveDeviceModal = ({
  isOpen,
  onClose,
  onConfirm,
  deviceName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deviceName: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Remove Device
        </h3>
        <p className="text-gray-600 mb-4">
          Are you sure you want to remove "{deviceName}"? This action cannot be
          undone.
        </p>
        <div className="flex justify-end space-x-2">
          <Button variant="secondary" onClick={onClose} className="text-sm">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            className="text-sm bg-red-600 hover:bg-red-700"
          >
            Remove Device
          </Button>
        </div>
      </div>
    </div>
  );
};

interface DeviceCardProps {
  device: {
    _id: string;
    deviceId: {
      _id: string;
      name: string;
      serialNumber: string;
      imageUrl: string;
      status: string;
    };
    typeId: {
      _id: string;
      name: string;
    };
    userId: {
      _id: string;
    };
    connectedPlaylists?: Array<{
      id: string;
      name: string;
      status: string;
    }>;
    createdAt: string;
    updatedAt: string;
    __v: number;
  };
  onEdit: (device: any) => void;
  onManagePlaylists?: (device: any) => void;
  onRemoveDevice?: (deviceId: string) => void;
}

const NoDeviceCard = ({ onboardDevice }: { onboardDevice: () => void }) => {
  return (
    <Card className="flex flex-col h-full justify-center items-center py-8">
      <div className="text-gray-400 text-6xl mb-4">
        <MdAddCircleOutline />
      </div>
      <h4 className="font-semibold text-gray-900 mb-2">No Devices Available</h4>
      <p className="text-gray-500 text-sm text-center mb-4">
        Get started by onboarding a new device
      </p>
      <Button
        variant="primary"
        onClick={onboardDevice}
        className="text-sm"
        icon={<MdAddCircleOutline />}
      >
        Onboard New Device
      </Button>
    </Card>
  );
};

const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  onEdit,
  onManagePlaylists,
  onRemoveDevice,
}) => {
  if (!device) {
    return <NoDeviceCard onboardDevice={() => onEdit(null)} />;
  }

  const [showPlaylists, setShowPlaylists] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const { deviceId, typeId, connectedPlaylists } = device;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("userRole");
      setUserRole(role);
    }
  }, []);

  const isValidImageUrl = (url?: string) => {
    return url && url.trim() !== "" && !url.includes("undefined");
  };

  const handleRemoveDevice = () => {
    if (onRemoveDevice) {
      onRemoveDevice(device._id);
      setShowRemoveModal(false);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-start space-x-4">
        <div className="relative w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
          {isValidImageUrl(deviceId.imageUrl) ? (
            <Image
              src={deviceId.imageUrl}
              alt={`Device ${deviceId.name}`}
              width={64}
              height={64}
              style={{ width: 64, height: "auto" }}
              className="object-cover"
              priority={true}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <span className="text-gray-400 text-2xl">📷</span>
            </div>
          )}
          <div className="absolute inset-0 border border-gray-100 rounded-xl pointer-events-none"></div>
        </div>
        <div className="flex-grow">
          <div className="flex justify-between items-start">
            <h4 className="font-semibold text-gray-900">{deviceId.name}</h4>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
            <div>
              <p className="text-gray-500">Type</p>
              <p className="text-gray-800 font-medium">{typeId.name}</p>
            </div>
            <div>
              <p className="text-gray-500">Serial</p>
              <p className="text-gray-800 font-medium">
                {deviceId.serialNumber}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100">
        {showPlaylists && (
          <div className="mb-3">
            <p className="text-sm text-gray-500 mb-2">Connected Playlists:</p>
            <div className="space-y-1">
              {connectedPlaylists && connectedPlaylists.length > 0 ? (
                connectedPlaylists.map((playlist) => (
                  <div
                    key={playlist.id}
                    className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded"
                  >
                    <span className="text-gray-700">{playlist.name}</span>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded">
                  <span className="text-gray-400 text-sm">
                    No playlists connected
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    Connect playlists to manage content
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
  {userRole === "superUser" && (
        <div className="flex justify-between">
          <Button
            variant="secondary"
            onClick={() => {
              setShowPlaylists(!showPlaylists);
              if (onManagePlaylists) onManagePlaylists(device);
            }}
            className="text-sm"
            icon={<BsMusicNoteList />}
          >
            {showPlaylists ? "Hide Playlists" : "Playlists"}
            {connectedPlaylists && connectedPlaylists.length > 0 && (
              <span className="ml-1 text-xs text-gray-500">
                ({connectedPlaylists.length})
              </span>
            )}
          </Button>
          <div className="flex space-x-2">
           
              <Button
                variant="secondary"
                onClick={() => setShowRemoveModal(true)}
                className="text-sm text-red-600 hover:text-red-700"
                icon={<IoMdTrash />}
              >
                Remove
              </Button>
          </div>
        </div>
            )}


      </div>

      <RemoveDeviceModal
        isOpen={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
        onConfirm={handleRemoveDevice}
        deviceName={deviceId.name}
      />
    </Card>
  );
};

export default DeviceCard;
