import React, { useState, useEffect } from 'react';
import Card from '../Platform/Card';
import Button from '../Platform/Button';
import { MonitorSmartphone, User } from 'lucide-react';
import Image from 'next/image';

interface User {
  _id: string;
  username: string;
  role: string;
  controllerId: string;
}

interface Device {
  _id: string;
  name: string;
  status: string;
    imageUrl?: string;
}

export default function AssignDevice() {
  const [step, setStep] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const superUserId = localStorage.getItem('userId');
        const response = await fetch(`/api/user?controllerId=${superUserId}`);
        const data = await response.json();
        console.log(data.data, 'data');
        if (data.success) {
          setUsers(data.data);
        }
      } catch (err) {
        setError('Failed to fetch users');
      }
    };
    fetchUsers();
  }, []);

  // Fetch available devices
  useEffect(() => {
    const fetchDevices = async () => {
      if (!selectedUser) return;
      try {
        const id =localStorage.getItem('userId');
        const response = await fetch(`/api/available-devices?id=${id}`);
        const data = await response.json();
        console.log(data.data, 'data');
        if (data.success) {
          setDevices(data.data);
        }
      } catch (err) {
        setError('Failed to fetch devices');
      }
    };
    if (step === 2) {
      fetchDevices();
    }
  }, [step, selectedUser]);

  const handleAssignDevice = async () => {
    try {
      setLoading(true);
      const assignedBy = localStorage.getItem('userId');
      
      const response = await fetch('/api/assign-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser,
          deviceId: selectedDevice,
          assignedBy,
          status: 'active'
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Reset form and show success
        setStep(1);
        setSelectedUser('');
        setSelectedDevice('');
        alert('Device assigned successfully!');
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      setError('Failed to assign device');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
            <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800">Step 1: Select User</h3>
          
            <div className="flex flex-wrap gap-4">
              {users.map((user) => (
                <div
                  key={user._id}
                  className={`flex items-center gap-4 w-64 p-4 border rounded-2xl cursor-pointer shadow-sm transition-all duration-200 ${
                    selectedUser === user._id
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                  }`}
                  onClick={() => setSelectedUser(user._id)}
                >
                  {/* Avatar or Icon */}
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <User className="w-5 h-5" />
                  </div>
          
                  {/* User Info */}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{user.username}</h4>
                    <p className="text-sm text-gray-500">{user.role || 'No email provided'}</p>
                  </div>
                </div>
              ))}
            </div>
          
            <Button
              variant="primary"
              onClick={() => setStep(2)}
              disabled={!selectedUser}
              className="mt-4"
            >
              Next
            </Button>
          </div>
        );

      case 2:
        return (
            <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800">Step 2: Select Device</h3>
          
            <div className="flex flex-wrap gap-4">
              {devices.map((device) => (
                <div
                  key={device._id}
                  className={`w-64 p-4 border rounded-2xl cursor-pointer shadow-sm transition-all duration-200 ${
                    selectedDevice === device._id
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                  }`}
                  onClick={() => setSelectedDevice(device._id)}
                >
                  {/* Image */}
                  <div className="w-full h-36 mb-4 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                    {device.imageUrl ? (
                      <Image
                        src={device.imageUrl}
                        alt={device.name}
                        width={256}
                        height={144}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <MonitorSmartphone className="text-gray-400 w-10 h-10" />
                    )}
                  </div>
          
                  {/* Device Info */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-800">{device.name}</h4>
                    <p className="text-sm text-gray-500">Status: {device.status}</p>
                  </div>
                </div>
              ))}
            </div>
          
            {/* Navigation Buttons */}
            <div className="flex gap-4 pt-4">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                variant="primary"
                onClick={() => setStep(3)}
                disabled={!selectedDevice}
              >
                Next
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 3: Confirm Assignment</h3>
            <div className="p-4 border rounded-lg bg-gray-50">
              <p className="mb-2">
                <span className="font-medium">Selected User: </span>
                {users.find(u => u._id === selectedUser)?.username}
              </p>
              <p>
                <span className="font-medium">Selected Device: </span>
                {devices.find(d => d._id === selectedDevice)?.name}
              </p>
            </div>
            <div className="flex gap-4">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handleAssignDevice}
                disabled={loading}
              >
                {loading ? 'Assigning...' : 'Confirm Assignment'}
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Assign Device</h2>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((stepNumber) => (
              <div
                key={stepNumber}
                className={`w-3 h-3 rounded-full ${
                  stepNumber === step
                    ? 'bg-blue-500'
                    : stepNumber < step
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}
        {renderStep()}
      </div>
    </Card>
  );
}