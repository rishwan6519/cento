import React from "react";

export function CardContent({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2">{children}</div>;
}

export default CardContent;
