"use client";
import React, { useState, useEffect } from 'react';
import Card from '../Platform/Card';
import Button from '../Platform/Button';
import { Key, User } from 'lucide-react'; // Changed MonitorSmartphone to Key
import Image from 'next/image'; // Image might not be needed if not displaying devices
import { FaCheckCircle } from 'react-icons/fa';
import { motion, AnimatePresence } from "framer-motion";

interface User {
  _id: string;
  username: string;
  role: string;
  controllerId: string;
}

// Device related interfaces are no longer strictly needed for this new flow
// but kept for reference if you plan to re-use this component for devices later.
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

export default function AssignApiKey() { // Renamed component
  const [step, setStep] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>(''); // New state for API key input
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch users - remains largely the same
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const superUserId = localStorage.getItem('userId');
        const response = await fetch(`/api/user?controllerId=${superUserId}`);
        const data = await response.json();
        if (data.success) {
          setUsers(data.data);
        }
      } catch (err) {
        setError('Failed to fetch users');
      }
    };
    fetchUsers();
  }, []);

  // No longer fetching devices, so this useEffect is removed or modified for API key validation if needed
  // useEffect(() => {
  //   // ... device fetching logic removed ...
  // }, [step, selectedUser]);

  const handleAssignApiKey = async () => { // Renamed function
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      const assignedBy = localStorage.getItem('userId');
      
      if (!apiKeyInput) {
        throw new Error('API Key cannot be empty');
      }
      
      const response = await fetch('/api/assign-apikey', { // New API endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser,
          apiKey: apiKeyInput, // Sending the API key
          assignedBy,
          status: 'active' // Or whatever status is appropriate for an API key
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
        setApiKeyInput(''); // Clear API key input
        setShowSuccess(true); // Show success message
      } else {
        throw new Error(data.message || 'API Key assignment failed');
      }
    } catch (err) {
      console.error('API Key Assignment error:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign API Key');
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
            <h3 className="text-xl font-semibold text-gray-800">Step 2: Enter API Key</h3>
          
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="Enter API Key"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
            </div>
          
            {/* Navigation Buttons */}
            <div className="flex gap-4 pt-4">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                variant="primary"
                onClick={() => setStep(3)}
                disabled={!apiKeyInput.trim()} // Disable if API key is empty
              >
                Next
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 3: Confirm API Key Assignment</h3>
            <div className="p-4 border rounded-lg bg-gray-50">
              <p className="mb-2">
                <span className="font-medium">Selected User: </span>
                {users.find(u => u._id === selectedUser)?.username}
              </p>
              <p>
                <span className="font-medium">API Key: </span>
                {apiKeyInput}
              </p>
            </div>
            <div className="flex gap-4">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handleAssignApiKey} // Call the renamed function
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
          <h2 className="text-2xl font-bold">Assign API Key</h2> {/* Renamed title */}
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
              API Key Assigned Successfully! {/* Updated success message */}
            </motion.h2>
            <p className="text-lg text-gray-700">Redirecting to platform...</p>
          </motion.div>
        )}
        {renderStep()}
      </div>
    </Card>
  );
}