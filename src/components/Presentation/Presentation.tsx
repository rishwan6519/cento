"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Upload, Trash2, Plus, Type, Image as ImageIcon, 
  Play, Pause, RotateCcw, Wand2, Settings, 
  MoveUp, Sparkles, AlignLeft
} from "lucide-react";
import toast from "react-hot-toast";

interface SelectedFile {
  id: string;
  name: string;
  type: string;
  file: File;
  previewUrl: string;
}

interface Slide {
  id: string;
  title: string;
  content: string;
  mediaId: string | null;
  animation: "fade" | "slideUp" | "zoom" | "flip" | "none";
  duration: number;
  textAlign: "left" | "center" | "right";
}

const CreatePresentation = ({ onCancel, onSuccess }: { onCancel: () => void, onSuccess: () => void }) => {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- 1. FILE HANDLING ---
  const handleFiles = (incomingFiles: File[]) => {
    const newFiles = incomingFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.type,
      file,
      previewUrl: URL.createObjectURL(file)
    }));
    setFiles(prev => [...prev, ...newFiles]);
    toast.success(`${newFiles.length} files added`);
  };

  // --- 2. AUTOMATION: CONVERT IMAGES TO SLIDES ---
  const convertImagesToSlides = () => {
    if (files.length === 0) return toast.error("Upload images first!");
    
    const newSlides: Slide[] = files.map((file, index) => ({
      id: Math.random().toString(36).substr(2, 9),
      title: `Slide ${index + 1}`,
      content: "Click to edit this description...",
      mediaId: file.id,
      animation: "fade",
      duration: 3000,
      textAlign: "center"
    }));
    
    setSlides(newSlides);
    setActiveIndex(0);
    toast.success("Slides generated from images!");
  };

  // --- 3. SLIDE EDITING ---
  const updateActiveSlide = (updates: Partial<Slide>) => {
    setSlides(prev => prev.map((s, i) => i === activeIndex ? { ...s, ...updates } : s));
  };

  const addBlankSlide = () => {
    const newSlide: Slide = {
      id: Math.random().toString(36).substr(2, 9),
      title: "New Slide",
      content: "New Content",
      mediaId: null,
      animation: "slideUp",
      duration: 3000,
      textAlign: "center"
    };
    setSlides([...slides, newSlide]);
    setActiveIndex(slides.length);
  };

  // --- 4. PLAYBACK SYSTEM ---
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setActiveIndex(prev => {
          if (prev >= slides.length - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, slides[activeIndex]?.duration || 3000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, activeIndex, slides]);

  const currentSlide = slides[activeIndex];
  const currentMedia = files.find(f => f.id === currentSlide?.mediaId);

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      {/* HEADER */}
      <header className="h-16 bg-white border-b px-6 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-2">
          <div className="bg-teal-600 p-2 rounded-lg">
            <ImageIcon className="text-white" size={20} />
          </div>
          <h1 className="font-bold text-slate-800">SlideCraft AI</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button onClick={convertImagesToSlides} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold shadow-md hover:bg-amber-600">
            <Wand2 size={16} /> Auto-Generate
          </button>
          <button onClick={onSuccess} className="px-6 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-teal-700">Save Project</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR: Assets & Timeline */}
        <aside className="w-72 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Media Assets</label>
            <div 
              onDragOver={(e) => {e.preventDefault(); setIsDragging(true)}}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {e.preventDefault(); setIsDragging(false); handleFiles(Array.from(e.dataTransfer.files))}}
              className={`mt-2 border-2 border-dashed rounded-xl p-4 transition-all text-center cursor-pointer ${isDragging ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-teal-400'}`}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="mx-auto text-slate-400 mb-1" size={20} />
              <span className="text-[10px] text-slate-500 font-medium">Upload Media</span>
              <input id="file-input" type="file" multiple hidden onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))} />
            </div>
            
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
              {files.map(f => (
                <img key={f.id} src={f.previewUrl} className="w-12 h-12 object-cover rounded-md border border-slate-200" alt="thumb" />
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Presentation Slides</label>
            {slides.map((s, i) => (
              <div 
                key={s.id} 
                onClick={() => setActiveIndex(i)}
                className={`group relative p-3 rounded-xl border-2 cursor-pointer transition-all ${activeIndex === i ? 'border-teal-500 bg-teal-50 shadow-sm' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-16 h-10 bg-slate-200 rounded overflow-hidden flex-shrink-0">
                    {files.find(f => f.id === s.mediaId) && <img src={files.find(f => f.id === s.mediaId)?.previewUrl} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{s.title}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase">{s.animation}</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setSlides(slides.filter(x => x.id !== s.id)); }}
                  className="absolute -top-1 -right-1 bg-white border shadow-sm rounded-full p-1 opacity-0 group-hover:opacity-100 text-red-500"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button onClick={addBlankSlide} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50">
              <Plus size={16} /> Add Slide
            </button>
          </div>
        </aside>

        {/* CENTER: Preview Canvas */}
        <main className="flex-1 bg-[#F1F5F9] p-8 flex flex-col items-center">
          <div className="w-full max-w-4xl flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsPlaying(!isPlaying)} className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold text-white shadow-lg transition-all ${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-800 hover:bg-black'}`}>
                {isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" />}
                {isPlaying ? "Stop" : "Play Preview"}
              </button>
              <span className="text-sm font-bold text-slate-500">Slide {activeIndex + 1} of {slides.length}</span>
            </div>
            <div className="flex bg-white rounded-lg p-1 border shadow-sm">
              <button className="p-2 hover:bg-slate-100 rounded" onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}><RotateCcw size={16} /></button>
              <button className="p-2 hover:bg-slate-100 rounded" onClick={() => setActiveIndex(Math.min(slides.length - 1, activeIndex + 1))}><RotateCcw size={16} className="rotate-180" /></button>
            </div>
          </div>

          <div className="w-full max-w-4xl aspect-video bg-black rounded-2xl shadow-2xl overflow-hidden relative border-4 border-white">
            {currentSlide ? (
              <div key={activeIndex} className={`absolute inset-0 flex flex-col justify-center items-center p-12 text-center animate-${currentSlide.animation}`}>
                {currentMedia && (
                  <img src={currentMedia.previewUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                )}
                <div className="relative z-10 w-full" style={{ textAlign: currentSlide.textAlign }}>
                   <h1 className="text-5xl md:text-6xl font-black text-white drop-shadow-2xl mb-4 leading-tight">
                    {currentSlide.title}
                   </h1>
                   <p className="text-lg md:text-xl text-slate-100 drop-shadow-md max-w-2xl mx-auto opacity-90">
                    {currentSlide.content}
                   </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600">
                Create a slide to begin
              </div>
            )}
          </div>
        </main>

        {/* RIGHT SIDEBAR: Property Editor */}
        <aside className="w-80 bg-white border-l p-6 overflow-y-auto">
          {currentSlide ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings size={18} className="text-teal-600" />
                <h3 className="font-bold text-slate-800">Slide Properties</h3>
              </div>

              {/* TEXT EDITOR */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2"><Type size={14}/> Slide Title</label>
                  <input 
                    type="text" 
                    value={currentSlide.title} 
                    onChange={(e) => updateActiveSlide({ title: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 ring-teal-500 outline-none font-medium text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2"><AlignLeft size={14}/> Description</label>
                  <textarea 
                    rows={4}
                    value={currentSlide.content} 
                    onChange={(e) => updateActiveSlide({ content: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 ring-teal-500 outline-none font-medium text-sm"
                  />
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* ANIMATION PICKER */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-3"><Sparkles size={14}/> Transition Effect</label>
                <div className="grid grid-cols-2 gap-2">
                  {['none', 'fade', 'slideUp', 'zoom', 'flip'].map((anim) => (
                    <button
                      key={anim}
                      onClick={() => updateActiveSlide({ animation: anim as any })}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border-2 transition-all ${currentSlide.animation === anim ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'}`}
                    >
                      {anim.charAt(0).toUpperCase() + anim.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* TIMING */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2"><MoveUp size={14} className="rotate-90"/> Display Duration (ms)</label>
                <input 
                  type="number" 
                  step={500}
                  value={currentSlide.duration} 
                  onChange={(e) => updateActiveSlide({ duration: parseInt(e.target.value) })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700"
                />
              </div>

              {/* MEDIA ASSIGNMENT */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2"><ImageIcon size={14}/> Change Background</label>
                <select 
                   value={currentSlide.mediaId || ''}
                   onChange={(e) => updateActiveSlide({ mediaId: e.target.value || null })}
                   className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium"
                >
                  <option value="">No Background</option>
                  {files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <Type size={48} className="mb-2" />
              <p className="text-sm font-medium">Select a slide to edit its properties</p>
            </div>
          )}
        </aside>
      </div>

      <style jsx>{`
        @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes zoom { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes flip { from { transform: rotateX(90deg); opacity: 0; } to { transform: rotateX(0); opacity: 1; } }
        
        .animate-fade { animation: fade 0.8s ease-out forwards; }
        .animate-slideUp { animation: slideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .animate-zoom { animation: zoom 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-flip { animation: flip 0.8s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default CreatePresentation;