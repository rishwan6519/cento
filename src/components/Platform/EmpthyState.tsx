import React, { ReactElement } from "react";
import  Card  from "./Card";
import  Button  from "./Button";
import { FaPlus } from "react-icons/fa";

interface EmptyStateProps {
  onAddNew: () => void;
  message: string;
  icon: ReactElement;
  buttonText: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  onAddNew,
  message,
  icon,
  buttonText,
}) => (
  <Card
    className="col-span-full flex flex-col items-center justify-center py-12 text-center"
    hoverEffect={false}
  >
    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
      {icon}
    </div>
    <h4 className="text-xl font-semibold text-gray-900 mb-1">
      No Items Found
    </h4>
    <p className="text-gray-500 mb-6 max-w-md">{message}</p>
    <Button onClick={onAddNew} icon={<FaPlus />}>
      {buttonText}
    </Button>
  </Card>
);

export default EmptyState;