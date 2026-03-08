"use client";

import React, { useState } from "react";
import { Calendar, dateFnsLocalizer, SlotInfo, View, ToolbarProps } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import {enUS} from "date-fns/locale/en-US";
import { MdArrowBackIos, MdNavigateNext } from "react-icons/md";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Bell, Search, User } from "lucide-react";

interface Event {
  title: string;
  start: Date;
  end: Date;
  resource?: {
    type: "playlist" | "announcement";
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

      {/* Right: New Schedule */}
      <div>
        <button
          onClick={onAddEvent}
          className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 transition"
        >
          + New Schedule
        </button>
      </div>
    </div>
  );
};

const Scheduler: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>("month");

  React.useEffect(() => {
    const fetchSchedules = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      try {
        const [playlistsRes, announcementsRes] = await Promise.all([
          fetch(`/api/playlists?userId=${userId}`),
          fetch(`/api/announcement/get-announcement?userId=${userId}`)
        ]);

        const playlists = playlistsRes.ok ? await playlistsRes.json() : [];
        const announcements = announcementsRes.ok ? (await announcementsRes.json()).announcements || [] : [];

        const formattedEvents: Event[] = [];

        // Helper to format Date
        const getStartEndDates = (item: any) => {
           // Provide fallback to today if startDate is missing
           const baseDate = item.startDate ? new Date(item.startDate) : new Date();
           const startTime = item.startTime || "00:00"; 
           const endTime = item.endTime || "23:59";
           
           const [startH, startM] = startTime.split(':');
           const [endH, endM] = endTime.split(':');
           
           const start = new Date(baseDate);
           start.setHours(parseInt(startH), parseInt(startM), 0);
           
           const end = new Date(baseDate);
           end.setHours(parseInt(endH), parseInt(endM), 0);

           return { start, end };
        };

        playlists.forEach((p: any) => {
          const { start, end } = getStartEndDates(p);
          formattedEvents.push({
            title: p.name || "Unnamed Playlist",
            start,
            end,
            resource: { type: "playlist" }
          });
        });

        announcements.forEach((a: any) => {
          const { start, end } = getStartEndDates(a);
          formattedEvents.push({
            title: a.announcementName || "Unnamed Announcement",
            start,
            end,
            resource: { type: "announcement" }
          });
        });

        setEvents(formattedEvents);

      } catch (error) {
        console.error("Error fetching schedules:", error);
      }
    };

    fetchSchedules();
  }, []);

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    setSelectedSlot({ start: slotInfo.start, end: slotInfo.end });
  };

  const handleAddEvent = () => {
    // Left empty since it requires a dedicated "Add Schedule" flow with device connections,
    // which was not specified. Typically would open a modal to navigate.
    alert("Schedule creation requires linking to a specific Device via the platform dashboard.");
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
          {/* Profile Icon Only */}
          <button className="bg-white shadow rounded-xl p-2 hover:bg-gray-50 transition">
            <User className="text-orange-500 w-5 h-5" />
          </button>
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
    </>
  );
};

export default Scheduler; 



