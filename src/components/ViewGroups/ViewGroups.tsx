// c:\Users\krishwan\Downloads\cento\src\components\ViewGroups\ViewGroups.tsx
"use client";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  FaFolder,
  FaFolderOpen,
  FaPlus,
  FaChevronDown,
  FaChevronRight,
  FaMusic,
  FaVideo,
  FaImage,
  FaTrash,
  FaEdit,
  FaSpinner,
  FaTimes,
  FaFolderPlus,
  FaFile,
  FaPlay,
  FaCheck,
  FaDesktop,
  FaLink,
  FaUnlink,
  FaSave,
  FaBan,
  FaInfoCircle
} from "react-icons/fa";
import { Search, Music, Video, AlertCircle, X } from "lucide-react";

interface MediaFile {
  _id: string;
  name: string;
  type: string;
  url: string;
  createdAt?: string;
}

interface DeviceInfo {
  _id: string;
  name: string;
  serialNumber: string;
}

interface MediaGroup {
  _id: string;
  name: string;
  description?: string;
  mediaIds: MediaFile[];
  deviceIds: DeviceInfo[];
  mediaCount: number;
  deviceCount: number;
  createdAt: string;
}

const BASE_URL = "https://iot.centelon.com";

export default function ViewGroups() {
  const [groups, setGroups] = useState<MediaGroup[]>([]);
  const [allMedia, setAllMedia] = useState<MediaFile[]>([]);
  const [availableDevices, setAvailableDevices] = useState<DeviceInfo[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignDevicesModal, setShowAssignDevicesModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<MediaGroup | null>(null);
  const [targetGroup, setTargetGroup] = useState<MediaGroup | null>(null);

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set());
  const [mediaSearchTerm, setMediaSearchTerm] = useState("");
  const [mediaFilterType, setMediaFilterType] = useState<"all" | "audio" | "video" | "image">("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null);

  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  useEffect(() => {
    if (userId) {
      fetchGroups();
      fetchAllMedia();
      fetchAvailableDevices();
    }
  }, [userId]);

  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/media-groups?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch groups");
      const data = await response.json();
      setGroups(data.groups || []);
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast.error("Failed to load media groups");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllMedia = async () => {
    try {
      const res = await fetch(`/api/media?userId=${userId}`);
      if (!res.ok) throw new Error("Failed to fetch media");
      const data = await res.json();
      const rawList: any[] = data.media || data || [];

      const mediaList: MediaFile[] = rawList.map((item) => {
        const originalType: string = item.type || "";
        let category = "file";
        if (originalType.startsWith("image") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(item.url)) category = "image";
        else if (originalType.startsWith("video") || /\.(mp4|webm|mov|mkv)$/i.test(item.url)) category = "video";
        else if (originalType.startsWith("audio") || /\.(mp3|wav|ogg|m4a)$/i.test(item.url)) category = "audio";

        return {
          _id: item._id,
          name: item.name,
          type: category,
          url: item.url,
          createdAt: item.createdAt,
        };
      });
      setAllMedia(mediaList);
    } catch (err) {
      console.error("Error fetching media:", err);
    }
  };

  const fetchAvailableDevices = async () => {
    try {
      const response = await fetch(`/api/onboarded-devices?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch devices");
      const data = await response.json();
      const devices = (data.data || []).map((d: any) => ({
        _id: d.deviceId?._id || d._id,
        name: d.deviceId?.name || d.name || "Unknown Device",
        serialNumber: d.deviceId?.serialNumber || d.serialNumber || "N/A",
      }));
      setAvailableDevices(devices);
    } catch (err) {
      console.error("Error fetching devices:", err);
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error("Group name is required");
      return;
    }
    if (selectedMediaIds.size === 0) {
      toast.error("Please select at least one media file");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/media-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name: newGroupName.trim(),
          description: newGroupDescription.trim(),
          mediaIds: Array.from(selectedMediaIds),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create group");
      }

      toast.success("Group created successfully");
      resetCreateModal();
      fetchGroups();
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create group");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup || !newGroupName.trim()) {
      toast.error("Group name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/media-groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: editingGroup._id,
          name: newGroupName.trim(),
          description: newGroupDescription.trim(),
          mediaIds: Array.from(selectedMediaIds),
        }),
      });

      if (!response.ok) throw new Error("Failed to update group");

      toast.success("Group updated successfully");
      resetEditModal();
      fetchGroups();
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error("Failed to update group");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Are you sure you want to delete this group? This will disconnect all devices.")) return;

    try {
      const response = await fetch(`/api/media-groups?groupId=${groupId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete group");

      toast.success("Group deleted successfully");
      fetchGroups();
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Failed to delete group");
    }
  };

  const handleRemoveMedia = async (groupId: string, mediaId: string) => {
    if (!confirm("Remove this file from the group?")) return;

    try {
      const response = await fetch(
        `/api/media-groups/media?groupId=${groupId}&mediaId=${mediaId}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Failed to remove media");

      toast.success("Removed from group");
      fetchGroups();
    } catch (error) {
      console.error("Error removing media:", error);
      toast.error("Failed to remove from group");
    }
  };

  // Updated assign devices function - enforce one group per device
  const handleAssignDevices = async () => {
    if (!targetGroup) return;

    setIsSubmitting(true);
    try {
      // Check if any selected device is already assigned to another group
      const selectedDeviceArray = Array.from(selectedDeviceIds);
      const deviceConflicts: string[] = [];
      
      // Check each selected device against all groups
      selectedDeviceArray.forEach(deviceId => {
        groups.forEach(group => {
          // Skip the current group
          if (group._id === targetGroup._id) return;
          
          // Check if device is in this group
          if (group.deviceIds.some(d => d._id === deviceId)) {
            deviceConflicts.push(deviceId);
          }
        });
      });
      
      // If conflicts exist, show warning
      if (deviceConflicts.length > 0) {
        const conflictDevices = availableDevices
          .filter(d => deviceConflicts.includes(d._id))
          .map(d => d.name);
        
        toast.error(`Devices already assigned to other groups: ${conflictDevices.join(', ')}`);
        setIsSubmitting(false);
        return;
      }
      
      // Proceed with assignment
      const response = await fetch("/api/media-groups/devices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: targetGroup._id,
          deviceIds: selectedDeviceArray,
        }),
      });

      if (!response.ok) throw new Error("Failed to assign devices");

      toast.success("Devices assigned successfully");
      resetAssignDevicesModal();
      fetchGroups();
    } catch (error) {
      console.error("Error assigning devices:", error);
      toast.error("Failed to assign devices");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (group: MediaGroup) => {
    setEditingGroup(group);
    setNewGroupName(group.name);
    setNewGroupDescription(group.description || "");
    setSelectedMediaIds(new Set(group.mediaIds.map((m) => m._id)));
    setMediaSearchTerm("");
    setMediaFilterType("all");
    setShowEditModal(true);
  };

  const openAssignDevicesModal = (group: MediaGroup) => {
    setTargetGroup(group);
    setSelectedDeviceIds(new Set(group.deviceIds.map((d) => d._id)));
    setShowAssignDevicesModal(true);
  };

  const resetCreateModal = () => {
    setShowCreateModal(false);
    setNewGroupName("");
    setNewGroupDescription("");
    setSelectedMediaIds(new Set());
    setMediaSearchTerm("");
    setMediaFilterType("all");
  };

  const resetEditModal = () => {
    setShowEditModal(false);
    setEditingGroup(null);
    setNewGroupName("");
    setNewGroupDescription("");
    setSelectedMediaIds(new Set());
    setMediaSearchTerm("");
    setMediaFilterType("all");
  };

  const resetAssignDevicesModal = () => {
    setShowAssignDevicesModal(false);
    setTargetGroup(null);
    setSelectedDeviceIds(new Set());
  };

  const toggleMediaSelection = (mediaId: string) => {
    setSelectedMediaIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(mediaId)) {
        newSet.delete(mediaId);
      } else {
        newSet.add(mediaId);
      }
      return newSet;
    });
  };

  const toggleDeviceSelection = (deviceId: string) => {
    setSelectedDeviceIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(deviceId)) {
        newSet.delete(deviceId);
      } else {
        // Check if this device is already assigned to another group
        const isAssigned = groups.some(group => 
          group._id !== targetGroup?._id && 
          group.deviceIds.some(d => d._id === deviceId)
        );
        
        if (isAssigned) {
          const device = availableDevices.find(d => d._id === deviceId);
          toast.error(`Device "${device?.name}" is already assigned to another group`);
          return newSet; // Don't add it
        }
        newSet.add(deviceId);
      }
      return newSet;
    });
  };

  const normalizeUrl = (url?: string): string => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const cleanPath = url.startsWith("/") ? url.slice(1) : url;
    return `${BASE_URL}/${cleanPath}`;
  };

  const getFileIcon = (type: string) => {
    if (type.includes("audio") || type === "audio") return <FaMusic className="text-purple-500" />;
    if (type.includes("video") || type === "video") return <FaVideo className="text-blue-500" />;
    if (type.includes("image") || type === "image") return <FaImage className="text-green-500" />;
    return <FaFile className="text-gray-500" />;
  };

  const getFilteredMedia = () => {
    return allMedia.filter((m) => {
      const matchesSearch = m.name.toLowerCase().includes(mediaSearchTerm.toLowerCase());
      const matchesType = mediaFilterType === "all" || m.type === mediaFilterType;
      return matchesSearch && matchesType;
    });
  };

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get devices that are already assigned to other groups
  const getAssignedDevices = () => {
    const assignedDeviceIds = new Set<string>();
    groups.forEach(group => {
      if (targetGroup && group._id !== targetGroup._id) {
        group.deviceIds.forEach(device => assignedDeviceIds.add(device._id));
      }
    });
    return assignedDeviceIds;
  };

  return (
    <div className="min-h-screen bg-[#EAF9FB] p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-slate-900 text-2xl font-semibold">Media Groups</h1>
              <p className="text-slate-500 text-sm mt-1">Create groups from your media files and assign to devices</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center bg-white border border-slate-200 rounded-full px-4 shadow-sm flex-1 sm:w-64 focus-within:border-orange-400">
                <Search size={18} className="text-slate-400 mr-2" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search groups..."
                  className="outline-none py-2.5 w-full text-sm text-slate-700 placeholder:text-slate-400"
                />
              </div>

              <button
                onClick={() => {
                  setSelectedMediaIds(new Set());
                  setMediaSearchTerm("");
                  setMediaFilterType("all");
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2.5 rounded-full font-medium transition-all shadow-md hover:shadow-lg"
              >
                <FaFolderPlus />
                Create Group
              </button>
            </div>
          </div>

          {/* Groups List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <FaSpinner className="animate-spin text-4xl text-orange-500" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FaFolder className="text-5xl mx-auto mb-4 opacity-50" />
              <p>No groups found</p>
              <button
                onClick={() => {
                  setSelectedMediaIds(new Set());
                  setMediaSearchTerm("");
                  setMediaFilterType("all");
                  setShowCreateModal(true);
                }}
                className="mt-4 text-orange-500 hover:text-orange-600 font-medium"
              >
                Create your first group
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGroups.map((group) => (
                <div key={group._id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Group Header */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors">
                    <button
                      onClick={() => toggleGroup(group._id)}
                      className="flex items-center gap-3 flex-1"
                    >
                      {expandedGroups.has(group._id) ? (
                        <FaFolderOpen className="text-orange-500 text-xl" />
                      ) : (
                        <FaFolder className="text-orange-500 text-xl" />
                      )}
                      <div className="text-left">
                        <h3 className="font-medium text-slate-900 text-lg">{group.name}</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {group.mediaCount} files • {group.deviceCount} devices
                          {group.description && ` • ${group.description}`}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-2">
                      <div className="hidden sm:block px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                        {group.deviceCount} device{group.deviceCount !== 1 ? 's' : ''}
                      </div>
                      <button
                        onClick={() => openAssignDevicesModal(group)}
                        className="p-2.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="Assign to devices"
                      >
                        <FaLink />
                      </button>
                      <button
                        onClick={() => openEditModal(group)}
                        className="p-2.5 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                        title="Edit group"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group._id)}
                        className="p-2.5 text-slate-600 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        title="Delete group"
                      >
                        <FaTrash />
                      </button>
                      <button 
                        onClick={() => toggleGroup(group._id)} 
                        className="p-2.5 text-slate-500 hover:text-slate-700"
                      >
                        {expandedGroups.has(group._id) ? (
                          <FaChevronDown className="text-slate-400" />
                        ) : (
                          <FaChevronRight className="text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedGroups.has(group._id) && (
                    <div className="border-t border-slate-200 bg-white p-5">
                      {/* Assigned Devices */}
                      <div className="mb-5">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <FaDesktop className="text-blue-500" />
                            Assigned Devices
                          </h4>
                          {group.deviceIds.length > 0 ? (
                            <button
                              onClick={() => {
                                setTargetGroup(group);
                                setSelectedDeviceIds(new Set()); // Clear selection
                                setShowAssignDevicesModal(true);
                              }}
                              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                            >
                              <FaUnlink size={12} />
                              Clear All
                            </button>
                          ) : (
                            <button
                              onClick={() => openAssignDevicesModal(group)}
                              className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                            >
                              <FaLink size={12} />
                              Assign Devices
                            </button>
                          )}
                        </div>
                        
                        {group.deviceIds.length > 0 ? (
                          <div className="space-y-3">
                            {group.deviceIds.map((device) => (
                              <div key={device._id} className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-100 rounded-lg">
                                    <FaDesktop className="text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-800">{device.name}</p>
                                    <p className="text-xs text-slate-500">SN: {device.serialNumber}</p>
                                  </div>
                                </div>
                                <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                  Connected
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
                            <FaBan className="text-slate-300 mx-auto text-2xl mb-2" />
                            <p className="text-slate-500 text-sm">No devices assigned to this group</p>
                          </div>
                        )}
                      </div>

                      {/* Media Files */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <FaFile className="text-orange-500" />
                          Media Files ({group.mediaIds.length})
                        </h4>
                        
                        {group.mediaIds.length === 0 ? (
                          <div className="text-center py-8 text-slate-400">
                            <FaFile className="text-3xl mx-auto mb-2 opacity-50" />
                            <p>No media files in this group</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {group.mediaIds.map((m) => (
                              <div
                                key={m._id}
                                className="group bg-slate-50 hover:bg-slate-100 rounded-xl overflow-hidden border border-slate-100 transition-all"
                              >
                                <div
                                  className="aspect-square bg-slate-200 relative overflow-hidden cursor-pointer"
                                  onClick={() => setPreviewMedia(m)}
                                >
                                  <MediaThumbnail file={m} normalizeUrl={normalizeUrl} />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <FaPlay className="text-white text-xl" />
                                  </div>
                                </div>
                                <div className="p-2">
                                  <div className="flex items-center gap-2">
                                    {getFileIcon(m.type)}
                                    <span className="text-xs font-medium text-slate-700 truncate flex-1">
                                      {m.name}
                                    </span>
                                  </div>
                                  <div className="flex justify-end mt-1">
                                    <button
                                      onClick={() => handleRemoveMedia(group._id, m._id)}
                                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                      title="Remove from group"
                                    >
                                      <FaTrash size={10} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <MediaSelectionModal
          title="Create New Group"
          allMedia={getFilteredMedia()}
          selectedMediaIds={selectedMediaIds}
          toggleMediaSelection={toggleMediaSelection}
          mediaSearchTerm={mediaSearchTerm}
          setMediaSearchTerm={setMediaSearchTerm}
          mediaFilterType={mediaFilterType}
          setMediaFilterType={setMediaFilterType}
          normalizeUrl={normalizeUrl}
          getFileIcon={getFileIcon}
          onClose={resetCreateModal}
          onSubmit={handleCreateGroup}
          isSubmitting={isSubmitting}
          submitLabel="Create Group"
          groupName={newGroupName}
          setGroupName={setNewGroupName}
          groupDescription={newGroupDescription}
          setGroupDescription={setNewGroupDescription}
        />
      )}

      {/* Edit Group Modal */}
      {showEditModal && editingGroup && (
        <MediaSelectionModal
          title={`Edit Group: ${editingGroup.name}`}
          allMedia={getFilteredMedia()}
          selectedMediaIds={selectedMediaIds}
          toggleMediaSelection={toggleMediaSelection}
          mediaSearchTerm={mediaSearchTerm}
          setMediaSearchTerm={setMediaSearchTerm}
          mediaFilterType={mediaFilterType}
          setMediaFilterType={setMediaFilterType}
          normalizeUrl={normalizeUrl}
          getFileIcon={getFileIcon}
          onClose={resetEditModal}
          onSubmit={handleUpdateGroup}
          isSubmitting={isSubmitting}
          submitLabel="Save Changes"
          groupName={newGroupName}
          setGroupName={setNewGroupName}
          groupDescription={newGroupDescription}
          setGroupDescription={setNewGroupDescription}
        />
      )}

      {/* Assign Devices Modal */}
      {showAssignDevicesModal && targetGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Assign Devices</h2>
                <p className="text-sm text-slate-500">Group: {targetGroup.name}</p>
              </div>
              <button onClick={resetAssignDevicesModal} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                <FaTimes />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {availableDevices.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <FaDesktop className="text-4xl mx-auto mb-3 opacity-50" />
                  <p>No devices available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-sm text-blue-700 flex items-start gap-2">
                      <FaInfoCircle className="mt-0.5 flex-shrink-0" />
                      <span>Each device can only be assigned to one group. Already assigned devices are disabled.</span>
                    </p>
                  </div>
                  
                  {availableDevices.map((device) => {
                    // Check if this device is assigned to another group
                    const isAssignedToOtherGroup = groups.some(group => 
                      group._id !== targetGroup._id && 
                      group.deviceIds.some(d => d._id === device._id)
                    );
                    
                    // Check if this device is selected for this group
                    const isSelected = selectedDeviceIds.has(device._id);
                    
                    return (
                      <div
                        key={device._id}
                        onClick={() => {
                          if (!isAssignedToOtherGroup) {
                            toggleDeviceSelection(device._id);
                          }
                        }}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          isAssignedToOtherGroup
                            ? "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
                            : isSelected
                              ? "border-blue-500 bg-blue-50 shadow-sm"
                              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isAssignedToOtherGroup
                              ? "bg-slate-200 border border-slate-300"
                              : isSelected
                                ? "bg-blue-500 text-white"
                                : "border-2 border-slate-300"
                          }`}
                        >
                          {!isAssignedToOtherGroup && isSelected && <FaCheck size={10} />}
                        </div>
                        <div className="flex-shrink-0 p-2 bg-slate-100 rounded-lg">
                          <FaDesktop className={`${
                            isAssignedToOtherGroup ? "text-slate-400" : "text-slate-600"
                          }`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-medium truncate ${
                            isAssignedToOtherGroup ? "text-slate-400" : "text-slate-900"
                          }`}>
                            {device.name}
                          </p>
                          <p className={`text-xs truncate ${
                            isAssignedToOtherGroup ? "text-slate-400" : "text-slate-500"
                          }`}>
                            SN: {device.serialNumber}
                          </p>
                        </div>
                        {isAssignedToOtherGroup ? (
                          <div className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                            Assigned elsewhere
                          </div>
                        ) : isSelected ? (
                          <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            Selected
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
              <p className="text-sm text-slate-500">
                {selectedDeviceIds.size} device(s) selected
              </p>
              <div className="flex gap-3">
                <button
                  onClick={resetAssignDevicesModal}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignDevices}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FaSave />
                      Save Connections
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Preview Modal */}
      {previewMedia && (
        <PreviewModal 
          media={previewMedia} 
          normalizeUrl={normalizeUrl} 
          onClose={() => setPreviewMedia(null)} 
        />
      )}
    </div>
  );
}

function MediaSelectionModal({
  title,
  allMedia,
  selectedMediaIds,
  toggleMediaSelection,
  mediaSearchTerm,
  setMediaSearchTerm,
  mediaFilterType,
  setMediaFilterType,
  normalizeUrl,
  getFileIcon,
  onClose,
  onSubmit,
  isSubmitting,
  submitLabel,
  groupName,
  setGroupName,
  groupDescription,
  setGroupDescription,
}: {
  title: string;
  allMedia: MediaFile[];
  selectedMediaIds: Set<string>;
  toggleMediaSelection: (id: string) => void;
  mediaSearchTerm: string;
  setMediaSearchTerm: (s: string) => void;
  mediaFilterType: string;
  setMediaFilterType: (t: any) => void;
  normalizeUrl: (url: string) => string;
  getFileIcon: (type: string) => React.ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitLabel: string;
  groupName: string;
  setGroupName: (s: string) => void;
  groupDescription: string;
  setGroupDescription: (s: string) => void;
}) {
  const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-orange-100">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
              <FaTimes />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Group Name & Description */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Group Name *</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Enter description (optional)"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                />
              </div>
            </div>

            {/* Media Selection Header */}
            <h3 className="text-sm font-medium text-slate-700 mb-3">
              Select Media Files ({selectedMediaIds.size} selected)
            </h3>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 flex-1">
                <Search size={16} className="text-slate-400 mr-2" />
                <input
                  value={mediaSearchTerm}
                  onChange={(e) => setMediaSearchTerm(e.target.value)}
                  placeholder="Search media..."
                  className="outline-none py-2 w-full text-sm bg-transparent"
                />
              </div>
              <div className="flex gap-2">
                {["all", "audio", "video", "image"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setMediaFilterType(type)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      mediaFilterType === type 
                        ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm" 
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Media Grid */}
            {allMedia.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FaFile className="text-4xl mx-auto mb-3 opacity-50" />
                <p>No media files available</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[40vh] overflow-y-auto p-1">
                {allMedia.map((m) => (
                  <div
                    key={m._id}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                      selectedMediaIds.has(m._id) 
                        ? "border-orange-500 ring-2 ring-orange-200" 
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Selection Checkbox */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMediaSelection(m._id);
                      }}
                      className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-all ${
                        selectedMediaIds.has(m._id) 
                          ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm" 
                          : "bg-white/90 border-2 border-slate-300 hover:border-orange-400"
                      }`}
                    >
                      {selectedMediaIds.has(m._id) && <FaCheck size={12} />}
                    </div>

                    {/* Preview Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewMedia(m);
                      }}
                      className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-slate-600 hover:text-blue-600 transition-all shadow-sm"
                      title="Preview"
                    >
                      <FaPlay size={8} />
                    </button>

                    {/* Thumbnail - Click to toggle selection */}
                    <div 
                      className="aspect-square bg-slate-200 overflow-hidden cursor-pointer group relative"
                      onClick={() => toggleMediaSelection(m._id)}
                    >
                      <MediaThumbnail file={m} normalizeUrl={normalizeUrl} />
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
                          selectedMediaIds.has(m._id) 
                            ? "bg-gradient-to-r from-orange-500 to-orange-600" 
                            : "bg-white/80"
                        }`}>
                          {selectedMediaIds.has(m._id) ? (
                            <FaCheck className="text-white" size={16} />
                          ) : (
                            <FaPlus className="text-slate-600" size={16} />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* File Info */}
                    <div className="p-1.5 bg-white">
                      <div className="flex items-center gap-1">
                        {getFileIcon(m.type)}
                        <span className="text-[10px] font-medium text-slate-700 truncate">{m.name}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
            <p className="text-sm text-slate-500">
              {selectedMediaIds.size} file(s) selected
            </p>
            <div className="flex gap-3">
              <button 
                onClick={onClose} 
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={onSubmit}
                disabled={isSubmitting || !groupName.trim() || selectedMediaIds.size === 0}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {isSubmitting && <FaSpinner className="animate-spin" />}
                {submitLabel}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal inside Selection Modal */}
      {previewMedia && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" 
          onClick={() => setPreviewMedia(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preview Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <h3 className="text-base font-semibold text-slate-800 truncate">{previewMedia.name}</h3>
                <button
                  onClick={() => toggleMediaSelection(previewMedia._id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0 ${
                    selectedMediaIds.has(previewMedia._id)
                      ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-gradient-to-r hover:from-orange-100 hover:to-orange-200 hover:text-orange-600"
                  }`}
                >
                  {selectedMediaIds.has(previewMedia._id) ? (
                    <>
                      <FaCheck size={12} />
                      Selected
                    </>
                  ) : (
                    <>
                      <FaPlus size={12} />
                      Add to Group
                    </>
                  )}
                </button>
              </div>
              <button 
                onClick={() => setPreviewMedia(null)} 
                className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50 ml-2"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Preview Content */}
            <div className="bg-black/95 flex items-center justify-center min-h-[400px] max-h-[60vh] p-4">
              {previewMedia.type === "image" && (
                <img 
                  src={normalizeUrl(previewMedia.url)} 
                  alt={previewMedia.name} 
                  className="max-w-full max-h-[55vh] object-contain rounded-lg" 
                  crossOrigin="anonymous" 
                />
              )}
              {previewMedia.type === "video" && (
                <video 
                  controls 
                  autoPlay 
                  className="max-w-full max-h-[55vh] rounded-lg" 
                  crossOrigin="anonymous"
                >
                  <source src={normalizeUrl(previewMedia.url)} />
                </video>
              )}
              {previewMedia.type === "audio" && (
                <div className="text-center w-full max-w-md">
                  <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mb-6 mx-auto shadow-lg shadow-orange-500/30">
                    <Music size={48} className="text-white" />
                  </div>
                  <p className="text-white mb-4 font-medium">{previewMedia.name}</p>
                  <audio 
                    controls 
                    autoPlay 
                    className="w-full" 
                    crossOrigin="anonymous"
                  >
                    <source src={normalizeUrl(previewMedia.url)} />
                  </audio>
                </div>
              )}
            </div>

            {/* Preview Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
              <span className="text-sm text-slate-500 capitalize">
                Type: {previewMedia.type}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewMedia(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    if (!selectedMediaIds.has(previewMedia._id)) {
                      toggleMediaSelection(previewMedia._id);
                    }
                    setPreviewMedia(null);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedMediaIds.has(previewMedia._id)
                      ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm"
                      : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-sm"
                  }`}
                >
                  {selectedMediaIds.has(previewMedia._id) ? "✓ Added" : "Add & Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MediaThumbnail({ file, normalizeUrl }: { file: MediaFile; normalizeUrl: (s: string) => string }) {
  const fullUrl = normalizeUrl(file.url);

  if (file.type === "image") {
    return (
      <img 
        src={fullUrl} 
        alt={file.name} 
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
        crossOrigin="anonymous" 
        loading="lazy" 
      />
    );
  }
  if (file.type === "video") {
    return (
      <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
        <Video className="text-blue-400 w-8 h-8" />
      </div>
    );
  }
  if (file.type === "audio") {
    return (
      <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
        <Music className="text-purple-400 w-8 h-8" />
      </div>
    );
  }
  return (
    <div className="w-full h-full bg-slate-100 flex items-center justify-center">
      <AlertCircle className="text-slate-400" size={24} />
    </div>
  );
}

function PreviewModal({ 
  media, 
  normalizeUrl, 
  onClose 
}: { 
  media: MediaFile; 
  normalizeUrl: (url: string) => string; 
  onClose: () => void;
}) {
  const fullUrl = normalizeUrl(media.url);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-base font-semibold text-slate-800 truncate pr-4">{media.name}</h3>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50"
          >
            <X size={20} />
          </button>
        </div>
        <div className="bg-black/95 flex items-center justify-center min-h-[400px] max-h-[70vh] p-4">
          {media.type === "image" && (
            <img 
              src={fullUrl} 
              alt={media.name} 
              className="max-w-full max-h-[60vh] object-contain rounded-lg" 
              crossOrigin="anonymous" 
            />
          )}
          {media.type === "video" && (
            <video 
              controls 
              autoPlay 
              className="max-w-full max-h-[60vh] rounded-lg" 
              crossOrigin="anonymous"
            >
              <source src={fullUrl} />
            </video>
          )}
          {media.type === "audio" && (
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mb-6 mx-auto animate-pulse">
                <Music size={40} className="text-white" />
              </div>
              <audio 
                controls 
                autoPlay 
                className="w-full max-w-md" 
                crossOrigin="anonymous"
              >
                <source src={fullUrl} />
              </audio>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}