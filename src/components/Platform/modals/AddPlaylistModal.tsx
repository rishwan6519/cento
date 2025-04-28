import React, { useState } from "react";
import  Button  from "../Button";
import { motion } from "framer-motion";

interface AddPlaylistModalProps {
    onClose: () => void;
    onSave: (name: string) => void;
  }
  
  const AddPlaylistModal: React.FC<AddPlaylistModalProps> = ({
    onClose,
    onSave,
  }) => {
    const [name, setName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      onSave(name);
      setIsSubmitting(false);
    };
  
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Create New Playlist</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Playlist Name <span className="text-danger-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g. Morning Greetings"
                required
              />
            </div>
            <div className="pt-2 flex justify-end space-x-3">
              <Button variant="secondary" onClick={onClose} type="button" disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || isSubmitting} loading={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Playlist"}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    );
  };
  
  export default AddPlaylistModal;