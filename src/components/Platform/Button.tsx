import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps {
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  loading?: boolean; // Add loading prop
}

const Button: React.FC<ButtonProps> = ({
  children,
  type = 'button',
  variant = 'primary',
  className = '',
  disabled = false,
  onClick,
  icon,
  loading = false // Add loading prop with default value
}) => {
  const baseStyles = "inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all duration-200";
  
  const variantStyles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
  };

  return (
    <motion.button
      type={type}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`${baseStyles} ${variantStyles[variant]} ${className} ${
        disabled || loading ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <div className="flex items-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {children}
        </div>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </motion.button>
  );
};

export default Button;