"use client";
import React from "react";
import CreateAnnouncement from "../store_user/CreateAnnouncement";

export default function CreateInstantAnnouncement(props: any) {
  return <CreateAnnouncement {...props} isInstant={true} />;
}
