"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from 'react-hot-toast';
import {
  FaEye,
  FaCode,
  FaComments,
  FaUsers,
  FaUpload,
  FaArrowLeft,
} from "react-icons/fa";
import { motion } from "framer-motion";
import Image from "next/image";
import FloorMapUploader from "@/components/FloorMapUploader/FloorMapUploader"; // ✅ Update path as needed

// Dummy UI for Unauthorized Access
const DummyUI = ({ title, onBack }: { title: string; onBack: () => void }) => (
  <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
    <h2 className="text-3xl font-semibold mb-4">{title}</h2>
    <p className="mb-6 text-gray-500">You do not have access to this feature yet.</p>
    <button
      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
      onClick={onBack}
    >
      Back to Home
    </button>
  </div>
);

// People Detection Options UI
const PeopleDetectionOptions = ({ onBack, onUploadFloorPlan, onGoToPlatform }: { 
  onBack: () => void; 
  onUploadFloorPlan: () => void;
  onGoToPlatform: () => void;
}) => (
  <div className="min-h-screen bg-gradient-to-br from-white to-blue-100 flex flex-col items-center px-4 py-10">
    <motion.div
      className="w-full max-w-4xl flex items-center justify-between mb-8"
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
      >
        <FaArrowLeft />
        Back to Home
      </button>
      
      <div className="flex items-center gap-4">
        <Image
          src="/assets/logo.png"
          alt="Centelon Logo"
          width={40}
          height={40}
          className="rounded-xl"
        />
        <h1 className="text-2xl md:text-3xl font-bold text-blue-800 font-sans tracking-tight">
          People Detection Options
        </h1>
      </div>
      
      <div></div> {/* Spacer for centering */}
    </motion.div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl w-full">
      {/* Upload Floor Plan Option */}
      <motion.button
        className="bg-white rounded-2xl shadow-md p-8 flex flex-col items-center gap-4 hover:shadow-xl transition-all border border-gray-200 hover:scale-105"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onClick={onUploadFloorPlan}
      >
        <FaUpload className="text-4xl text-red-600" />
        <span className="text-xl font-medium text-gray-700">Upload Floor Plan</span>
        <p className="text-sm text-gray-500 text-center">
          Upload your building's floor plan for precise location mapping
        </p>
      </motion.button>

      {/* Go to People Detection Platform Option */}
      <motion.button
        className="bg-white rounded-2xl shadow-md p-8 flex flex-col items-center gap-4 hover:shadow-xl transition-all border border-gray-200 hover:scale-105"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onClick={onGoToPlatform}
      >
        <FaEye className="text-4xl text-green-600" />
        <span className="text-xl font-medium text-gray-700">Go to Detection Platform</span>
        <p className="text-sm text-gray-500 text-center">
          Access the main people detection interface and analytics
        </p>
      </motion.button>
    </div>
  </div>
);

const cardList = [
  {
    id: "customer interaction",
    label: "Customer Interaction",
    icon: <FaComments className="text-4xl text-purple-600" />,
    route: "/user-platform",
    apiKey: "platform",
  },
  {
    id: "blockcoding",
    label: "Block Coding",
    icon: <FaCode className="text-4xl text-blue-600" />,
    route: "/block-code",
    apiKey: "blockCoding",
  },
  {
    id: "detection",
    label: "People Detection",
    icon: <FaEye className="text-4xl text-green-600" />,
    route: "/people-detection",
    apiKey: "peopleDetection",
    hasOptions: true, // Special flag to show options instead of direct navigation
  },
];

const CustomerEngagementPlatform = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [dummyCard, setDummyCard] = useState<string | null>(null);
  const [showPeopleDetectionOptions, setShowPeopleDetectionOptions] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUserAccess = async () => {
      try {
        const id = localStorage.getItem("userId");
        const role = localStorage.getItem("userRole");
        
        if (!id || !role) {
          toast.error("Authentication required. Please log in.");
          router.push("/login"); // Redirect to login page
          return;
        }

        if (role !== "user") {
          toast.error("You are unauthorized to access this page", {
            duration: 4000,
            position: 'top-right',
            style: {
              background: '#ef4444',
              color: '#ffffff',
              fontWeight: 'bold',
            },
            icon: '🚫',
          });
          router.push("/login"); // Redirect to home or appropriate page
          return;
        }

        setUserId(id);
        setUserRole(role);
      } catch (error) {
        console.error("Error checking user access:", error);
        toast.error("An error occurred while verifying access");
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };

    checkUserAccess();
  }, [router]);

  const handleCardClick = async (card: typeof cardList[0]) => {
    if (!userId) {
      toast.error("User ID not found. Please log in.");
      return;
    }

    try {
      const res = await fetch(`/api/user/users?userId=${userId}`);
      const data = await res.json();

      if (data[card.apiKey]) {
        // If it's the People Detection card and has options, show options instead of navigating
        if (card.hasOptions && card.id === "detection") {
          setShowPeopleDetectionOptions(true);
        } else {
          router.push(card.route);
        }
      } else {
        setDummyCard(card.label);
        toast.error(`You don't have access to ${card.label}`, {
          duration: 3000,
          position: 'top-right',
        });
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      setDummyCard(card.label);
      toast.error("Failed to verify access permissions");
    }
  };

  const handleGoToPlatform = () => {
    router.push("/people-detection");
  };

  const handleUploadFloorPlan = () => {
    setShowUploader(true);
  };

  const handleBackToHome = () => {
    setShowPeopleDetectionOptions(false);
    setShowUploader(false);
    setDummyCard(null);
  };

  // Show loading state while checking user access
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (dummyCard) {
    return (
      <>
        <Toaster />
        <DummyUI title={dummyCard} onBack={handleBackToHome} />
      </>
    );
  }

  if (showUploader) {
    return (
      <>
        <Toaster />
        <div className="min-h-screen bg-blue-50">
          <FloorMapUploader />
          <div className="text-center mt-4">
            <button
              className="text-blue-600 underline flex items-center justify-center gap-2 mx-auto"
              onClick={handleBackToHome}
            >
              <FaArrowLeft /> Back to Home
            </button>
          </div>
        </div>
      </>
    );
  }

  if (showPeopleDetectionOptions) {
    return (
      <>
        <Toaster />
        <PeopleDetectionOptions
          onBack={handleBackToHome}
          onUploadFloorPlan={handleUploadFloorPlan}
          onGoToPlatform={handleGoToPlatform}
        />
      </>
    );
  }

  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-gradient-to-br from-white to-blue-100 flex flex-col items-center px-4 py-10">
        <motion.div
          className="flex items-center gap-4 mb-8"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Image
            src="/assets/logo.png"
            alt="Centelon Logo"
            width={50}
            height={50}
            className="rounded-xl"
          />
          <h1 className="text-3xl md:text-4xl font-bold text-blue-800 font-sans tracking-tight">
            Robotic Engagement Platform
          </h1>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-5xl w-full">
          {cardList.map((card, index) => (
            <motion.button
              key={card.id}
              className="bg-white rounded-2xl shadow-md p-8 flex flex-col items-center gap-4 hover:shadow-xl transition-all border border-gray-200 hover:scale-105"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15 }}
              onClick={() => handleCardClick(card)}
            >
              {card.icon}
              <span className="text-xl font-medium text-gray-700">{card.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </>
  );
};

export default CustomerEngagementPlatform;