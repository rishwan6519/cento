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

interface AssignSliderProps {
  onSuccess?: () => void;
}

export default function AssignSlider({ onSuccess }: AssignSliderProps) {
  const [step, setStep] = useState(1);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [sliders, setSliders] = useState<SliderDocument[]>([]);

  const [selectedUser, setSelectedUser] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [selectedSlider, setSelectedSlider] = useState('');
  const [existingAssignment, setExistingAssignment] = useState<any>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

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

  // Fetch devices and their status under selected user
  useEffect(() => {
    const fetchDevicesAndAssignments = async () => {
      if (!selectedUser) return;
      try {
        const res = await fetch(`/api/assign-device?userId=${selectedUser}`);
        const data = await res.json();
        if (data.success) setDevices(data.data);
      } catch {
        setError('Failed to fetch devices');
      }
    };
    if (step === 2) fetchDevicesAndAssignments();
  }, [selectedUser, step]);

  // Fetch assignment for selected device
  useEffect(() => {
    const fetchAssignment = async () => {
      if (!selectedDevice) {
        setExistingAssignment(null);
        return;
      }
      try {
        const res = await fetch(`/api/assign-slider?deviceId=${selectedDevice}`);
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          // Find active one
          const active = data.data.find((a: any) => a.status === 'active');
          setExistingAssignment(active);
        } else {
          setExistingAssignment(null);
        }
      } catch {
        console.error('Failed to fetch slider assignment');
      }
    };
    fetchAssignment();
  }, [selectedDevice]);

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
      
      if (existingAssignment) {
        throw new Error('A slider is already connected to this device. Please disconnect it first.');
      }

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

      setShowSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign slider');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!existingAssignment) return;
    try {
      setIsDisconnecting(true);
      setError('');
      const res = await fetch(`/api/assign-slider?deviceId=${selectedDevice}&sliderId=${existingAssignment.sliderId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Disconnection failed');
      
      toast.success('Slider disconnected successfully');
      setExistingAssignment(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setIsDisconnecting(false);
    }
  };

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.href = "/platform";
        }
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [showSuccess, onSuccess]);

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
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900">{u.username}</h4>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Account Holder</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="primary" onClick={() => setStep(2)} disabled={!selectedUser} className="px-8">Proceed to Devices</Button>
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
                  <div className="w-full h-36 mb-4 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
                    {d.deviceId.imageUrl ? (
                      <Image src={d.deviceId.imageUrl} alt={d.deviceId.name} width={256} height={144} className="object-contain w-full h-full" />
                    ) : (
                      <MonitorSmartphone className="text-slate-400 w-10 h-10" />
                    )}
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">{d.deviceId.name}</h4>
                  <p className="text-xs text-slate-500 font-mono">SN: {d.deviceId.serialNumber}</p>
                </div>
              ))}
            </div>
            {devices.length === 0 && (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                 <MonitorSmartphone className="mx-auto h-12 w-12 text-slate-300 mb-2" />
                 <p className="text-slate-500 font-medium">No assigned devices found for this user.</p>
              </div>
            )}
            <div className="flex gap-4 pt-4">
              <Button variant="secondary" onClick={() => setStep(1)} className="px-6">Back</Button>
              {existingAssignment ? (
                <Button 
                  variant="danger" 
                  onClick={handleDisconnect} 
                  disabled={isDisconnecting} 
                  className="px-8 bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDisconnecting ? 'Disconnecting...' : 'Disconnect Current Slider'}
                </Button>
              ) : (
                <Button variant="primary" onClick={() => setStep(3)} disabled={!selectedDevice} className="px-8">Next Step</Button>
              )}
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
                  className={`w-64 p-3 border rounded-2xl cursor-pointer transition-all duration-200 ${selectedSlider === s._id ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-indigo-300 hover:shadow-md'}`}
                  onClick={() => setSelectedSlider(s._id)}
                >
                  <h4 className="font-bold mb-3 text-slate-900 flex items-center justify-between">
                    {s.sliderName}
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{s.sliders.length} items</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {s.sliders.slice(0, 4).map((img, idx) => (
                      <div key={idx} className="aspect-square relative rounded-lg overflow-hidden bg-slate-200 shadow-inner">
                        <img src={img.url} alt={img.description} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 pt-4">
              <Button variant="secondary" onClick={() => setStep(2)} className="px-6">Back</Button>
              <Button variant="primary" onClick={() => setStep(4)} disabled={!selectedSlider} className="px-8">Next</Button>
            </div>
          </div>
        );
      case 4:
        const user = users.find(u => u._id === selectedUser);
        const device = devices.find(d => d._id === selectedDevice);
        const slider = sliders.find(s => s._id === selectedSlider);
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Step 4: Confirm Details</h3>
            <div className="p-6 border-2 border-indigo-100 rounded-2xl bg-indigo-50/30 space-y-4 shadow-sm">
              <div className="flex justify-between items-center pb-3 border-b border-indigo-100">
                <span className="text-slate-500 font-medium">Store</span>
                <span className="font-bold text-slate-900">{user?.username}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-indigo-100">
                <span className="text-slate-500 font-medium">Device</span>
                <span className="font-bold text-slate-900">{device?.deviceId.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Slider</span>
                <span className="font-bold text-indigo-600">{slider?.sliderName}</span>
              </div>
            </div>
            <div className="flex gap-4">
              <Button variant="secondary" onClick={() => setStep(3)} className="px-6">Back</Button>
              <Button variant="primary" onClick={handleAssignSlider} disabled={loading} className="flex-1 py-4 text-lg font-black shadow-lg shadow-indigo-200">
                {loading ? 'Connecting...' : 'Connect Slider'}
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <Card className="max-w-3xl mx-auto overflow-hidden border-none shadow-2xl">
      <div className="p-10">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900 -mb-1">Connect Slider</h2>
            <p className="text-slate-500 font-medium">Connect sliders to your devices</p>
          </div>
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-full">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${n === step ? 'bg-indigo-600 w-8' : n < step ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            ))}
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 font-semibold rounded-r-xl"
          >
            {error}
          </motion.div>
        )}

        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center z-[100]"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2rem] p-12 flex flex-col items-center shadow-2xl"
            >
              <div className="bg-emerald-500 rounded-full p-6 shadow-xl shadow-emerald-500/40 mb-8">
                <FaCheckCircle className="text-white text-7xl" />
              </div>
              <h2 className="text-4xl font-black text-slate-900 mb-2">Success!</h2>
              <p className="text-slate-500 font-bold mb-0">Slider connected successfully.</p>
              <p className="text-indigo-600 font-bold animate-pulse">Returning to platform...</p>
            </motion.div>
          </motion.div>
        )}

        <div className="transition-all duration-300 ease-in-out">
          {renderStep()}
        </div>
      </div>
    </Card>
  );
}
