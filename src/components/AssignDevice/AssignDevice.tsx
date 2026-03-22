"use client";

import React, { useState, useEffect } from 'react';
import Card from '../Platform/Card';
import Button from '../Platform/Button';
import { MonitorSmartphone, User, Check, ChevronRight, ChevronLeft, ShieldCheck, Activity, Search, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
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

interface ConnectedDevice {
  _id: string;
  deviceId: DeviceInfo;
  userId: string;
  assignedAt: string;
  assignedBy: string;
}

interface AssignDeviceProps {
  onSuccess?: () => void;
  defaultAction?: 'assign' | 'disconnect';
}

export default function AssignDevice({ onSuccess, defaultAction = 'assign' }: AssignDeviceProps): React.JSX.Element {
  const [step, setStep] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [actionType, setActionType] = useState<'assign' | 'disconnect'>(defaultAction);
  const [searchTerm, setSearchTerm] = useState('');

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setCurrentUserId(localStorage.getItem('userId'));
    setCurrentRole(localStorage.getItem('userRole'));
    setIsMounted(true);
  }, []);

  const targetRole = currentRole === 'admin' ? 'reseller' : currentRole === 'reseller' ? 'superUser' : 'user';
  const getRoleLabel = () => targetRole === 'user' ? 'Store' : targetRole === 'superUser' ? 'Account' : 'Reseller';

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const url = currentRole === 'admin' ? '/api/user' : `/api/user?controllerId=${currentUserId}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.success) {
          setUsers(data.data);
        }
      } catch (err) {
        setError('Failed to fetch users');
      }
    };
    if (currentUserId || currentRole === 'admin') fetchUsers();
  }, [currentUserId, currentRole]);

  // Fetch available devices
  useEffect(() => {
    const fetchDevices = async () => {
      if (!selectedUser) return;
      try {
        // First, check if there are available devices for current user
        const response = await fetch(`/api/available-devices?id=${currentUserId}&role=${currentRole}`);
        const data = await response.json();
        if (data.success) {
          setDevices(data.data);
        }
      } catch (err) {
        setError('Failed to fetch devices');
      }
    };
    if (step === 2 && actionType === 'assign') {
      fetchDevices();
    }
  }, [step, selectedUser, actionType, currentUserId]);

  // Fetch connected devices
  useEffect(() => {
    const fetchConnectedDevices = async () => {
      if (!selectedUser) return;
      try {
        const response = await fetch(`/api/assign-device?userId=${selectedUser}`);
        const data = await response.json();
        if (data.success) {
          setConnectedDevices(data.data);
        }
      } catch (err) {
        setError('Failed to fetch devices');
      }
    };
    if (step === 2 && actionType === 'disconnect') {
      fetchConnectedDevices();
    }
  }, [step, selectedUser, actionType]);

  const handleAction = async () => {
    try {
      setLoading(true);
      setError('');
      
      const endpoint = '/api/assign-device';
      let payload: any = {};
      let method = 'POST';

      if (actionType === 'assign') {
        const selectedDeviceData = devices.find(d => d._id === selectedDevice);
        const actualDeviceId = selectedDeviceData?.deviceId._id;
        if (!actualDeviceId) throw new Error('Hardware Reference Missing');
        
        payload = {
          userId: selectedUser,
          deviceId: actualDeviceId,
          assignedBy: currentUserId,
          status: 'active'
        };
      } else {
        const selectedDeviceData = connectedDevices.find(d => d._id === selectedDevice);
        const assignmentId = selectedDeviceData?._id;
        if (!assignmentId) throw new Error('Link Information Missing');
        
        method = 'DELETE';
        payload = null;
        // The API uses query param for DELETE as per existing code
      }

      const url = actionType === 'assign' ? endpoint : `${endpoint}?userId=${selectedDevice}`;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: payload ? JSON.stringify(payload) : undefined,
      });

      const data = await response.json();
      setShowSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection error');
    } finally {
      setLoading(false);
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

  const filteredUsers = users.filter(u => u.role === targetRole && u.username.toLowerCase().includes(searchTerm.toLowerCase()));

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
               <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Step 1: Select {getRoleLabel()}</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Select target {getRoleLabel().toLowerCase()} for connecting devices</p>
               </div>
               <div className="relative w-full sm:w-64 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={16} />
                  <input 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-50 rounded-xl focus:outline-none focus:border-indigo-100 focus:bg-white transition-all font-bold text-slate-700 text-sm"
                  />
               </div>
            </div>
          
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredUsers.map((user) => (
                <div
                  key={user._id}
                  className={`group flex items-center gap-4 p-5 border-2 rounded-[1.5rem] cursor-pointer transition-all ${
                    selectedUser === user._id
                      ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-100/50'
                      : 'border-slate-50 hover:border-slate-200 bg-white hover:shadow-md'
                  }`}
                  onClick={() => setSelectedUser(user._id)}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${selectedUser === user._id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                    <User size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-slate-900 truncate uppercase tracking-tight">{user.username}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">ID: {user._id.slice(-6)}</p>
                  </div>
                  {selectedUser === user._id && <div className="w-6 h-6 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-lg"><Check size={14} /></div>}
                </div>
              ))}
            </div>

            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full sm:w-fit mx-auto">
               <button onClick={() => setActionType('assign')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${actionType === 'assign' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Connect New Device</button>
               <button onClick={() => setActionType('disconnect')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${actionType === 'disconnect' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Disconnect Device</button>
            </div>
          
            <button
              onClick={() => setStep(2)}
              disabled={!selectedUser}
              className="w-full py-5 bg-slate-900 hover:bg-black text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-slate-200 transition-all flex items-center justify-center gap-3 disabled:opacity-20"
            >
              {actionType === 'assign' ? 'See Available Devices' : 'See Connected Devices'} <ChevronRight size={16} />
            </button>
          </motion.div>
        );

      case 2:
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Step 2: Select Device
            </h3>
          
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {(actionType === 'assign' ? devices : connectedDevices).map((device) => (
                <div
                  key={device._id}
                  className={`group relative p-6 border-2 rounded-[2rem] cursor-pointer transition-all ${
                    selectedDevice === device._id
                      ? (actionType === 'assign' ? 'border-emerald-500 bg-emerald-50 shadow-emerald-100' : 'border-rose-500 bg-rose-50 shadow-rose-100') + ' shadow-xl'
                      : 'border-slate-50 hover:border-slate-200 bg-white hover:shadow-md'
                  }`}
                  onClick={() => setSelectedDevice(device._id)}
                >
                  <div className="aspect-video mb-6 rounded-2xl overflow-hidden bg-white shadow-inner flex items-center justify-center border border-slate-50 relative group">
                    {device.deviceId.imageUrl ? (
                      <Image 
                        src={device.deviceId.imageUrl} 
                        alt={device.deviceId.name} 
                        fill
                        className="object-contain p-4 transition-transform duration-700 group-hover:scale-110" 
                      />
                    ) : (
                      <MonitorSmartphone className="text-slate-200 h-12 w-12" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">{device.deviceId.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">SN: {device.deviceId.serialNumber}</p>
                  </div>
                  {selectedDevice === device._id && (
                    <div className={`absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg ${actionType === 'assign' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                      <Check size={16} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {((actionType === 'assign' ? devices : connectedDevices).length === 0) && (
               <div className="py-20 bg-slate-50 rounded-[2rem] border-4 border-dashed border-slate-100 text-center">
                  <Activity className="mx-auto text-slate-200 mb-4" size={40} />
                  <p className="font-black text-slate-400 uppercase text-[10px] tracking-widest">No Devices Found</p>
               </div>
            )}
            
            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => setStep(1)}
                className="px-8 py-4 font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest text-[10px] transition-all flex items-center gap-2"
              >
                <ChevronLeft size={16} /> Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!selectedDevice}
                className={`flex-1 py-4 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all disabled:opacity-20 ${actionType === 'assign' ? 'bg-slate-900 hover:bg-black' : 'bg-rose-600 hover:bg-rose-700'}`}
              >
                {actionType === 'assign' ? 'Connect Now' : 'Disconnect Now'}
              </button>
            </div>
          </motion.div>
        );

      case 3:
        const user = users.find(u => u._id === selectedUser);
        const device = (actionType === 'assign' ? devices : connectedDevices).find(d => d._id === selectedDevice);
        return (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Step 3: Confirm Selection</h3>
            
            <div className="relative p-10 bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl">
               <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none text-white"><ShieldCheck size={120} /></div>
               
               <div className="space-y-8 relative z-10">
                  <div className="flex items-center gap-6">
                     <div className="w-16 h-16 rounded-[1.5rem] bg-white/10 backdrop-blur-md flex items-center justify-center text-white"><User size={28} /></div>
                     <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">{getRoleLabel()}</p>
                        <p className="text-2xl font-black text-white uppercase tracking-tight">{user?.username}</p>
                     </div>
                  </div>

                  <div className="flex items-center gap-6">
                     <div className="w-16 h-16 rounded-[1.5rem] bg-white/10 backdrop-blur-md flex items-center justify-center text-white"><MonitorSmartphone size={28} /></div>
                     <div>
                        <p className="text-[10px] font-black text-teal-400 uppercase tracking-[0.3em]">Hardware ID</p>
                        <p className="text-2xl font-black text-white uppercase tracking-tight">{device?.deviceId.name}</p>
                     </div>
                  </div>

                  <div className="pt-8 border-t border-white/10">
                     <div className="flex items-center gap-3">
                        <Activity size={14} className="text-indigo-500 animate-pulse" />
                        <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em]">Action: {actionType === 'assign' ? 'CONNECT_DEVICE' : 'DISCONNECT_DEVICE'}</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setStep(2)}
                className="px-8 py-5 font-black text-slate-400 hover:text-slate-900 transition-all uppercase tracking-widest text-[10px]"
              >
                Back
              </button>
              <button
                onClick={handleAction}
                disabled={loading}
                className={`flex-1 py-5 rounded-[1.5rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl transition-all flex items-center justify-center gap-3 ${
                   actionType === 'assign' ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200' : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200'
                }`}
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : actionType === 'assign' ? 'Connect Device' : 'Disconnect Device'}
              </button>
            </div>
          </motion.div>
        );
      default:
        return <></>;
    }
  };

  if (!isMounted) return <div className="min-h-[400px] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;

  return (
    <Card className="max-w-3xl mx-auto overflow-hidden border-none shadow-[0_40px_100px_rgba(0,0,0,0.1)] bg-white/80 backdrop-blur-xl rounded-[4rem]">
      <div className="p-10 lg:p-14">
        <div className="flex items-center justify-between mb-12">
          <div className="space-y-1">
             <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Assign Device</h2>
             <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Device Manager</p>
             </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-2.5 rounded-full transition-all duration-700 ${
                  n === step ? 'bg-indigo-600 w-12' : n < step ? 'bg-emerald-500 w-2.5' : 'bg-slate-200 w-2.5'
                }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-10 p-6 bg-rose-50 border-l-8 border-rose-500 text-rose-700 rounded-2xl flex items-center gap-4">
             <div className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center shadow-lg"><FaExclamationTriangle /></div>
             <div>
                <p className="font-black text-xs uppercase tracking-widest">Action Failed</p>
                <p className="text-sm font-bold opacity-80">{error}</p>
             </div>
          </motion.div>
        )}

        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl flex flex-col items-center justify-center z-[100]"
            >
              <motion.div
                initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                className="bg-white rounded-[3rem] p-16 flex flex-col items-center shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-white/20"
              >
                <div className="bg-emerald-500 rounded-full p-10 shadow-[0_0_50px_rgba(16,185,129,0.4)] mb-10">
                  <FaCheckCircle className="text-white text-8xl" />
                </div>
                <h2 className="text-5xl font-black text-slate-900 mb-2 tracking-tighter italic">SUCCESSFUL</h2>
                <p className="text-slate-400 font-bold uppercase tracking-[0.5em] text-xs">Device updated successfully</p>
                <div className="mt-12 flex items-center gap-3 text-indigo-500">
                   <Loader2 className="animate-spin" size={20} />
                   <span className="font-black italic text-sm tracking-widest">RETURNING TO PLATFORM...</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">
           {renderStep()}
        </div>
      </div>
    </Card>
  );
}