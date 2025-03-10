'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { RingLoader } from 'react-spinners';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1500); // Simulated loading time
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">

      <RingLoader color="#3B82F6" loading={loading} size={60} />
    </div>
    );
  }

  return (
    <div className="relative min-h-screen text-white  overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/assets/robo.jpg" 
          alt="Robot Background" 
          layout="fill" 
          objectFit="cover" 
          quality={100} 
          className="opacity-110"
        />
        <div className="absolute inset-0 opacity-70"></div>
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 w-full p-5 flex justify-between items-center">
        <div className="text-xl font-bold transition-transform duration-300 hover:scale-105">
          <Image src="/assets/logo.png" alt="Logo" width={90} height={90} />
        </div>
        <nav className="relative">
          {/* Hamburger Button */}
          <button 
            onClick={toggleMenu} 
            className="text-white focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" ></path>
            </svg>

          </button>


          {/* Navigation Links */}
          {isMenuOpen && (
            <div className="absolute top-12 right-0 bg-gray-900 p-4 rounded-lg shadow-lg">
              <ul className="flex flex-col gap-4">
                <li>
                  <Link href="/login">
                    <a className="text-lg font-semibold hover:text-blue-400">Login</a>
                  </Link>
                </li>
                <li>
                  <Link href="/register">
                    <a className="text-lg font-semibold hover:text-blue-400">Register</a>
                  </Link>
                </li>
              </ul>
            </div>
          )}

         
        </nav>
      </header>

      {/* Main Section */}
      <main className="relative z-10 flex flex-col ml-10 px-6 py-32 md:py-48">
        <h1 className="text-4xl md:text-6xl font-bold">
          <span className="text-white">ROS</span>
          <span className="text-gray-400 transition-transform duration-300 hover:scale-110">AI</span>
          <span className="text-blue-400 transition-transform duration-300 hover:scale-110"> Navigation</span>
        </h1>
        <p className="mt-4 text-lg md:text-xl text-gray-300 max-w-2xl">
          ROS and GenAI in robotics enable smarter autonomous systems with enhanced decision-making and adaptability.
        </p>
        <Link href="/login">
          <button className="mt-6 px-6 w-40 py-3 text-lg font-semibold bg-blue-500 hover:bg-blue-600 rounded-lg shadow-lg transition-transform duration-300 hover:scale-105">
            LOGIN
          </button>
        </Link>
     
      </main>
    </div>
  );
}