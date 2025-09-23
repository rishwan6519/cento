import React from "react";
import { motion } from "framer-motion";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  className = "",
  hoverEffect = true,
}) => (
  <motion.div
    className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all ${className}`}
    whileHover={hoverEffect ? { y: -2, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" } : {}}
  >
    {children}
  </motion.div>
);

export default Card;