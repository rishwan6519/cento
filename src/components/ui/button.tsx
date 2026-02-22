import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "outline" | "solid" | "ghost" | "link";
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "icon";
}

export function Button({ 
  children, 
  variant = "solid", 
  size = "md",
  className = "", 
  ...props 
}: ButtonProps) {
  // Base classes
  const baseClasses = "inline-flex items-center justify-center transition-all focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none";
  
  // Size classes
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
    xl: "px-8 py-4 text-lg",
    icon: "h-10 w-10",
  };

  // Variant classes
  const variants = {
    solid: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-slate-200 bg-transparent hover:bg-slate-100",
    ghost: "bg-transparent hover:bg-slate-100",
    link: "bg-transparent underline-offset-4 hover:underline text-blue-600 p-0",
  };

  // Border radius - Default to lg if not overridden in className
  const roundedClass = className.includes("rounded-") ? "" : "rounded-lg";

  return (
    <button
      type="button"
      className={`${baseClasses} ${sizes[size as keyof typeof sizes] || sizes.md} ${variants[variant as keyof typeof variants] || variants.solid} ${roundedClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
