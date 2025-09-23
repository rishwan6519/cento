import React, { ReactElement } from "react";
import  Card  from "./Card";
import  Button  from "./Button";
import { FaPlus } from "react-icons/fa";

interface EmptyStateProps {
  message: string;
  icon: React.ReactNode;
  buttonText?: string; // Make optional
  onAddNew?: () => void; // Make optional
  role?: string; // Make optional
}

const EmptyState: React.FC<EmptyStateProps> = ({
  onAddNew,
  message,
  icon,
  buttonText,
  role,
}) => (
  <Card
    className="col-span-full flex flex-col items-center justify-center py-12 text-center"
    hoverEffect={false}
  >
    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
      {icon}
    </div>
    <h4 className="text-xl font-semibold text-gray-900 mb-1">
      No Device  Found
    </h4>
    <p className="text-gray-500 mb-6 max-w-md">{message}</p>
    {role === "superUser" && onAddNew && buttonText && (
      <Button
        onClick={onAddNew}
        icon={role === "superUser" ? <FaPlus className="text-center" /> : undefined}
      >
        {buttonText}
      </Button>
    )}
  </Card>
);

export default EmptyState;