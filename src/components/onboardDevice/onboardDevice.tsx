"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaKeyboard,
  FaArrowRight,
  FaExclamationTriangle,
  FaCamera,
  FaChevronLeft,
  FaQrcode,
  FaCheckCircle,
  FaTimes,
  FaRedo,
} from "react-icons/fa";
import { RingLoader } from "react-spinners";
import jsQR from "jsqr";

interface DeviceInfo {
  name: string;
  serialNumber: string;
  status: string;
  type?: {
    name?: string;
    id?: string;
  };
  id?: string;
  imageUrl?: string;
  color?: string;
}

const OnboardingPage: React.FC = () => {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [step, setStep] = useState<number>(0);
  const [serialNumber, setSerialNumber] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [scanActive, setScanActive] = useState<boolean>(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(
    null
  );
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [error, setError] = useState<string>("");
  const [scanDetected, setScanDetected] = useState<boolean>(false);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);


  useEffect(() => {
  if (showSuccess) {
    const timer = setTimeout(() => {
      window.location.href = "/platform"; // Redirect to platform page
    }, 1800);

    return () => clearTimeout(timer); // cleanup
  }
}, [showSuccess]); 

  // Setup camera when step is 3 and scanning is active
  
  useEffect(() => {
    const setupCamera = async () => {
      if (step === 3 && scanActive && !scanDetected) {
        // First make sure any existing streams are properly stopped
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => {
            track.stop();
          });
          streamRef.current = null;
        }

        // Reset video element
        if (videoRef.current && videoRef.current.srcObject) {
          videoRef.current.srcObject = null;
        }

        try {
          console.log("Attempting to access camera...");

          // Check if mediaDevices API is available
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Your browser doesn't support camera access");
          }

          // List available devices first (helps trigger permission prompt)
          await navigator.mediaDevices.enumerateDevices();

          // Try to get video stream with different constraints
          let stream;
          try {
            // First try environment camera (rear camera on mobile)
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "environment" },
            });
          } catch (envError) {
            console.log(
              "Couldn't access environment camera, trying default camera"
            );
            // If that fails, try default camera with no constraints
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
            });
          }

          
          streamRef.current = stream;

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              if (videoRef.current) {
                videoRef.current
                  .play()
                  .then(() => {
                    console.log("Camera started successfully");
                    setCameraPermission(true);
                  })
                  .catch((playError) => {
                    console.error("Error playing video:", playError);
                    throw playError;
                  });
              }
            };

            // Additional error handling for video element
            videoRef.current.onerror = (e) => {
              console.error("Video element error:", e);
              setCameraPermission(false);
              setError("Error with video playback. Please try again.");
            };
          }
        } catch (err) {
          console.error("Error accessing camera:", err);
          let errorMessage = "Unexpected error when accessing the camera.";

          if (err instanceof Error) {
            if (
              err.name === "NotAllowedError" ||
              err.name === "PermissionDeniedError"
            ) {
              errorMessage =
                "Camera access was denied. Please allow camera access in your browser settings.";
            } else if (
              err.name === "NotFoundError" ||
              err.name === "DevicesNotFoundError"
            ) {
              errorMessage =
                "No camera found. Please ensure your device has a camera.";
            } else if (
              err.name === "NotReadableError" ||
              err.name === "TrackStartError"
            ) {
              errorMessage =
                "Camera is already in use by another application. Please close other apps using your camera.";
            } else if (err.name === "OverconstrainedError") {
              errorMessage =
                "Camera constraints cannot be satisfied. Try using a different camera.";
            } else if (
              err.name === "TypeError" ||
              err.message.includes("getUserMedia")
            ) {
              errorMessage =
                "Your browser doesn't support camera access or it may be blocked.";
            }
          }

          setCameraPermission(false);
          setError(errorMessage);
          setScanActive(false);
        }
      }
    };

    setupCamera();

    // Cleanup function
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          if (track.readyState === "live") {
            track.stop();
          }
        });
        streamRef.current = null;
      }

      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [step, scanActive, scanDetected]);

  // QR code scanning logic
  useEffect(() => {
    if (
      step === 3 &&
      scanActive &&
      cameraPermission === true &&
      !scanDetected
    ) {
      // Give camera a moment to initialize before starting scan
      const startupDelay = setTimeout(() => {
        // Clear any existing interval
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current);
        }

        console.log("Starting QR code scanning...");

        // Create new scanning interval
        scanIntervalRef.current = setInterval(() => {
          const video = videoRef.current;
          const canvas = canvasRef.current;

          if (!video || !canvas) {
            console.log("Video or canvas element not found");
            return;
          }

          if (video.readyState < 2) {
            console.log("Video not ready yet");
            return;
          }

          const context = canvas.getContext("2d");
          if (!context) {
            console.log("Could not get canvas context");
            return;
          }

          try {
            // Set canvas dimensions to match video
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;

            if (canvas.width === 0 || canvas.height === 0) {
              console.log("Invalid canvas dimensions");
              return;
            }

            // Draw current video frame to canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Get image data for QR code processing
            const imageData = context.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            );

            // Check if imageData has valid dimensions
            if (
              imageData.width === 0 ||
              imageData.height === 0 ||
              !imageData.data ||
              imageData.data.length === 0
            ) {
              console.log("Invalid image data");
              return;
            }

            const code = jsQR(
              imageData.data,
              imageData.width,
              imageData.height,
              {
                inversionAttempts: "dontInvert",
              }
            );

            if (code) {
              console.log("QR code detected:", code.data);
              if (code.data && code.data.trim() !== "") {
                handleBarcodeDetected(code.data);
              }
            }
          } catch (err) {
            console.error("Error processing QR code:", err);
          }
        }, 500);
      }, 1000); // 1 second delay to allow camera to initialize

      return () => {
        clearTimeout(startupDelay);
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current);
          scanIntervalRef.current = null;
        }
      };
    }

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [step, scanActive, cameraPermission, scanDetected]);

  const handleStart = () => {
    setStep(1);
  };

  const handleMethodSelection = (method: string) => {
    setError("");
    setDeviceInfo(null);
    setSerialNumber("");
    setScanDetected(false);
    if (method === "manual") {
      setStep(2);
    } else {
      setStep(3);
      setScanActive(true);
    }
  };

  const handleBarcodeDetected = (detectedCode: string) => {
    if (!detectedCode || !scanActive || scanDetected) return;

    console.log("Barcode detected:", detectedCode);
    setScanDetected(true);
    setScanActive(false);
    setSerialNumber(detectedCode);

    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear scanning interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  const validateAndFetchDevice = async (serialNum: string) => {
    setLoading(true);
    setError("");
    try {
      // First check if device is already onboarded
      const checkResponse = await fetch(
        `/api/onboarded-devices/check?serialNumber=${serialNum}`
      );
      const checkData = await checkResponse.json();

      if (!checkResponse.ok) {
        throw new Error(checkData.message || "Failed to validate device");
      }

      if (!checkData.success) {
        // Device is already onboarded
        setError(` ${checkData.message}`);
        setLoading(false);
        return;
      }

      // If device is not onboarded, proceed with fetching device details
      const response = await fetch(
        `/api/get-device/serialNumber?serialNumber=${serialNum}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch device details");
      }

      if (data.success && data.deviceData) {
        setDeviceInfo(data.deviceData);
        setStep(4);
      } else {
        throw new Error("Invalid device data returned from server");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Device validation failed. Please check the serial number and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSerialSubmit = () => {
    if (!serialNumber.trim()) {
      setError("Please enter a valid serial number");
      return;
    }
    validateAndFetchDevice(serialNumber);
  };

  const handleComplete = async () => {
    try {
      if (!deviceInfo) {
        setError("Device information is missing");
        return;
      }

      const userId = localStorage.getItem("userId");
      if (!userId) {
        setError("User session not found");
        return;
      }

      setLoading(true);
      const response = await fetch("/api/onboarded-devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceId: deviceInfo.id,
          typeId: deviceInfo.type?.id,
          userId: userId,
          status: "active",
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to save device");
      }

      // Store the newly added device ID in localStorage
      localStorage.setItem("lastAddedDeviceId", data.data._id);
      setShowSuccess(true);

    
       
      
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to save device"
      );
      console.error("Error saving device:", error);
    } finally {
      setLoading(false);
    }
  };

  const restartScan = () => {
    // Clear any errors
    setError("");
    // Reset serial number
    setSerialNumber("");
    // Reset scan detected
    setScanDetected(false);
    // Restart scan
    setScanActive(true);
    // Reset camera permission to force re-initialization
    setCameraPermission(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 text-gray-800 w-[100%] h-[100%] ">
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <div className="text-center bg-white p-8 rounded-2xl shadow-2xl">
            <RingLoader size={60} color="#6366F1" />
            <p className="mt-4 text-lg font-medium text-indigo-700">
              Connecting to your device...
            </p>
          </div>
        </motion.div>
      )}

      <header className="w-full py-8 flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Image
            src="/assets/centelon_logo.png"
            alt="Logo"
            width={180}
            height={60}
            priority
            className="drop-shadow-lg"
          />
        </motion.div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4 }}
              className="max-w-lg w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="relative h-52 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
                <Image
                  src="/assets/2.jpg"
                  alt="Welcome"
                  fill
                  style={{ objectFit: "cover" }}
                  className="opacity-60"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="text-4xl font-bold text-white drop-shadow-lg"
                  >
                    Welcome!
                  </motion.h1>
                </div>
              </div>
              <div className="p-8 text-center">
                <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                  Get Started with Your Robotic Platform
                </h2>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Let's begin by onboarding your device. This quick process will
                  connect your device to our platform.
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStart}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium px-8 py-4 rounded-xl transition-all duration-200 flex items-center justify-center mx-auto shadow-lg"
                >
                  Onboard Device
                  <FaArrowRight className="ml-2" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.4 }}
              className="max-w-lg w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="p-8 text-center">
                <h2 className="text-2xl font-semibold mb-8 text-gray-800">
                  How would you like to enter the device serial number?
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleMethodSelection("scan")}
                    className="flex flex-col items-center justify-center p-8 border-2 border-indigo-200 rounded-2xl hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 hover:border-indigo-400 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-full mb-4 shadow-lg">
                      <FaQrcode className="text-white text-3xl" />
                    </div>
                    <span className="font-semibold text-gray-800">
                      Scan QR Code
                    </span>
                    <span className="text-sm text-gray-500 mt-2">
                      Quick & Easy
                    </span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleMethodSelection("manual")}
                    className="flex flex-col items-center justify-center p-8 border-2 border-indigo-200 rounded-2xl hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 hover:border-indigo-400 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-full mb-4 shadow-lg">
                      <FaKeyboard className="text-white text-3xl" />
                    </div>
                    <span className="font-semibold text-gray-800">
                      Enter Manually
                    </span>
                    <span className="text-sm text-gray-500 mt-2">
                      Type it in
                    </span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.4 }}
              className="max-w-lg w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="p-8">
                <h2 className="text-2xl font-semibold mb-8 text-center text-gray-800">
                  Enter Device Serial Number
                </h2>
                <div className="mb-6">
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="Enter Serial Number"
                    className="w-full px-6 py-4 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-lg font-medium"
                  />
                </div>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg"
                  >
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <FaExclamationTriangle className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div className="flex justify-between mt-8">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep(1)}
                    className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                  >
                    <FaChevronLeft className="inline mr-2" />
                    Back
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: serialNumber.trim() ? 1.02 : 1 }}
                    whileTap={{ scale: serialNumber.trim() ? 0.98 : 1 }}
                    onClick={handleSerialSubmit}
                    disabled={!serialNumber.trim()}
                    className={`px-8 py-3 rounded-xl font-medium transition-all ${
                      serialNumber.trim()
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Continue
                    <FaArrowRight className="inline ml-2" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.4 }}
              className="max-w-lg w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="p-8 text-center">
                <h2 className="text-2xl font-semibold mb-8 text-gray-800">
                  Scan QR Code
                </h2>

                <div className="relative w-full">
                  {scanActive &&
                    cameraPermission !== false &&
                    !scanDetected && (
                      <>
                        <div
                          className="bg-black rounded-2xl overflow-hidden shadow-inner"
                          style={{ minHeight: "280px" }}
                        >
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-72 object-cover"
                            style={{ transform: "scaleX(1)" }}
                          />
                          <canvas ref={canvasRef} className="hidden" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-48 h-48 border-4 border-indigo-500 border-opacity-70 rounded-2xl shadow-lg animate-pulse">
                            <div className="absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg"></div>
                            <div className="absolute -top-2 -right-2 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg"></div>
                            <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg"></div>
                            <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-lg"></div>
                          </div>
                        </div>
                      </>
                    )}

                  {cameraPermission === false && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-8 text-center border-2 border-yellow-200"
                    >
                      <FaExclamationTriangle className="text-yellow-500 text-4xl mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-3 text-gray-800">
                        Camera Access Required
                      </h3>
                      <p className="text-gray-600 mb-6">{error}</p>
                      <div className="flex justify-center space-x-4">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={restartScan}
                          className="px-6 py-3 border-2 border-indigo-600 text-indigo-600 rounded-xl font-medium hover:bg-indigo-50 transition-all"
                        >
                          <FaRedo className="inline mr-2" />
                          Try Again
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setStep(1)}
                          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium shadow-lg"
                        >
                          Other Method
                        </motion.button>
                      </div>
                    </motion.div>
                  )}

                  {scanDetected && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-8 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="mx-auto mb-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
                      >
                        <FaCheckCircle className="text-3xl" />
                      </motion.div>
                      <h3 className="text-xl font-semibold mb-3 text-gray-800">
                        QR Code Detected!
                      </h3>
                      <div className="bg-white p-4 rounded-xl mb-6 mx-4 shadow-inner">
                        <p className="text-lg font-mono text-gray-700">
                          {serialNumber}
                        </p>
                      </div>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mb-4 p-4 bg-red-50 border border-red-200 mx-4 rounded-xl"
                        >
                          <div className="flex items-center justify-center">
                            <FaExclamationTriangle className="h-5 w-5 text-red-400 mr-2" />
                            <p className="text-sm text-red-700">{error}</p>
                          </div>
                        </motion.div>
                      )}
                      <div className="flex justify-center space-x-4">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={restartScan}
                          className="px-6 py-3 border-2 border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-all"
                        >
                          <FaRedo className="inline mr-2" />
                          Scan Again
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => validateAndFetchDevice(serialNumber)}
                          className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium shadow-lg"
                        >
                          Continue
                          <FaArrowRight className="inline ml-2" />
                        </motion.button>
                      </div>
                    </motion.div>
                  )}

                  {!scanDetected &&
                    !scanActive &&
                    cameraPermission !== false && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200"
                        style={{ minHeight: "280px" }}
                      >
                        <div className="flex flex-col items-center justify-center h-full">
                          <RingLoader size={50} color="#6366F1" />
                          <p className="mt-6 text-gray-600 font-medium">
                            Initializing camera...
                          </p>
                        </div>
                      </motion.div>
                    )}
                </div>

                <div className="mt-8 flex justify-center space-x-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep(1)}
                    className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                  >
                    <FaChevronLeft className="inline mr-2" />
                    Back
                  </motion.button>
                  {scanActive && cameraPermission === true && !scanDetected && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={restartScan}
                      className="px-6 py-3 border-2 border-indigo-600 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors font-medium"
                    >
                      <FaRedo className="inline mr-2" />
                      Reset Camera
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && deviceInfo && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.4 }}
              className="max-w-lg w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="p-8">
                <h2 className="text-2xl font-semibold mb-8 text-center text-gray-800">
                  Device Information
                </h2>

                {deviceInfo.imageUrl && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-full mb-6 flex justify-center"
                  >
                    <Image
                      src={deviceInfo.imageUrl}
                      alt={deviceInfo.name}
                      width={300}
                      height={200}
                      className="rounded-2xl shadow-lg border-2 border-gray-100"
                    />
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl mb-6 border border-indigo-100"
                >
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    {deviceInfo.name}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Serial Number:</span>
                      <span className="font-mono text-gray-800 bg-white px-3 py-1 rounded-lg shadow-sm">
                        {deviceInfo.serialNumber}
                      </span>
                    </div>
                    {deviceInfo.type?.name && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Type:</span>
                        <span className="text-gray-800 font-medium">
                          {deviceInfo.type.name}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Status:</span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          deviceInfo.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {deviceInfo.status}
                      </span>
                    </div>
                  </div>
                </motion.div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg"
                  >
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <FaExclamationTriangle className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="flex justify-between mt-8">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep(1)}
                    className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                  >
                    <FaChevronLeft className="inline mr-2" />
                    Back
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleComplete}
                    className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium shadow-lg hover:from-green-700 hover:to-emerald-700 transition-all"
                  >
                    <FaCheckCircle className="inline mr-2" />
                    Complete Setup
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-8 shadow-2xl mb-6"
            >
              <FaCheckCircle className="text-white text-7xl" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-green-700 mb-2"
            >
              Device Onboarded!
            </motion.h2>
            <p className="text-lg text-gray-700">Redirecting to platform...</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
