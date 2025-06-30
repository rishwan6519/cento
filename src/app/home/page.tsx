"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaEye,
  FaCode,
  FaComments,
  FaUsers,
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

const cardList = [
  {
    id: "customer interaction",
    label: "Customer Interaction",
    icon: <FaComments className="text-4xl text-purple-600" />,
    route: "/user-platform",
    apiKey: "blockCoding",
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
  },
];

const CustomerEngagementPlatform = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [dummyCard, setDummyCard] = useState<string | null>(null);
  const [hasPeopleDetection, setHasPeopleDetection] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (!id) return;

    setUserId(id);

    const fetchUserAccess = async () => {
      try {
        const res = await fetch(`/api/user/users?userId=${id}`);
        const data = await res.json();
        if (data.peopleDetection) {
          setHasPeopleDetection(true);
        }
      } catch (error) {
        console.error("Failed to fetch user access info", error);
      }
    };

    fetchUserAccess();
  }, []);

  const handleCardClick = async (card: typeof cardList[0]) => {
    if (!userId) {
      alert("User ID not found. Please log in.");
      return;
    }

    try {
      const res = await fetch(`/api/user/users?userId=${userId}`);
      const data = await res.json();

      if (data[card.apiKey]) {
        router.push(card.route);
      } else {
        setDummyCard(card.label);
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      setDummyCard(card.label);
    }
  };

  if (dummyCard) {
    return <DummyUI title={dummyCard} onBack={() => setDummyCard(null)} />;
  }

  if (showUploader) {
    return (
      <div className="min-h-screen bg-blue-50">
        <FloorMapUploader />
        <div className="text-center mt-4">
          <button
            className="text-blue-600 underline"
            onClick={() => setShowUploader(false)}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
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

        {hasPeopleDetection && (
          <motion.button
            className="bg-white rounded-2xl shadow-md p-8 flex flex-col items-center gap-4 hover:shadow-xl transition-all border border-gray-200 hover:scale-105"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: cardList.length * 0.15 }}
            onClick={() => setShowUploader(true)}
          >
            <FaUsers className="text-4xl text-red-600" />
            <span className="text-xl font-medium text-gray-700">Upload Floor Map</span>
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default CustomerEngagementPlatform;
