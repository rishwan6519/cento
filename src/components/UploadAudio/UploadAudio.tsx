"use client";

import React, { useState, useEffect } from "react";
import { Upload, Trash2, X, Clock, CheckCircle2, AlertCircle } from "lucide-react"; // Added AlertCircle
import toast from "react-hot-toast";
import { FaFolder, FaFolderPlus, FaSpinner, FaCheck, FaPlus } from "react-icons/fa";

interface SelectedFile {
  id: string;
  name: string;
  type: string;
  file: File;
  previewUrl: string;
  status: "uploading" | "completed" | "failed" | "pending";
  progress: number;
  uploadedMediaId?: string;
  // Verification fields
  listenedTime: number;
  isVerified: boolean;
  isCorrupted?: boolean; // New field to track corrupted files
}

interface MediaGroup {
  _id: string;
  name: string;
  description?: string;
  mediaCount: number;
}

interface CreateMediaProps {
  onCancel: () => void;
  onSuccess: () => void;
}

const MAX_FILES = 15;
const MIN_PLAY_TIME = 5; // 5 seconds verification

const CreateMedia: React.FC<CreateMediaProps> = ({ onCancel, onSuccess }) => {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Group States
  const [groups, setGroups] = useState<MediaGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [assignToGroup, setAssignToGroup] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  useEffect(() => {
    if (userId) fetchGroups();
    return () => files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
  }, []);

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const response = await fetch(`/api/media-groups?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error("Group name is required");
      return;
    }
    setCreatingGroup(true);
    try {
      const response = await fetch("/api/media-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name: newGroupName.trim(),
          description: newGroupDescription.trim(),
          mediaIds: [],
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setGroups((prev) => [data.group, ...prev]);
        setSelectedGroupId(data.group._id);
        setShowCreateGroup(false);
        setNewGroupName("");
        setNewGroupDescription("");
        toast.success("Group created");
      }
    } catch (error) {
      toast.error("Failed to create group");
    } finally {
      setCreatingGroup(false);
    }
  };

  const processFiles = (incomingFiles: File[]) => {
    if (files.length + incomingFiles.length > MAX_FILES) {
      toast.error(`You can only upload a maximum of ${MAX_FILES} files.`);
      return;
    }

    const newFiles: SelectedFile[] = incomingFiles.map((file) => ({
      id: Math.random().toString(36).substring(2, 11),
      name: file.name,
      type: file.type || "audio/mpeg",
      file,
      previewUrl: URL.createObjectURL(file),
      status: "pending",
      progress: 0,
      listenedTime: 0,
      isVerified: false,
      isCorrupted: false, // Initialize as not corrupted
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  // Tracking playback time for verification
  const handleTimeUpdate = (id: string, currentTime: number) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === id && !f.isVerified) {
          if (currentTime >= MIN_PLAY_TIME) {
            return { ...f, isVerified: true, listenedTime: MIN_PLAY_TIME };
          }
          return { ...f, listenedTime: currentTime };
        }
        return f;
      })
    );
  };

  // Handle Audio Error (Corrupted file)
  const handleAudioError = (id: string) => {
    setFiles((prev) => 
      prev.map((f) => (f.id === id ? { ...f, isCorrupted: true } : f))
    );
  };

  const allVerified = files.length > 0 && files.every((f) => f.isVerified);
  const hasCorruptedFiles = files.some((f) => f.isCorrupted); // Check if any file is corrupted

  const uploadFile = (fileObj: SelectedFile, userId: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("files[0]", fileObj.file);
      formData.append("fileNames[0]", fileObj.name);
      formData.append("userId", userId);

      xhr.open("POST", "/api/media/upload", true);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setFiles((prev) => prev.map((f) => (f.id === fileObj.id ? { ...f, status: "uploading", progress } : f)));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const resp = JSON.parse(xhr.responseText);
          const mediaId = resp.mediaIds?.[0] || resp.id || resp._id;
          setFiles((prev) => prev.map((f) => (f.id === fileObj.id ? { ...f, status: "completed", progress: 100, uploadedMediaId: mediaId } : f)));
          resolve(mediaId);
        } else {
          resolve(null);
        }
      };
      xhr.send(formData);
    });
  };

  const handleSubmit = async () => {
    if (!allVerified || hasCorruptedFiles) return;
    setIsLoading(true);
    const loadingToast = toast.loading("Uploading files...");

    try {
      const uploadedIds: string[] = [];
      for (const f of files) {
        const id = await uploadFile(f, userId!);
        if (id) uploadedIds.push(id);
      }

      if (assignToGroup && selectedGroupId && uploadedIds.length > 0) {
        await fetch("/api/media-groups", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: selectedGroupId, mediaIds: uploadedIds }),
        });
      }
      toast.success("Successfully uploaded", { id: loadingToast });
      onSuccess();
    } catch (err) {
      toast.error("Upload failed", { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#DFF4F7] min-h-screen flex justify-center items-center p-6">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-7xl p-6 min-h-[600px]">
        <h2 className="text-lg font-semibold mb-6 flex justify-between">
          <span>Let's create new media</span>
          <span className="text-sm font-normal text-slate-500">
            {files.length} / {MAX_FILES} files
          </span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT COLUMN: UPLOAD & GROUPS */}
          <div className="space-y-6">
            <div
              className={`border-2 border-dashed rounded-lg h-56 flex flex-col items-center justify-center cursor-pointer transition ${
                isDragging ? "border-teal-500 bg-teal-50" : "border-gray-300"
              }`}
              onClick={() => document.getElementById("media-upload")?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFiles(Array.from(e.dataTransfer.files)); }}
            >
              <Upload className="h-12 w-12 text-orange-500" />
              <p className="mt-2 text-gray-600 text-sm font-medium">Click or drag & drop (Max 15)</p>
              <p className="text-gray-400 text-xs mt-1">Audio files only</p>
              <input id="media-upload" type="file" multiple hidden accept="audio/*" onChange={(e) => e.target.files && processFiles(Array.from(e.target.files))} />
            </div>

            {/* GROUP ASSIGNMENT SECTION */}
            {/* ... (Same as before) */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-slate-700 flex items-center gap-2">
                  <FaFolder className="text-orange-500" /> Assign to Group
                </h4>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={assignToGroup} onChange={(e) => setAssignToGroup(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-orange-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>

              {assignToGroup && (
                <div className="space-y-4">
                  {loadingGroups ? (
                    <div className="flex justify-center py-4"><FaSpinner className="animate-spin text-orange-500" /></div>
                  ) : (
                    <>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {groups.map((group) => (
                          <div
                            key={group._id}
                            onClick={() => setSelectedGroupId(group._id)}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                              selectedGroupId === group._id ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-white"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedGroupId === group._id ? "bg-orange-500 border-orange-500 text-white" : "border-slate-300"}`}>
                              {selectedGroupId === group._id && <FaCheck size={10} />}
                            </div>
                            <span className="text-sm font-medium">{group.name}</span>
                          </div>
                        ))}
                      </div>

                      {!showCreateGroup ? (
                        <button onClick={() => setShowCreateGroup(true)} className="w-full flex items-center justify-center gap-2 p-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:text-orange-500">
                          <FaFolderPlus /> Create New Group
                        </button>
                      ) : (
                        <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-3">
                          <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="New group name" className="w-full p-2 border rounded-md text-sm outline-none focus:border-orange-500" />
                          <button onClick={handleCreateGroup} disabled={creatingGroup} className="w-full bg-orange-500 text-white p-2 rounded-md text-sm font-medium flex justify-center items-center gap-2">
                            {creatingGroup ? <FaSpinner className="animate-spin" /> : <FaPlus />} Create & Select
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: PREVIEW & VERIFICATION */}
          <div className="flex flex-col">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              Verification <span className="text-xs font-normal text-slate-500">(Play each file for 5s)</span>
            </h3>
            <div className="flex-1 space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {files.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed rounded-lg py-12">
                   <p>No files selected for upload</p>
                </div>
              ) : (
                files.map((file) => (
                  <div key={file.id} className={`rounded-lg p-4 border shadow-sm transition-colors ${file.isCorrupted ? 'bg-red-50 border-red-200' : 'bg-[#EAF8FC] border-blue-100'}`}>
                    
                    {/* NEW: Corrupted file warning shown at the top of the file card */}
                    {file.isCorrupted && (
                      <div className="flex items-center gap-2 text-red-600 text-xs font-bold mb-3 p-2 bg-red-100 rounded-md">
                        <AlertCircle size={14} />
                        <span>File is corrupted or unplayable. Please remove this file to continue.</span>
                      </div>
                    )}

                    <div className="flex justify-between mb-2">
                      <div className="truncate flex-1 pr-4">
                        <p className={`text-sm font-bold truncate ${file.isCorrupted ? 'text-red-700' : 'text-slate-800'}`}>{file.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {file.isCorrupted ? (
                             <span className="text-xs text-red-500 font-medium">Error: Invalid Audio</span>
                          ) : file.isVerified ? (
                            <span className="text-xs text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={14} /> Verified</span>
                          ) : (
                            <span className="text-xs text-orange-600 flex items-center gap-1">
                              <Clock size={14} /> Play {Math.max(0, Math.ceil(MIN_PLAY_TIME - file.listenedTime))}s more
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => setFiles(prev => prev.filter(f => f.id !== file.id))} className="text-slate-400 hover:text-red-500">
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <audio
                      src={file.previewUrl}
                      controls
                      className="w-full h-8"
                      onTimeUpdate={(e) => handleTimeUpdate(file.id, e.currentTarget.currentTime)}
                      onError={() => handleAudioError(file.id)} // Detect corrupted files
                    />

                    {/* Progress indicator */}
                    <div className="w-full h-1.5 bg-slate-200 rounded-full mt-3 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          file.isCorrupted ? 'bg-red-400' : file.status === 'uploading' ? 'bg-blue-500' : file.isVerified ? 'bg-green-500' : 'bg-orange-400'
                        }`}
                        style={{ width: file.isCorrupted ? '100%' : file.status === 'uploading' ? `${file.progress}%` : `${(file.listenedTime / MIN_PLAY_TIME) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="mt-10 border-t pt-6 flex flex-col items-center gap-4">
          {/* UPDATED: Message for corrupted files */}
          {hasCorruptedFiles ? (
            <p className="text-sm text-red-600 font-bold flex items-center gap-2 animate-pulse">
              <AlertCircle size={16} /> One or more files are corrupted. Please remove them to enable upload.
            </p>
          ) : !allVerified && files.length > 0 && (
            <p className="text-sm text-red-500 font-medium animate-pulse">
              * Play all files for at least 5 seconds to unlock the upload button
            </p>
          )}

          <div className="flex gap-4">
            <button onClick={onCancel} disabled={isLoading} className="px-8 py-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              // UPDATED: Added !hasCorruptedFiles to the disable logic
              disabled={isLoading || !allVerified || hasCorruptedFiles || (assignToGroup && !selectedGroupId)}
              className={`px-10 py-2 rounded-lg text-white font-semibold transition-all shadow-md ${
                allVerified && !hasCorruptedFiles && !isLoading && (!assignToGroup || selectedGroupId)
                  ? "bg-teal-700 hover:bg-teal-800"
                  : "bg-slate-400 cursor-not-allowed"
              }`}
            >
              {isLoading ? "Uploading..." : assignToGroup ? "Upload & Add to Group" : "Upload to Library"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateMedia;