"use client";
import React from "react";
import InstantaneousAnnouncement from "@/components/InstantaneousAnnouncement/InstantaneousAnnouncement";

interface CreateInstantAnnouncementProps {
  onNavigate?: (view: any) => void;
}

const CreateInstantAnnouncement: React.FC<CreateInstantAnnouncementProps> = ({ onNavigate }) => {
  const handleCancel = () => {
    onNavigate ? onNavigate("dashboard") : window.history.back();
  };
  const handleSuccess = () => {
    // Stay on page — component handles success internally
  };
  return <InstantaneousAnnouncement onCancel={handleCancel} onSuccess={handleSuccess} />;
};

export default CreateInstantAnnouncement;
