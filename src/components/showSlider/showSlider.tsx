"use client";
import React, { useState, useEffect } from "react";
import { Trash2, XCircle } from "lucide-react";
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
  createdAt: string;
  updatedAt: string;
}

interface SliderManagerProps {
  onEdit?: (slider: SliderDocument) => void;
}

const SliderManager: React.FC<SliderManagerProps> = ({ onEdit }) => {
  const [sliderDocs, setSliderDocs] = useState<SliderDocument[]>([]);
  const [selectedSlider, setSelectedSlider] = useState<{ docId: string; slider: SliderItem } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedUserRole = localStorage.getItem("userRole");
    if (storedUserRole) setUserRole(storedUserRole);
    fetchSliders();
  }, []);

  const fetchSliders = async () => {
    setIsLoading(true);
    try {
      // Fetch all sliders globally (not user-specific)
      const res = await fetch(`/api/sliders`);
      if (!res.ok) throw new Error("Failed to fetch sliders");
      const data = await res.json();
      setSliderDocs(data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch sliders");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSliderImage = async (docId: string, sliderIndex: number) => {
    if (!confirm("Are you sure you want to delete this image from the slider?")) return;
    try {
      const res = await fetch(`/api/sliders/delete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId, sliderIndex }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to delete slider image");
      toast.success("Slider image deleted successfully");
      fetchSliders();
      setSelectedSlider(null);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to delete slider image");
    }
  };

  const handleRemoveEntireSlider = async (sliderId: string) => {
    if (!confirm("Are you sure you want to remove this entire slider set? All store users will lose their slider.")) return;
    try {
      const res = await fetch(`/api/sliders?sliderId=${sliderId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to remove slider");
      toast.success("Slider removed successfully. You can now create a new one.");
      fetchSliders();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to remove slider");
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Slider Manager</h2>
        {sliderDocs.length > 0 && (
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">
            Active — Visible to all stores
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : sliderDocs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
            <Trash2 size={32} />
          </div>
          <p className="text-gray-500 font-medium">No slider has been created yet.</p>
          <p className="text-gray-400 text-sm mt-1">Create a slider to display it on all store user dashboards.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {sliderDocs.map((doc) => (
            <div key={doc._id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">{doc.sliderName}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {doc.sliders.length} images • Created {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {userRole === "admin" && (
                  <div className="flex gap-3">
                    {onEdit && (
                      <button
                        onClick={() => onEdit?.(doc)}
                        className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold hover:bg-blue-100 transition-colors"
                      >
                        Edit Slider
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveEntireSlider(doc._id)}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100 transition-colors"
                    >
                      Remove Slider
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {doc.sliders.map((slider, index) => (
                  <div
                    key={index}
                    className="relative group cursor-pointer overflow-hidden rounded-xl shadow hover:shadow-lg transition-shadow duration-300"
                    onClick={() => setSelectedSlider({ docId: doc._id, slider })}
                  >
                    <img src={slider.url} alt={slider.description} className="w-full h-52 object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-white text-sm truncate">{slider.description || "No description"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {selectedSlider && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 max-w-full relative shadow-lg">
            <button
              onClick={() => setSelectedSlider(null)}
              className="absolute top-3 right-3 p-1 text-gray-600 hover:text-red-500"
            >
              <XCircle size={24} />
            </button>

            <img
              src={selectedSlider.slider.url}
              alt={selectedSlider.slider.description}
              className="w-full h-64 object-cover rounded-lg mb-4"
            />

            <h3 className="font-semibold text-lg mb-2">Description</h3>
            <p className="text-gray-700">{selectedSlider.slider.description || "No description provided."}</p>

            <div className="flex justify-end gap-3 mt-6">
              {userRole === "admin" && (
                <button
                  onClick={() => {
                    const doc = sliderDocs.find((d) => d._id === selectedSlider.docId);
                    if (!doc) return;
                    const index = doc.sliders.findIndex((s) => s.url === selectedSlider.slider.url);
                    if (index === -1) return;
                    handleDeleteSliderImage(doc._id, index);
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                >
                  Delete Image
                </button>
              )}
              <button
                onClick={() => setSelectedSlider(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SliderManager;
