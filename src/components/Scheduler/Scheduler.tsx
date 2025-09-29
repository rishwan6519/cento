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

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    setSelectedSlot({ start: slotInfo.start, end: slotInfo.end });
  };

  const handleAddEvent = () => {
    if (!selectedSlot) {
      alert("Please select a date/time on the calendar first!");
      return;
    }
    const newEvent: Event = {
      title: `Playlist ${events.length + 1}`,
      start: selectedSlot.start,
      end: selectedSlot.end,
    };
    setEvents([...events, newEvent]);
    setSelectedSlot(null);
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
          {/* Search Bar */}
           <div className="flex items-center bg-white rounded-xl shadow px-3 py-1.5">
            <Search className="text-gray-400 w-4 h-4 mr-2" />
             <input
              type="text"
              placeholder="Search"
              className="outline-none text-sm w-32 md:w-48 bg-transparent"
            />
          </div>
  
          {/* Notification Icon */}
          <button className="bg-white shadow rounded-xl p-2 hover:bg-gray-50 transition">
            <Bell className="text-orange-500 w-5 h-5" />
          </button>
  
          {/* Profile Icon */}
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
  eventPropGetter={() => ({
    style: {
      backgroundColor: "#CEF6FF",
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



