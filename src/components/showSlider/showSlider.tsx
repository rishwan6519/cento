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
  sliderName: string; // Slider set name
  sliders: SliderItem[];
  createdAt: string;
  updatedAt: string;
}

const SliderManager: React.FC = () => {
  const [sliderDocs, setSliderDocs] = useState<SliderDocument[]>([]);
  const [selectedSlider, setSelectedSlider] = useState<{ docId: string; slider: SliderItem } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) setUserId(storedUserId);
  }, []);

  useEffect(() => {
    if (userId) fetchSliders();
  }, [userId]);

  const fetchSliders = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sliders?userId=${userId}`);
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

  const handleDeleteSlider = async (docId: string, sliderIndex: number) => {
    if (!confirm("Are you sure you want to delete this slider?")) return;
    try {
      const res = await fetch(`/api/sliders/delete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId, sliderIndex }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to delete slider");
      toast.success("Slider deleted successfully");
      fetchSliders();
      setSelectedSlider(null);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to delete slider");
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Sliders</h2>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : sliderDocs.length === 0 ? (
        <p className="text-gray-500 text-center py-20">No sliders found. Upload to get started!</p>
      ) : (
        <div className="space-y-10">
          {sliderDocs.map((doc) => (
            <div key={doc._id}>
              <h3 className="text-xl font-semibold mb-4 text-gray-700">{doc.sliderName}</h3>
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

      {/* Modal */}
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
              <button
                onClick={() => {
                  const doc = sliderDocs.find((d) => d._id === selectedSlider.docId);
                  if (!doc) return;
                  const index = doc.sliders.findIndex((s) => s.url === selectedSlider.slider.url);
                  if (index === -1) return;
                  handleDeleteSlider(doc._id, index);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Delete
              </button>
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
