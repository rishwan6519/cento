import React, { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
}

export function Card({ children }: CardProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
      {children}
    </div>
  );
}
