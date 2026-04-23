"use client";
import React from "react";
import CreateAnnouncementWizard from "../components/CreateAnnouncementWizard";
import type { ViewKey } from "./page";

interface CreateAnnouncementViewProps {
  onNavigate: (view: ViewKey) => void;
}

const CreateAnnouncementView: React.FC<CreateAnnouncementViewProps> = ({ onNavigate }) => {
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") ?? "" : "";

  return (
    <div className="pb-12">
      <h1 className="text-3xl font-bold text-[#10353C] mb-1 px-8 lg:px-10">Create announcement</h1>
      <p className="text-sm text-[#64748B] mb-8 px-8 lg:px-10">Configure and broadcast your audio announcement across selected stores.</p>
      
      <CreateAnnouncementWizard 
        userId={userId}
        userRole="store"
        onNavigate={onNavigate}
      />
    </div>
  );
};

export default CreateAnnouncementView;
