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
                src={device.imageUrl || device.typeId?.imageUrl || '/placeholder-device.png'}
                alt={device.name}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              <span
                className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-medium ${
                  device.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : device.status === 'maintenance'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {device.status}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-800">{device.name}</h3>
              <p className="text-sm text-gray-600">Type: {device.typeId?.name}</p>
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
                onClick={() => openEditModal(device)}
                title="Edit Device"
              >
                <Edit size={18} />
              </button>
              <button
                className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                onClick={() => handleDelete(device._id)}
                title="Delete Device"
              >
                <Trash2 size={18} />
              </button>
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