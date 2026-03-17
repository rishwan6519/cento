"use client";
import React, { useState, useEffect } from "react";

interface Slide {
  id: string;
  src: string;
  alt: string;
  description: string;
}

const SliderDisplay: React.FC = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchSliderData = async () => {
      try {
        const response = await fetch("/api/sliders");
        const result = await response.json();

        if (result.success && result.data?.length > 0) {
          const latestSlider = result.data[0];
          const sliderItems = latestSlider.sliders || [];

          const formattedSlides: Slide[] = sliderItems.map((item: any, index: number) => ({
            id: item._id || index.toString(),
            src: item.url,
            alt: item.description || `Slide ${index + 1}`,
            description: item.description || "",
          }));

          setSlides(formattedSlides);
        }
      } catch (error) {
        console.error("Error fetching slider data:", error);
      }
    };

    fetchSliderData();
  }, []);

  useEffect(() => {
    if (slides.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <div className="relative w-full max-w-[320px] h-[450px] shrink-0 rounded-2xl overflow-hidden shadow-2xl group bg-gray-900 mx-auto lg:mx-0">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 w-full h-full transition-all duration-1000 ease-in-out transform ${
            index === currentIndex
              ? "opacity-100 scale-100 z-10"
              : "opacity-0 scale-110 z-0"
          }`}
        >
          <img
            src={slide.src}
            alt={slide.alt}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        </div>
      ))}

      {/* Content Overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-8 text-white">
        <div 
          className="transform transition-all duration-700 ease-out translate-y-0 opacity-100"
          key={currentIndex}
        >
          <h3 className="text-lg md:text-xl font-bold mb-2 drop-shadow-md">
            {slides[currentIndex]?.description || "Featured Highlight"}
          </h3>
        </div>
      </div>

      {/* Indicators */}
      <div className="absolute bottom-6 right-6 z-20 flex gap-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 rounded-full transition-all duration-500 ${
              idx === currentIndex
                ? "w-8 bg-orange-500"
                : "w-2 bg-white/50 hover:bg-white"
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default SliderDisplay;
