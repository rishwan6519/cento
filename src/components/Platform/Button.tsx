import React from "react";

interface ButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: "primary" | "secondary" | "success" | "danger";
    className?: string;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
    icon?: React.ReactNode;
    loading?: boolean;
  }
  

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
  type = "button",
  icon,
  loading = false,
}) => {
  const baseClasses =
    "px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 text-sm";

  const variantClasses = {
    primary: `bg-primary-500 text-white hover:bg-primary-600 disabled:bg-primary-300 ${loading ? "bg-primary-400" : ""}`,
    secondary: `bg-white text-secondary-600 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 disabled:bg-gray-100 disabled:text-gray-400`,
    success: `bg-success-500 text-white hover:bg-success-600 disabled:bg-success-300 ${loading ? "bg-success-400" : ""}`,
    danger: `bg-danger-500 text-white hover:bg-danger-600 disabled:bg-danger-300 ${loading ? "bg-danger-400" : ""}`,
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
      ) : (
        icon && <span className="text-base">{icon}</span>
      )}
      {children}
    </button>
  );
};

export default Button;