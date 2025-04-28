// src/components/platform/StatusBadge.tsx
import { DeviceStatus } from "./types";

export const StatusBadge: React.FC<{ status: DeviceStatus }> = ({ status }) => {
  const statusConfig = {
    Connected: {
      bg: "bg-green-50",
      text: "text-green-700",
      dot: "bg-green-500",
    },
    Disconnected: {
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      dot: "bg-yellow-500",
    },
    Offline: {
      bg: "bg-red-50",
      text: "text-red-700",
      dot: "bg-red-500",
    },
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[status].bg} ${statusConfig[status].text}`}>
      <span className={`w-2 h-2 rounded-full mr-1.5 ${statusConfig[status].dot}`}></span>
      {status}
    </span>
  );
};