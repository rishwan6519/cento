"use client";
import React, { useState, useEffect } from 'react';
import Card from '../Platform/Card';
import Button from '../Platform/Button';
import { User, MonitorSmartphone } from 'lucide-react';
import Image from 'next/image';
import { FaCheckCircle } from 'react-icons/fa';
import { motion } from 'framer-motion';

interface AppUser {
  _id: string;
  username: string;
  role: string;
}

interface DeviceInfo {
  _id: string;
  name: string;
  serialNumber: string;
  imageUrl?: string;
  status: string;
}

interface Device {
  _id: string;
  deviceId: DeviceInfo;
}

interface SliderItem {
  url: string;
  description: string;
}

interface SliderDocument {
  _id: string;
  sliderName: string;
  sliders: SliderItem[];
}

export default function AssignSlider() {
  const [step, setStep] = useState(1);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [sliders, setSliders] = useState<SliderDocument[]>([]);

  const [selectedUser, setSelectedUser] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [selectedSlider, setSelectedSlider] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const superUserId = localStorage.getItem('userId');
        const res = await fetch(`/api/user?controllerId=${superUserId}`);
        const data = await res.json();
        if (data.success) setUsers(data.data);
      } catch {
        setError('Failed to fetch users');
      }
    };
    fetchUsers();
  }, []);

  // Fetch devices under selected user
  useEffect(() => {
    const fetchDevices = async () => {
      if (!selectedUser) return;
      try {
        const res = await fetch(`/api/assign-device?userId=${selectedUser}`);
        const data = await res.json();
        if (data.success) setDevices(data.data);
      } catch {
        setError('Failed to fetch devices');
      }
    };
    if (step === 2) fetchDevices();
  }, [selectedUser, step]);

  // Fetch sliders
  useEffect(() => {
    const fetchSliders = async () => {
      try {
        const res = await fetch(`/api/sliders`);
        const data = await res.json();
        if (data.success) setSliders(data.data);
      } catch {
        setError('Failed to fetch sliders');
      }
    };
    if (step === 3) fetchSliders();
  }, [step]);

  const handleAssignSlider = async () => {
    try {
      setLoading(true);
      setError('');
      const assignedBy = localStorage.getItem('userId');

      const res = await fetch('/api/assign-slider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser,
          deviceId: selectedDevice,
          sliderId: selectedSlider,
          assignedBy,
          status: 'active',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Assignment failed');

      setStep(1);
      setSelectedUser('');
      setSelectedDevice('');
      setSelectedSlider('');
      setShowSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign slider');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Step 1: Select User</h3>
            <div className="flex flex-wrap gap-4">
              {users.filter(u => u.role === 'user').map(u => (
                <div
                  key={u._id}
                  className={`flex items-center gap-4 w-64 p-4 border rounded-2xl cursor-pointer shadow-sm transition-all duration-200 ${selectedUser === u._id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300 hover:shadow-md'}`}
                  onClick={() => setSelectedUser(u._id)}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{u.username}</h4>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="primary" onClick={() => setStep(2)} disabled={!selectedUser}>Next</Button>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Step 2: Select Device</h3>
            <div className="flex flex-wrap gap-4">
              {devices.map(d => (
                <div
                  key={d._id}
                  className={`w-64 p-4 border rounded-2xl cursor-pointer shadow-sm transition-all duration-200 ${selectedDevice === d._id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300 hover:shadow-md'}`}
                  onClick={() => setSelectedDevice(d._id)}
                >
                  <div className="w-full h-36 mb-4 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                    {d.deviceId.imageUrl ? (
                      <Image src={d.deviceId.imageUrl} alt={d.deviceId.name} width={256} height={144} className="object-cover w-full h-full" />
                    ) : (
                      <MonitorSmartphone className="text-gray-400 w-10 h-10" />
                    )}
                  </div>
                  <h4 className="text-lg font-medium text-gray-800">{d.deviceId.name}</h4>
                  <p className="text-sm text-gray-500">Serial: {d.deviceId.serialNumber}</p>
                  <p className="text-sm text-gray-500">Status: {d.deviceId.status}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-4 pt-4">
              <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
              <Button variant="primary" onClick={() => setStep(3)} disabled={!selectedDevice}>Next</Button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Step 3: Select Slider</h3>
            <div className="flex flex-wrap gap-4">
              {sliders.map(s => (
                <div
                  key={s._id}
                  className={`w-64 p-2 border rounded-2xl cursor-pointer transition-all duration-200 ${selectedSlider === s._id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300 hover:shadow-md'}`}
                  onClick={() => setSelectedSlider(s._id)}
                >
                  <h4 className="font-medium mb-2 text-gray-800">{s.sliderName}</h4>
                  <div className="grid grid-cols-2 gap-1">
                    {s.sliders.slice(0, 4).map((img, idx) => (
                      <img key={idx} src={img.url} alt={img.description} className="w-full h-20 object-cover rounded" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{s.sliders.length} image(s)</p>
                </div>
              ))}
            </div>
            <div className="flex gap-4 pt-4">
              <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
              <Button variant="primary" onClick={() => setStep(4)} disabled={!selectedSlider}>Next</Button>
            </div>
          </div>
        );
      case 4:
        const user = users.find(u => u._id === selectedUser);
        const device = devices.find(d => d._id === selectedDevice);
        const slider = sliders.find(s => s._id === selectedSlider);
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Step 4: Confirm Assignment</h3>
            <div className="p-4 border rounded-lg bg-gray-50 space-y-2">
              <p><span className="font-medium">User:</span> {user?.username}</p>
              <p><span className="font-medium">Device:</span> {device?.deviceId.name}</p>
              <p><span className="font-medium">Slider:</span> {slider?.sliderName}</p>
            </div>
            <div className="flex gap-4">
              <Button variant="secondary" onClick={() => setStep(3)}>Back</Button>
              <Button variant="primary" onClick={handleAssignSlider} disabled={loading}>
                {loading ? 'Assigning...' : 'Confirm Assignment'}
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Assign Slider to Device</h2>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className={`w-3 h-3 rounded-full ${n === step ? 'bg-blue-500' : n < step ? 'bg-green-500' : 'bg-gray-300'}`} />
            ))}
          </div>
        </div>
        {error && <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>}
        {showSuccess && (
          <motion.div className="fixed inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center z-50">
            <motion.div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-8 shadow-2xl mb-6">
              <FaCheckCircle className="text-white text-7xl" />
            </motion.div>
            <h2 className="text-3xl font-bold text-green-700 mb-2">Slider Assigned Successfully!</h2>
            <p className="text-lg text-gray-700">Redirecting...</p>
          </motion.div>
        )}
        {renderStep()}
      </div>
    </Card>
  );
}
