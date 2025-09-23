import React, { useState, useEffect } from 'react';
import { Trash2, Edit, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

interface Device {
  _id: string;
  name: string;
  serialNumber: string;
  imageUrl?: string;
  color?: string;
  status: string;
  typeId: {
    name: string;
    imageUrl: string;
  };
}

interface ShowDevicesProps {
  onBack: () => void;
}

export default function ShowDevices({ onBack }: ShowDevicesProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/devices');
      if (!response.ok) throw new Error('Failed to fetch devices');
      const data = await response.json();
      setDevices(data);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to fetch devices');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this device?')) return;

    try {
      const response = await fetch('/api/devices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) throw new Error('Failed to delete device');

      toast.success('Device deleted successfully');
      fetchDevices();
    } catch (error) {
      console.error('Error deleting device:', error);
      toast.error('Failed to delete device');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold">Registered Devices</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map((device) => (
          <div
            key={device._id}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
          >
            <div className="relative">
              <img
                src={device.imageUrl || device.typeId.imageUrl || '/placeholder-device.png'}
                alt={device.name}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              <span
                className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-medium ${
                  device.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {device.status}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-800">{device.name}</h3>
              <p className="text-sm text-gray-600">Type: {device.typeId.name}</p>
              <p className="text-sm text-gray-600">
                Serial: {device.serialNumber}
              </p>
              {device.color && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Color:</span>
                  <div
                    className="w-6 h-6 rounded-full border"
                    style={{ backgroundColor: device.color }}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="p-2 text-gray-400 hover:text-blue-500 rounded-full hover:bg-blue-50 transition-colors"
                onClick={() => toast.error('Edit functionality not implemented')}
              >
                <Edit size={18} />
              </button>
              <button
                className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                onClick={() => handleDelete(device._id)}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}