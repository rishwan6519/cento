import React, { useState, useEffect } from 'react';
import Card from '../Platform/Card';
import Button from '../Platform/Button';
import { MonitorSmartphone, User } from 'lucide-react';
import Image from 'next/image';
import { FaCheckCircle } from 'react-icons/fa';
import { motion, AnimatePresence } from "framer-motion";

interface User {
  _id: string;
  username: string;
  role: string;
  controllerId: string;
}

interface DeviceInfo {
  _id: string;
  name: string;
  serialNumber: string;
  typeId: string;
  imageUrl?: string;
  color: string;
  status: string;
}

interface Device {
  _id: string;
  deviceId: DeviceInfo;
  typeId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export default function AssignDevice() {
  const [step, setStep] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const superUserId = localStorage.getItem('userId');
        const response = await fetch(`/api/user?controllerId=${superUserId}`);
        const data = await response.json();
        // console.log(data.data, 'data');
        if (data.success) {
          setUsers(data.data);
          // console.log(data.data, 'users');
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
        const id = localStorage.getItem('userId');
        const response = await fetch(`/api/available-devices?id=${id}`);
        const data = await response.json();
        console.log(data, 'data');
        // console.log(data.data, 'data');
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
      setError(''); // Clear previous errors
      const assignedBy = localStorage.getItem('userId');
      
      // Find the selected device to get the actual deviceId from the nested structure
      const selectedDeviceData = devices.find(d => d._id === selectedDevice);
      const actualDeviceId = selectedDeviceData?.deviceId._id;
      
      if (!actualDeviceId) {
        throw new Error('Device ID not found');
      }
      
      const response = await fetch('/api/assign-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser,
          deviceId: actualDeviceId, // Use the actual device ID from the nested structure
          assignedBy,
          status: 'active'
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      if (data.success) {
        // Reset form and show success
        setStep(1);
        setSelectedUser('');
        setSelectedDevice('');
        setShowSuccess(true); // Show success message
      } else {
        throw new Error(data.message || 'Assignment failed');
      }
    } catch (err) {
      console.error('Assignment error:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign device');
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
              {users.filter(user => user.role === 'user').map((user) => (
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
                    {device.deviceId.imageUrl ? (
                      <Image
                        src={device.deviceId.imageUrl}
                        alt={device.deviceId.name}
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
                    <h4 className="text-lg font-medium text-gray-800">{device.deviceId.name}</h4>
                    <p className="text-sm text-gray-500">Serial: {device.deviceId.serialNumber}</p>
                    <p className="text-sm text-gray-500">Color: {device.deviceId.color}</p>
                    <p className="text-sm text-gray-500">Status: {device.deviceId.status}</p>
                  </div>
                </div>
              ))}
            </div>
          
            {/* Show message if no devices available */}
            {devices.length === 0 && (
              <div className="text-center py-8">
                <MonitorSmartphone className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No available devices found</p>
              </div>
            )}
          
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
              <p className="mb-2">
                <span className="font-medium">Selected Device: </span>
                {devices.find(d => d._id === selectedDevice)?.deviceId.name}
              </p>
              <p className="mb-2">
                <span className="font-medium">Serial Number: </span>
                {devices.find(d => d._id === selectedDevice)?.deviceId.serialNumber}
              </p>
              <p>
                <span className="font-medium">Color: </span>
                {devices.find(d => d._id === selectedDevice)?.deviceId.color}
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

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        window.location.href = "/platform"; // Redirect to platform page
      }, 1800);

      return () => clearTimeout(timer); // cleanup
    }
  }, [showSuccess]);

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
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-8 shadow-2xl mb-6"
            >
              <FaCheckCircle className="text-white text-7xl" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-green-700 mb-2"
            >
              Device Assigned Successfully!
            </motion.h2>
            <p className="text-lg text-gray-700">Redirecting to platform...</p>
          </motion.div>
        )}
        {renderStep()}
      </div>
    </Card>
  );
}