"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { FaBook, FaClock, FaDatabase, FaThermometerHalf } from "react-icons/fa";
import { RingLoader } from "react-spinners";

export default function ModulePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  // Show spinner when pathname changes
  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 500); // Adjust delay as needed
    return () => clearTimeout(timeout);
  }, [pathname]);

  // Function to handle navigation
  const handleNavigation = (url: string) => {
    setLoading(true);
    router.push(url);
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center p-4 sm:p-6 bg-gray-100 scrollbar-hide">
      
      {/* Loading Spinner */}
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
          <RingLoader size={60} color="#2563EB" loading={loading} />
        </div>
      )}

      {/* Background Image */}
      <Image 
        src="/assets/2.jpg" 
        alt="Robot Background" 
        layout="fill" 
        objectFit="cover" 
        quality={100} 
        className="absolute top-0 left-0 w-full h-full object-cover z-[-1]"
        priority
        unoptimized
      />

      <header className="w-full max-w-6xl flex flex-col items-center text-center py-4 sm:py-6">
        <Image src="/assets/centelon_logo.png" alt="Logo" width={180} height={150} />
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mt-2">ROBOTIC PLATFORM </h1>
      </header>

      {/* Card Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl w-full px-4 sm:px-0 mb-6">
        {[
         { icon: <FaBook className="text-3xl" />, title: "Total Channels", link: "/add-channel", linkText: "+ Add a Channel" },
         { icon: <FaThermometerHalf className="text-3xl" />, title: "Total Devices", link: "/add-device", linkText: "+ Add a Device" },
         { icon: <FaClock className="text-3xl" />, title: "Last Updated on" },
         { icon: <FaDatabase className="text-3xl" />, title: "Sensor Data Count", value: "2000+" },
        ].map((card, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow flex flex-col items-center text-center">
            <div className="text-3xl">{card.icon}</div>
            <h2 className="mt-2 text-lg font-semibold">{card.title}</h2>
            {card.link ? (
              <button onClick={() => handleNavigation(card.link)} className="text-blue-500 text-sm mt-1">
                {card.linkText}
              </button>
            ) : null}
            {card.value ? (
              <p className="text-xl font-bold text-blue-600">{card.value}</p>
            ) : null}
          </div>
        ))}
      </div>

      {/* Feature Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full px-4 sm:px-0">
        {[
           { id: 1, src: "/assets/engagement_robot.jpg", title: "CUSTOMER ENGAGEMENT ROBOT" },
           { id: 2, src: "/assets/smart-plug.jpg", title: "SMART PLUG" },
           { id: 3, src: "/assets/service_robot.jpg", title: "CUSTOMER SERVICE ROBOT" },
        ].map((feature, index) => (
          <button key={index} onClick={() => handleNavigation(`/robo/${feature.id}`)} className="cursor-pointer">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <Image 
                src={feature.src} 
                alt={feature.title} 
                width={500} 
                height={300} 
                className="w-full h-48 sm:h-56 md:h-64 object-cover"
                unoptimized
              />
              <div className="p-4 text-center font-semibold">{feature.title}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
