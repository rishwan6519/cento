import React, { useState, useEffect } from 'react';
import { Trash2, Edit, ArrowLeft, X, Save, Upload, Link } from 'lucide-react';
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

interface EditFormData {
  name: string;
  imageUrl: string;
  color: string;
  status: string;
}

interface ShowDevicesProps {
  onBack: () => void;
}

export default function ShowDevices({ onBack }: ShowDevicesProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({
    name: '',
    imageUrl: '',
    color: '',
    status: 'active',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');
  const [isUploading, setIsUploading] = useState(false);

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

  const openEditModal = (device: Device) => {
    setEditingDevice(device);
    setEditForm({
      name: device.name || '',
      imageUrl: device.imageUrl || '',
      color: device.color || '',
      status: device.status || 'active',
    });
    setImageMode('url');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      setEditForm({ ...editForm, imageUrl: data.url });
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const closeEditModal = () => {
    setEditingDevice(null);
    setEditForm({ name: '', imageUrl: '', color: '', status: 'active' });
  };

  const handleSaveEdit = async () => {
    if (!editingDevice) return;
    if (!editForm.name.trim()) {
      toast.error('Device name is required');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/devices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingDevice._id,
          name: editForm.name.trim(),
          imageUrl: editForm.imageUrl.trim(),
          color: editForm.color.trim(),
          status: editForm.status,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update device');
      }

      toast.success('Device updated successfully!');
      closeEditModal();
      fetchDevices();
    } catch (error) {
      console.error('Error updating device:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update device');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="bg-white/50 backdrop-blur-md rounded-[2rem] p-8 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-6">
          <button
            onClick={onBack}
            className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 rounded-2xl transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Fleet Repository</h2>
            <p className="text-slate-500 font-medium">Manage and monitor all registered devices.</p>
          </div>
        </div>
        
        <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-2">
           <div className="px-4 py-2 bg-white rounded-xl shadow-sm text-xs font-bold text-slate-900">
              {devices.length} Total Units
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {devices.map((device) => (
          <div
            key={device._id}
            className="group relative bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 hover:-translate-y-2 overflow-hidden"
          >
            {/* Background Decorative Element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:bg-blue-50 transition-colors duration-500" />
            
            <div className="relative z-10">
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-slate-100 mb-6 shadow-inner">
                <img
                  src={device.imageUrl || device.typeId?.imageUrl || '/placeholder-device.png'}
                  alt={device.name}
                  className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-700"
                />
                <div className={`absolute top-4 right-4 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${
                  device.status === 'active'
                    ? 'bg-green-500 text-white'
                    : device.status === 'maintenance'
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-500 text-white'
                }`}>
                  {device.status}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">{device.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type:</span>
                    <span className="text-xs font-bold text-slate-600 truncate">{device.typeId?.name}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Serial Number</span>
                      <span className="text-sm font-mono font-bold text-slate-900">{device.serialNumber}</span>
                   </div>
                   {device.color && (
                      <div 
                        className="w-8 h-8 rounded-xl shadow-sm border-2 border-white ring-1 ring-slate-100" 
                        style={{ backgroundColor: device.color }} 
                      />
                   )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button
                    onClick={() => openEditModal(device)}
                    className="flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-600 rounded-2xl font-bold text-xs hover:bg-blue-600 hover:text-white transition-all transition-colors duration-300 shadow-sm"
                  >
                    <Edit size={14} />
                    Modify
                  </button>
                  <button
                    onClick={() => handleDelete(device._id)}
                    className="flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-400 hover:bg-red-500 hover:text-white rounded-2xl font-bold text-xs transition-all transition-colors duration-300 shadow-sm"
                  >
                    <Trash2 size={14} />
                    Retire
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ========= EDIT DEVICE MODAL ========= */}
      {editingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">Edit Device</h2>
              <button
                onClick={closeEditModal}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              {/* Serial Number (Read Only) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Serial Number <span className="text-xs text-gray-400 font-normal">(cannot be changed)</span>
                </label>
                <input
                  type="text"
                  value={editingDevice.serialNumber}
                  disabled
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Device Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Device Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="Enter device name"
                />
              </div>

              {/* Device Image */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Device Image
                </label>

                {/* Toggle Tabs */}
                <div className="flex gap-1 mb-3 bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setImageMode('url')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition ${
                      imageMode === 'url'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Link size={14} />
                    Via URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMode('upload')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition ${
                      imageMode === 'upload'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Upload size={14} />
                    Upload File
                  </button>
                </div>

                {/* URL Input */}
                {imageMode === 'url' && (
                  <input
                    type="text"
                    value={editForm.imageUrl}
                    onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="https://example.com/image.jpg"
                  />
                )}

                {/* File Upload */}
                {imageMode === 'upload' && (
                  <div className="relative">
                    <label
                      className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer transition ${
                        isUploading
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center pt-2 pb-2">
                        <Upload size={24} className={`mb-1 ${isUploading ? 'text-blue-400 animate-pulse' : 'text-gray-400'}`} />
                        <p className="text-sm text-gray-500 font-medium">
                          {isUploading ? 'Uploading...' : 'Click to upload image'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, GIF up to 5MB</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                )}

                {/* Image Preview */}
                {editForm.imageUrl && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 relative group">
                    <img
                      src={editForm.imageUrl}
                      alt="Preview"
                      className="w-full h-36 object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, imageUrl: '' })}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={editForm.color || '#000000'}
                    onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                    className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={editForm.color}
                    onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="#FF5733 or red"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={closeEditModal}
                className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className={`px-5 py-2.5 rounded-lg text-white font-medium flex items-center gap-2 transition ${
                  isSaving
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}