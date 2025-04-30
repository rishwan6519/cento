import React from "react";
import Button from "./Button";
import Card from "./Card";
import { StatusBadge } from "../Platform/StatusBadge";
import Image from "next/image";
import { BsMusicNoteList } from "react-icons/bs";
import { IoMdSettings } from "react-icons/io";

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
    createdAt: string;
    updatedAt: string;
    __v: number;
  };
  onEdit: (device: any) => void;
  onManagePlaylists?: (device: any) => void;
}

const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  onEdit,
  onManagePlaylists,
}) => {
  const { deviceId, typeId } = device;

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-start space-x-4">
        <div className="relative w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
          <Image
            src={deviceId.imageUrl}
            alt={deviceId.name}
            width={64}
            height={64}
            className="object-cover"
          />
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
              <p className="text-gray-800 font-medium">{deviceId.serialNumber}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between">
        <Button
          variant="secondary"
          onClick={() => onManagePlaylists && onManagePlaylists(device)}
          className="text-sm"
          icon={<BsMusicNoteList />}
        >
          Playlists
        </Button>
        <Button
          variant="secondary"
          onClick={() => onEdit(device)}
          className="text-sm"
          icon={<IoMdSettings />}
        >
          Manage
        </Button>
      </div>
    </Card>
  );
};

export default DeviceCard;
