import React from "react";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white p-4 rounded-lg shadow-md border border-gray-200 ${className || ""}`}>
      {children}
    </div>
  );
}

export default Card;
