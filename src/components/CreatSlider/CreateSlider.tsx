"use client";
import React, { useState, useEffect } from "react";
import { Upload, Trash2, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

interface SliderItem {
  url: string;
  description: string;
}

interface SliderDocument {
  _id: string;
  userId: string;
  sliderName: string;
  sliders: SliderItem[];
}

interface SelectedItem {
  id: string;
  url: string;
  file?: File;
  description: string;
  isExisting?: boolean;
}

interface CreateSliderProps {
  onCancel: () => void;
  onSuccess: () => void;
  editingSlider?: SliderDocument | null;
}

const CreateSlider: React.FC<CreateSliderProps> = ({ onCancel, onSuccess, editingSlider }) => {
  const [sliderName, setSliderName] = useState(editingSlider?.sliderName || "");
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [availableMedia, setAvailableMedia] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const generateUniqueId = () => Math.random().toString(36).substring(2, 11);

  useEffect(() => {
    if (editingSlider) {
      const initialItems = editingSlider.sliders.map(s => ({
        id: generateUniqueId(),
        url: s.url,
        description: s.description,
        isExisting: true
      }));
      setItems(initialItems);
    }
    fetchMedia();
  }, [editingSlider]);

  const fetchMedia = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;
    setIsMediaLoading(true);
    try {
      const res = await fetch(`/api/media?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableMedia(data.media || []);
      }
    } catch (err) {
      console.error("Failed to fetch media", err);
    } finally {
      setIsMediaLoading(false);
    }
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []).map((file) => ({
      id: generateUniqueId(),
      url: URL.createObjectURL(file), // temp preview url
      file,
      description: "",
      isExisting: false
    }));
    setItems((prev) => [...prev, ...newFiles]);
  };

  const handleSelectFromMedia = (media: any) => {
    const newItem = {
      id: generateUniqueId(),
      url: media.url,
      description: media.description || "",
      isExisting: true
    };
    setItems((prev) => [...prev, newItem]);
    toast.success("Media added to slider");
  };

  const handleDeleteItem = (id: string) => setItems((prev) => prev.filter((item) => item.id !== id));

  const handleDescriptionChange = (id: string, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, description: value } : item))
    );
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).map((file) => ({
      id: generateUniqueId(),
      url: URL.createObjectURL(file),
      file,
      description: "",
      isExisting: false
    }));
    setItems((prev) => [...prev, ...droppedFiles]);
  };

  const handleSubmit = async () => {
    if (!sliderName.trim()) {
      toast.error("Please enter a slider name");
      return;
    }
    if (items.length === 0) {
      toast.error("Please add at least one image");
      return;
    }
    if (items.some((f) => f.description.trim() === "")) {
      toast.error("Each image must have a description");
      return;
    }

    const userId = localStorage.getItem("userId");
    if (!userId) {
      toast.error("User not authenticated");
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading(editingSlider ? "Updating slider..." : "Creating slider...");

    try {
      if (editingSlider) {
        // Handle Edit: We need to upload new files first or use existing URLs
        // For simplicity, let's assume we can mix them. 
        // But the API currently handles formData. Let's see if we can adapt it.
        // Actually, if editing, we might prefer a JSON payload if all are existing, 
        // or multipart if some are new.
        
        const finalSliders: SliderItem[] = [];
        const formData = new FormData();
        formData.append("userId", userId);
        formData.append("sliderId", editingSlider._id);
        formData.append("sliderName", sliderName);

        // Separate new files from existing urls
        for (const item of items) {
          if (item.file) {
            formData.append("files[]", item.file);
            formData.append("descriptions[]", item.description);
          } else {
            finalSliders.push({ url: item.url, description: item.description });
          }
        }
        
        // If we have existing ones, we need to tell the server. 
        // Let's modify the API to handle this or just send everything as JSON if no new files.
        // Wait, standardizing on JSON for updates is easier if we upload files separately.
        // But let's check if we can just send the existing ones in the body.
        
        // I will update the PATCH API to handle 'sliderId', 'sliderName', and 'sliders'.
        // To handle new files during edit, I'll first upload them.
        
        const newFiles = items.filter(i => i.file);
        for (const item of newFiles) {
          if (item.file) {
            const uploadFd = new FormData();
            uploadFd.append('file', item.file);
            uploadFd.append('userId', userId);
            const uploadRes = await fetch('/api/upload', { method: 'POST', body: uploadFd });
            const uploadData = await uploadRes.json();
            if (uploadData.success) {
              finalSliders.push({ url: uploadData.url, description: item.description });
            }
          }
        }
        
        // Now we have all urls in finalSliders
        const res = await fetch("/api/sliders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sliderId: editingSlider._id,
            sliderName,
            sliders: [...finalSliders, ...items.filter(i => i.isExisting && !finalSliders.find(fs => fs.url === i.url)).map(i => ({url: i.url, description: i.description}))]
          }),
        });
        
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Failed to update slider");
        toast.success("Slider updated successfully", { id: loadingToast });
      } else {
        // Create Mode
        const formData = new FormData();
        formData.append("userId", userId);
        formData.append("sliderName", sliderName);
        
        // Handle mixed creation: new files + existing media
        const existingItems = items.filter(i => !i.file);
        const newFiles = items.filter(i => i.file);
        
        if (existingItems.length > 0) {
          // If we have existing items, we need a way to tell the server about them.
          // Let's send them as a JSON string in formData.
          formData.append("existingSliders", JSON.stringify(existingItems.map(i => ({url: i.url, description: i.description}))));
        }

        newFiles.forEach((item) => {
          if (item.file) {
            formData.append("files[]", item.file);
            formData.append("descriptions[]", item.description);
          }
        });

        const res = await fetch("/api/sliders", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Failed to create slider");
        toast.success("Slider created successfully", { id: loadingToast });
      }

      setItems([]);
      setSliderName("");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operation failed", { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl text-black max-w-5xl mx-auto overflow-hidden border border-gray-100">
      <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{editingSlider ? "Edit Slider Group" : "Create New Slider Group"}</h2>
          <p className="text-blue-100 text-sm mt-1">{editingSlider ? "Update your collection details" : "Gather your assets in one place"}</p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <CheckCircle2 className="rotate-45" />
        </button>
      </div>

      <div className="flex flex-col lg:flex-row h-[70vh]">
        {/* Left Side: Configuration */}
        <div className="w-full lg:w-1/2 p-6 overflow-y-auto border-r border-gray-100 space-y-6 custom-scrollbar">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Slider Group Name</label>
            <input
              type="text"
              value={sliderName}
              onChange={(e) => setSliderName(e.target.value)}
              className="w-full p-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-blue-500 transition-all font-medium"
              placeholder="e.g., Summer Promotion 2024"
            />
          </div>

          <div>
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Current Collection</h3>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">{items.length} Items</span>
             </div>
             
             <div className="space-y-4">
                {items.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">Your collection is empty</p>
                    <p className="text-xs text-gray-400 mt-1">Upload files or select from media gallery</p>
                  </div>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow group">
                      <div className="flex gap-4">
                         <div className="relative w-24 h-24 flex-shrink-0">
                            <img src={item.url} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                            {!item.isExisting && (
                               <span className="absolute -top-2 -left-2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">NEW</span>
                            )}
                         </div>
                         <div className="flex-1 space-y-3">
                            <div className="flex justify-between items-start">
                               <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description</p>
                               <button onClick={() => handleDeleteItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                  <Trash2 size={16} />
                               </button>
                            </div>
                            <textarea
                              className="w-full p-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                              rows={2}
                              placeholder="Describe this image..."
                              value={item.description}
                              onChange={(e) => handleDescriptionChange(item.id, e.target.value)}
                            />
                         </div>
                      </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>

        {/* Right Side: Sources (Upload + Media) */}
        <div className="w-full lg:w-1/2 bg-gray-50 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
           {/* Upload Section */}
           <div>
              <h3 className="text-sm font-bold text-gray-600 uppercase tracking-widest mb-4">Choose Source</h3>
              <div
                className={`border-3 border-dashed ${
                  isDragging ? "border-blue-500 bg-blue-100" : "border-gray-200 bg-white"
                } rounded-2xl p-8 text-center hover:border-blue-400 transition-all cursor-pointer group shadow-sm`}
                onClick={() => document.getElementById("slider-upload")?.click()}
                onDragEnter={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                   <Upload className="text-blue-600 h-8 w-8" />
                </div>
                <p className="text-gray-800 font-bold">Upload from Device</p>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">Drag & Drop or Click to browse your local images. Supports JPG, PNG, GIF</p>
                <input
                  id="slider-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={handleFileSelection}
                />
              </div>
           </div>

           {/* Media Gallery */}
           <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-sm font-bold text-gray-600 uppercase tracking-widest">Media Gallery</h3>
                 <button onClick={fetchMedia} className="text-xs font-bold text-blue-600 hover:text-blue-700">Refresh</button>
              </div>
              
              <div className="bg-white rounded-2xl p-4 flex-1 overflow-y-auto border border-gray-100 shadow-sm">
                 {isMediaLoading ? (
                   <div className="flex justify-center py-20">
                     <div className="animate-spin h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full" />
                   </div>
                 ) : availableMedia.length === 0 ? (
                    <div className="text-center py-12">
                       <ImageIcon className="mx-auto text-gray-200 mb-2" size={32} />
                       <p className="text-gray-400 text-xs">No media files available</p>
                    </div>
                 ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                       {availableMedia.map((media) => (
                         <div 
                           key={media._id} 
                           onClick={() => handleSelectFromMedia(media)}
                           className="relative group cursor-pointer aspect-square rounded-xl overflow-hidden shadow-sm hover:ring-2 hover:ring-blue-500 transition-all"
                         >
                            <img src={media.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                               <CheckCircle2 className="text-white" size={24} />
                            </div>
                         </div>
                       ))}
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-6 border-t bg-white flex justify-between items-center">
        <button onClick={onCancel} className="px-6 py-2.5 text-gray-500 font-bold hover:text-gray-800 transition-colors">
          Discard Changes
        </button>
        <button
          onClick={handleSubmit}
          disabled={isLoading || items.length === 0 || !sliderName.trim()}
          className={`px-8 py-3 rounded-xl font-bold text-white shadow-xl transition-all ${
            isLoading || items.length === 0 || !sliderName.trim()
              ? "bg-gray-300 cursor-not-allowed shadow-none"
              : "bg-blue-600 hover:bg-blue-700 hover:-translate-y-1 shadow-blue-200"
          }`}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              <span>{editingSlider ? "Saving..." : "Creating..."}</span>
            </div>
          ) : (
            editingSlider ? "Update Slider Group" : "Create Slider Group"
          )}
        </button>
      </div>
    </div>
  );
};

export default CreateSlider;
