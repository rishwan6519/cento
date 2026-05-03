"use client";
import React from "react";
import CreateAnnouncement from "../store_user/CreateAnnouncement";

export default function CreateAnnouncementView(props: any) {
  return <CreateAnnouncement {...props} isInstant={false} />;
}
