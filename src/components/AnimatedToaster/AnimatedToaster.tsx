"use client";

import React from "react";
import { Toaster } from "react-hot-toast";
import type { Toast } from "react-hot-toast";
import { motion } from "framer-motion";

export default function AnimatedToaster(): JSX.Element {
  return (
    <Toaster
      position="top-left"
      gutter={20}
      toastOptions={{
        duration: 3000,
      }}
    >
      {(t: Toast) => (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="bg-black text-white px-4 py-3 rounded-lg shadow-lg max-w-md"
        >
          {t.message}
        </motion.div>
      )}
    </Toaster>
  );
}
