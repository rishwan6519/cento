"use client";

import React, { useState, useEffect } from 'react';
import { Trash2, Edit, ArrowLeft, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

interface DeviceType {
  id: string;
  name: string;
  imageUrl: string;
  handMovements: string[];
  bodyMovements: string[];
  screenSize: {
    width: number;
    height: number;
  };
  blockCodingEnabled: boolean;
}

interface ManageDeviceTypesProps {
  onBack: () => void;
  onEdit: (deviceType: DeviceType) => void;
  onAdd: () => void;
}

export default function ManageDeviceTypes({ onBack, onEdit, onAdd }: ManageDeviceTypesProps) {
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDeviceTypes();
  }, []);

  const fetchDeviceTypes = async () => {
    try {
      const response = await fetch('/api/device-types');
      if (!response.ok) throw new Error('Failed to fetch device types');
      const data = await response.json();
      setDeviceTypes(data);
    } catch (error) {
      console.error('Error fetching device types:', error);
      toast.error('Failed to fetch device types');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hardware model? This may affect existing devices in the fleet.')) return;

    try {
      const response = await fetch('/api/device-types', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) throw new Error('Failed to delete model');

      toast.success('Model deleted successfully');
      fetchDeviceTypes();
    } catch (error) {
      console.error('Error deleting model:', error);
      toast.error('Failed to delete model');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Accessing Model Registry...</p>
      </div>
    );
  }

  return (
    <div className="bg-white/50 backdrop-blur-md rounded-[2.5rem] p-10 min-h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-6">
          <button
            onClick={onBack}
            className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 rounded-2xl transition-all shadow-sm group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">System Architectures</h2>
            <p className="text-slate-500 font-medium">Manage the hardware schemas for the entire ecosystem.</p>
          </div>
        </div>
        
        <button
          onClick={onAdd}
          className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/25 hover:bg-blue-700 transition-all transform active:scale-95"
        >
          <Plus size={20} />
          New Model
        </button>
      </div>

      {deviceTypes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
              <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center text-slate-300 mb-6">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                 </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Registry Empty</h3>
              <p className="text-slate-500 font-medium mb-8">No hardware models have been defined yet.</p>
              <button 
                onClick={onAdd}
                className="text-blue-600 font-black flex items-center gap-2 hover:gap-4 transition-all"
              >
                Define your first model →
              </button>
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {deviceTypes.map((type) => (
            <div
              key={type.id}
              className="group relative bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 hover:-translate-y-2 overflow-hidden flex flex-col"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:bg-blue-50 transition-colors duration-500" />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-slate-50 mb-6 border border-slate-100/50">
                  <img
                    src={type.imageUrl || '/placeholder-device.png'}
                    alt={type.name}
                    className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-700"
                  />
                  {type.blockCodingEnabled && (
                      <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white shadow-sm flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Logic Ready</span>
                      </div>
                  )}
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">{type.name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                       <span className="w-2 h-2 rounded-full bg-slate-200" />
                       <span className="text-xs font-bold text-slate-500 tracking-tight">
                         {type.screenSize.width} × {type.screenSize.height} px Display
                       </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50 space-y-3">
                     <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Kinematics</span>
                        <div className="flex flex-wrap gap-2">
                           <span className="px-2 py-0.5 bg-slate-50 rounded-md text-[10px] font-bold text-slate-600">
                             {type.handMovements.length} Hand
                           </span>
                           <span className="px-2 py-0.5 bg-slate-50 rounded-md text-[10px] font-bold text-slate-600">
                             {type.bodyMovements.length} Body
                           </span>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-6 mt-auto">
                  <button
                    onClick={() => onEdit(type)}
                    className="flex items-center justify-center gap-2 py-3.5 bg-slate-50 text-slate-600 rounded-2xl font-black text-xs hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95"
                  >
                    <Edit size={14} />
                    Refine
                  </button>
                  <button
                    onClick={() => handleDelete(type.id)}
                    className="flex items-center justify-center gap-2 py-3.5 bg-slate-50 text-slate-400 hover:bg-red-500 hover:text-white rounded-2xl font-black text-xs transition-all shadow-sm active:scale-95"
                  >
                    <Trash2 size={14} />
                    Decommission
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
