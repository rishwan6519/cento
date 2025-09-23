import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "outline" | "solid";
  className?: string; // Allow custom styling
}

export function Button({ children, variant = "solid", className = "", ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`px-4 py-2 rounded-lg transition-all ${
        variant === "outline"
          ? "border border-gray-300 text-gray-700 hover:bg-gray-100"
          : "bg-blue-500 text-white hover:bg-blue-600"
      } ${className}`}
      {...props} // Spread other button props (e.g., onClick)
    >
      {children}
    </button>
  );
}

export default Button;
