"use client";
import React, { useEffect, useState } from "react";

export default function ChatWidget() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    // Only access localStorage on the client side
    setRole(localStorage.getItem("userRole"));
  }, []);

  useEffect(() => {
    const allowedRoles = ["reseller", "account", "admin", "marketing", "store_user", "store"];
    
    if (role && allowedRoles.some(r => role.toLowerCase().includes(r))) {
      // Prevent adding the script multiple times
      if (document.getElementById("store-sparc-chat-widget-script")) return;

      const script = document.createElement("script");
      script.id = "store-sparc-chat-widget-script";
      script.src = "/smartagile-chat-widget.js";
      script.crossOrigin = "anonymous";
      script.defer = true;
      script.dataset.auto = "false"; // Disable auto-init to prevent errors

      script.onload = () => {
        if ((window as any).SmartAgileChat && typeof (window as any).SmartAgileChat.init === "function") {
          // Initialize the widget manually
          (window as any).SmartAgileChat.init({
            baseUrl: window.location.origin,
            pathPrefix: "/api/chat-proxy",
            embedToken: "pk_robotics_d9b89cfeb97c5fbb0a1f1c5115c991cbd3a44050b85e5c5f",
            title: "StoreSPARC Assistant",
            greeting: "Hi! 👋 Ask me about StoreSPARC Multimedia — pricing, plans, features.",
            suggestions: ["How much does it cost?", "Annual vs Monthly?", "Book a demo"],
            accentColor: "#0066CC"
          });
          console.log("Chat widget initialized successfully");
        }
      };

      document.body.appendChild(script);
      console.log("Chat widget script appended to body");
    }
  }, [role]);

  return null;
}
