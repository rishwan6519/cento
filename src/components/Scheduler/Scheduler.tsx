"use client";

import React, { useState } from "react";
import { Calendar, dateFnsLocalizer, SlotInfo, View, ToolbarProps } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import {enUS} from "date-fns/locale/en-US";
import { MdArrowBackIos, MdNavigateNext } from "react-icons/md";
import { FaTimes } from "react-icons/fa";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Bell, Search, User } from "lucide-react";

interface Event {
  title: string;
  start: Date;
  end: Date;
  resource?: {
    type: "playlist" | "announcement";
    originalName?: string;
    files?: any[];
    devices?: string[];
  };
}

// Configure date-fns localizer
const locales = {
  "en-US": enUS,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Custom Toolbar
const CustomToolbar: React.FC<ToolbarProps<Event> & { onAddEvent: () => void }> = ({
  label,
  onNavigate,
  onView,
  view,
  onAddEvent,
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-center mb-2 gap-2 md:gap-0">
      {/* Left: Prev / Month / Next */}
      <div className="flex items-center space-x-2">
        <button onClick={() => onNavigate("PREV")} className="p-1 rounded hover:bg-gray-200">
          <MdArrowBackIos size={20} />
        </button>
        <span className="font-semibold text-lg">{label}</span>
        <button onClick={() => onNavigate("NEXT")} className="p-1 rounded hover:bg-gray-200">
          <MdNavigateNext size={20} />
        </button>
      </div>

      {/* Middle: Views */}
      <div className="flex space-x-2">
        <button
          onClick={() => onView("day")}
          className={`px-3 py-1 rounded ${view === "day" ? "bg-[#07323C] text-white" : ""}`}
        >
          Day
        </button>
        <button
          onClick={() => onView("week")}
          className={`px-3 py-1 rounded ${view === "week" ? "bg-[#07323C] text-white" : ""}`}
        >
          Week
        </button>
        <button
          onClick={() => onView("month")}
          className={`px-3 py-1 rounded ${view === "month" ? "bg-[#07323C] text-white" : ""}`}
        >
          Month
        </button>
      </div>

      {/* Right: New Schedule removed as requested */}
      <div>
      </div>
    </div>
  );
};

const Scheduler: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>("month");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [modalEvents, setModalEvents] = useState<Event[]>([]);

  React.useEffect(() => {
    const fetchSchedules = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      try {
        const [playlistsRes, announcementsRes, devicesRes, dpRes] = await Promise.all([
          fetch(`/api/playlists?userId=${userId}`),
          fetch(`/api/announcement/get-announcement?userId=${userId}`),
          fetch(`/api/devices`),
          fetch(`/api/device-playlists?userId=${userId}`)
        ]);

        const playlists = playlistsRes.ok ? await playlistsRes.json() : [];
        const announcements = announcementsRes.ok ? (await announcementsRes.json()).announcements || [] : [];
        const allDevices = devicesRes.ok ? await devicesRes.json() : [];
        const linkedPlaylists = dpRes.ok ? await dpRes.json() : [];

        const deviceIdMap: Record<string, string> = {};
        allDevices.forEach((d: any) => {
          deviceIdMap[d._id] = d.name || d.serialNumber || "Unknown Device";
        });

        const playlistDeviceMap: Record<string, string[]> = {};
        if (Array.isArray(linkedPlaylists)) {
          linkedPlaylists.forEach(lp => {
            if (lp.playlistData && lp.playlistData._id && lp.deviceIds) {
              playlistDeviceMap[lp.playlistData._id] = lp.deviceIds.map((id: string) => deviceIdMap[id] || "Unknown Device");
            }
          });
        }

        const formattedEvents: Event[] = [];

        // Helper to span an event across ALL valid dates
        const getEventsForRange = (item: any, type: "playlist" | "announcement", name: string) => {
           let baseStart = item.startDate ? new Date(item.startDate) : new Date();
           let baseEnd = item.endDate ? new Date(item.endDate) : new Date(baseStart);
           
           if (isNaN(baseStart.getTime())) baseStart = new Date();
           if (isNaN(baseEnd.getTime())) baseEnd = new Date(baseStart);

           // Normalize to midnight
           baseStart.setHours(0,0,0,0);
           baseEnd.setHours(0,0,0,0);
           if (baseEnd < baseStart) baseEnd = new Date(baseStart);

           const startTime = item.startTime || "00:00"; 
           const endTime = item.endTime || "23:59";
           const [startH, startM] = startTime.split(':');
           const [endH, endM] = endTime.split(':');

           let curr = new Date(baseStart);
           const rangeEvents: Event[] = [];

           const itemDevices = playlistDeviceMap[item._id] || [];
           const itemFiles = item.files || [];

           while (curr <= baseEnd) {
             const start = new Date(curr);
             start.setHours(parseInt(startH), parseInt(startM), 0);
             
             const end = new Date(curr);
             end.setHours(parseInt(endH), parseInt(endM), 0);
             
             const timeTitle = `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;

             rangeEvents.push({
               title: timeTitle,
               start,
               end,
               resource: {
                 type,
                 originalName: name,
                 files: itemFiles,
                 devices: itemDevices
               }
             });
             
             curr.setDate(curr.getDate() + 1);
           }
           
           return rangeEvents;
        };

        playlists.forEach((p: any) => {
          formattedEvents.push(...getEventsForRange(p, "playlist", p.name || "Unnamed Playlist"));
        });

        announcements.forEach((a: any) => {
          formattedEvents.push(...getEventsForRange(a, "announcement", a.announcementName || "Unnamed Announcement"));
        });

        setEvents(formattedEvents);

      } catch (error) {
        console.error("Error fetching schedules:", error);
      }
    };

    fetchSchedules();
  }, []);

  const openModalForDate = (selectedD: Date) => {
    const dateEvents = events.filter(e => 
      e.start.getFullYear() === selectedD.getFullYear() &&
      e.start.getMonth() === selectedD.getMonth() &&
      e.start.getDate() === selectedD.getDate()
    );
    setModalDate(selectedD);
    setModalEvents(dateEvents);
    setShowModal(true);
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    setSelectedSlot({ start: slotInfo.start, end: slotInfo.end });
    openModalForDate(slotInfo.start);
  };

  const handleSelectEvent = (event: Event) => {
    openModalForDate(event.start);
  };

  const handleDrillDown = (date: Date) => {
    openModalForDate(date);
  };

  const handleAddEvent = () => {
    // Left empty since it requires a dedicated "Add Schedule" flow with device connections,
    // which was not specified. Typically would open a modal to navigate.
  };

  return (
    <>
      {/* Header */}
        <header className="px-6 pt-4 pb-3 border-b border-gray-200 bg-[#E6F9FD] flex items-center justify-between">
         {/* Left Content */}
         <div>
           <h1 className="text-2xl font-semibold text-gray-900 font-sans mb-1">
            Scheduler
           </h1>
           <p className="text-gray-700 font-sans text-sm max-w-xl">
           Here’s your schedule.
          </p>
        </div>
  
        {/* Right Content */}
        <div className="flex items-center gap-3">
          {/* Profile Icon removed */}
        </div>
      </header>

      {/* Calendar */}
      <div className="p-4 bg-blue-50 min-h-screen">
        
        <Calendar
  localizer={localizer}
  events={events}
  startAccessor="start"
  endAccessor="end"
  selectable
  onSelectSlot={handleSelectSlot}
  onSelectEvent={handleSelectEvent}
  onDrillDown={handleDrillDown}
  style={{ height: 600, width: "100%" }}
  views={["month", "week", "day"]}
  date={date}
  onNavigate={(newDate) => setDate(newDate)}
  view={view}
  onView={(newView: View) => setView(newView)}
  components={{
    toolbar: (props: ToolbarProps<Event>) => <CustomToolbar {...props} onAddEvent={handleAddEvent} />,
  }}
  eventPropGetter={(event: Event) => ({
    style: {
      backgroundColor: event.resource?.type === "announcement" ? "#FFCBA4" : "#CEF6FF", // Distinct colors
      color: "#000",
      borderRadius: "6px",
      padding: "2px 4px",
      fontWeight: "bold",
    },
  })}
/>
      </div>

      {/* Popup Modal for Date Info */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">
                {modalDate ? format(modalDate, "MMMM d, yyyy") : "Schedules"}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                title="Close"
              >
                <FaTimes size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {modalEvents.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {modalEvents.map((evt, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border-l-4 shadow-sm ${evt.resource?.type === 'announcement' ? 'border-orange-400 bg-orange-50/50' : 'border-blue-400 bg-blue-50/50'}`}>
                      <h3 className="font-bold text-lg text-gray-900 mb-1">
                        {evt.resource?.originalName}
                      </h3>
                      
                      {/* Main basic info */}
                      <div className="flex items-center gap-3 mb-3 mt-1">
                         <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 bg-white px-2 py-0.5 rounded shadow-sm border">
                           {evt.resource?.type}
                         </span>
                         <div className="inline-block bg-white px-2 py-0.5 rounded-md text-sm font-semibold border text-gray-700 shadow-sm">
                           {format(evt.start, "h:mm a")} - {format(evt.end, "h:mm a")}
                         </div>
                      </div>

                      {/* Display Connected Devices */}
                      {evt.resource?.devices && evt.resource.devices.length > 0 && (
                        <div className="mb-3">
                           <p className="text-xs font-bold text-gray-700 mb-1">Connected Devices:</p>
                           <div className="flex flex-wrap gap-1.5">
                             {evt.resource.devices.map((d, i) => (
                               <span key={i} className="text-xs bg-indigo-100/80 text-indigo-700 font-medium px-2 py-0.5 rounded-md border border-indigo-200">
                                 {d}
                               </span>
                             ))}
                           </div>
                        </div>
                      )}

                      {/* Display Files enclosed in Playlist */}
                      {evt.resource?.files && evt.resource.files.length > 0 && (
                        <div className="mt-2">
                           <p className="text-xs font-bold text-gray-700 mb-1">Files in Playlist:</p>
                           <ul className="text-[13px] text-gray-600 bg-white/60 rounded p-2 border border-white/40 shadow-sm space-y-1.5 max-h-32 overflow-y-auto">
                             {evt.resource.files.map((f: any, i: number) => (
                               <li key={i} className="flex items-center gap-2 truncate">
                                 <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                                 <span className="truncate" title={f.name || f.fileName || "Unnamed file"}>
                                   {f.name || f.fileName || "Unnamed file"}
                                 </span>
                               </li>
                             ))}
                           </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 font-medium">No schedules found for this date.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Scheduler; 



