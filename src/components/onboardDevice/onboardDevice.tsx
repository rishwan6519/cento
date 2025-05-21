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
  FaQrcode 
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

  const [scanActive, setScanActive] = useState<boolean>(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [error, setError] = useState<string>("");
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Setup camera when step is 3 and scanning is active
  useEffect(() => {
    const setupCamera = async () => {
      if (step === 3 && scanActive) {
        // First make sure any existing streams are properly stopped
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
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
              video: { facingMode: "environment" }
            });
          } catch (envError) {
            console.log("Couldn't access environment camera, trying default camera");
            // If that fails, try default camera with no constraints
            stream = await navigator.mediaDevices.getUserMedia({
              video: true
            });
          }
          
          streamRef.current = stream;
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              if (videoRef.current) {
                videoRef.current.play()
                  .then(() => {
                    console.log("Camera started successfully");
                    setCameraPermission(true);
                  })
                  .catch(playError => {
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
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
              errorMessage = "Camera access was denied. Please allow camera access in your browser settings.";
            } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
              errorMessage = "No camera found. Please ensure your device has a camera.";
            } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
              errorMessage = "Camera is already in use by another application. Please close other apps using your camera.";
            } else if (err.name === "OverconstrainedError") {
              errorMessage = "Camera constraints cannot be satisfied. Try using a different camera.";
            } else if (err.name === "TypeError" || err.message.includes("getUserMedia")) {
              errorMessage = "Your browser doesn't support camera access or it may be blocked.";
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
        streamRef.current.getTracks().forEach(track => {
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
  }, [step, scanActive]);

  // QR code scanning logic
  useEffect(() => {
    if (step === 3 && scanActive && cameraPermission === true) {
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
          
          const context = canvas.getContext('2d');
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
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            
            // Check if imageData has valid dimensions
            if (imageData.width === 0 || imageData.height === 0 || !imageData.data || imageData.data.length === 0) {
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
  }, [step, scanActive, cameraPermission]);

  const handleStart = () => {
    setStep(1);
  };

  const handleMethodSelection = (method: string) => {
    setError("");
    setDeviceInfo(null);
    setSerialNumber("");
    if (method === "manual") {
      setStep(2);
    } else {
      setStep(3);
      setScanActive(true);
    }
  };

  const handleBarcodeDetected = (detectedCode: string) => {
    if (!detectedCode || !scanActive) return;
    
    console.log("Barcode detected:", detectedCode);
    setScanActive(false);
    setSerialNumber(detectedCode);
    
    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear scanning interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    // Proceed with validating the detected code
    validateAndFetchDevice(detectedCode);
  };

  const validateAndFetchDevice = async (serialNum: string) => {
    setLoading(true);
    setError("");
    try {
      // First check if device is already onboarded
      const checkResponse = await fetch(`/api/onboarded-devices/check?serialNumber=${serialNum}`);
      const checkData = await checkResponse.json();

      if (!checkResponse.ok) {
        throw new Error(checkData.message || "Failed to validate device");
      }

      if (!checkData.success) {
        throw new Error(checkData.message);
      }

      // If device is not onboarded, proceed with fetching device details
      const response = await fetch(`/api/get-device/serialNumber?serialNumber=${serialNum}`);
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

      const userId = localStorage.getItem('userId');
      if (!userId) {
        setError("User session not found");
        return;
      }

      setLoading(true);
      const response = await fetch('/api/onboarded-devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: deviceInfo.id,
          typeId: deviceInfo.type?.id,
          userId: userId,
          status: 'active'
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to save device');
      }

      // Store the newly added device ID in localStorage
      localStorage.setItem('lastAddedDeviceId', data.data._id);
      router.push('/platform'); // Redirect to the platform page
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save device');
      console.error('Error saving device:', error);
    } finally {
      setLoading(false);
    }
  };

  const restartScan = () => {
    // Clear any errors
    setError("");
    // Reset serial number
    setSerialNumber("");
    // Restart scan
    setScanActive(true);
    // Reset camera permission to force re-initialization
    setCameraPermission(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800">
      {loading && (
        <div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50">
          <div className="text-center">
            <RingLoader size={60} color="#4F46E5" />
            <p className="mt-4 text-lg font-medium text-indigo-700">
              Connecting to your device...
            </p>
          </div>
        </div>
      )}

      <header className="w-full py-6 flex justify-center">
        <Image
          src="/assets/centelon_logo.png"
          alt="Logo"
          width={150}
          height={50}
          priority
        />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {step === 0 && (
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="relative h-48 bg-indigo-600">
              <Image
                src="/assets/2.jpg"
                alt="Welcome"
                fill
                style={{ objectFit: "cover" }}
                className="opacity-75"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <h1 className="text-4xl font-bold text-white">Welcome!</h1>
              </div>
            </div>
            <div className="p-8 text-center">
              <h2 className="text-2xl font-semibold mb-4">
                Get Started with Your Robotic Platform
              </h2>
              <p className="text-gray-600 mb-8">
                Let's begin by onboarding your first device. This quick
                process will connect your device to our platform.
              </p>
              <button
                onClick={handleStart}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-8 py-3 rounded-lg transition-colors duration-200 flex items-center justify-center mx-auto"
              >
                Onboard Device
                <FaArrowRight className="ml-2" />
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-8 text-center">
              <h2 className="text-2xl font-semibold mb-6">
                How would you like to enter the device serial number?
              </h2>
              <div className="grid grid-cols-2 gap-6 mt-8">
                <button
                  onClick={() => handleMethodSelection("scan")}
                  className="flex flex-col items-center justify-center p-6 border-2 border-indigo-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-400 transition-all duration-200"
                >
                  <div className="bg-indigo-100 p-4 rounded-full mb-4">
                    <FaCamera className="text-indigo-600 text-3xl" />
                  </div>
                  <span className="font-medium">Scan Barcode</span>
                </button>
                <button
                  onClick={() => handleMethodSelection("manual")}
                  className="flex flex-col items-center justify-center p-6 border-2 border-indigo-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-400 transition-all duration-200"
                >
                  <div className="bg-indigo-100 p-4 rounded-full mb-4">
                    <FaKeyboard className="text-indigo-600 text-3xl" />
                  </div>
                  <span className="font-medium">Enter Manually</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-semibold mb-6 text-center">
                Enter Device Serial Number
              </h2>
              <div className="mb-6">
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="Enter Serial Number"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              {error && (
                <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <FaExclamationTriangle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSerialSubmit}
                  disabled={!serialNumber.trim()}
                  className={`px-6 py-2 rounded-lg ${
                    serialNumber.trim()
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  } transition-colors`}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-8 text-center">
              <h2 className="text-2xl font-semibold mb-6">Scan Barcode</h2>
              
              <div className="relative w-full">
                {scanActive && cameraPermission !== false && (
                  <>
                    <div className="bg-black rounded-lg overflow-hidden" style={{ minHeight: "240px" }}>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-64 object-cover"
                        style={{ transform: "scaleX(1)" }}
                      />
                      <canvas 
                        ref={canvasRef} 
                        className="hidden" 
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-2 border-indigo-500 border-opacity-70 rounded-lg"></div>
                    </div>
                  </>
                )}
                
                {cameraPermission === false && (
                  <div className="bg-gray-100 rounded-lg p-6 text-center">
                    <FaExclamationTriangle className="text-yellow-500 text-3xl mx-auto mb-3" />
                    <h3 className="text-lg font-medium mb-2">Camera Access Required</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <div className="flex justify-center space-x-3">
                      <button
                        onClick={restartScan}
                        className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={() => setStep(1)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
                      >
                        Try Another Method
                      </button>
                    </div>
                  </div>
                )}
                
                {serialNumber && !scanActive && (
                  <div className="text-center py-6">
                    <div className="mx-auto mb-4 bg-green-500 text-white w-16 h-16 rounded-full flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-8 h-8"
                      >
                        <path d="M9 11l3 3L22 4"></path>
                      </svg>
                    </div>
                    <h3 className="text-xl font-medium mb-2">Serial Number Detected</h3>
                    <p className="text-gray-600 mb-2">
                      {serialNumber}
                    </p>
                    {loading ? (
                      <div className="mt-4">
                        <RingLoader size={40} color="#4F46E5" />
                        <p className="mt-2">Validating...</p>
                      </div>
                    ) : (
                      <div className="mt-4 flex justify-center space-x-4">
                        <button
                          onClick={restartScan}
                          className="px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          Scan Again
                        </button>
                        <button
                          onClick={() => validateAndFetchDevice(serialNumber)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
                        >
                          Continue
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {!serialNumber && !scanActive && cameraPermission !== false && (
                  <div className="text-center py-6 bg-gray-100 rounded-lg" style={{ minHeight: "200px" }}>
                    <div className="flex flex-col items-center justify-center h-full">
                      <RingLoader size={40} color="#4F46E5" />
                      <p className="mt-4 text-gray-600">Initializing camera...</p>
                    </div>
                  </div>
                )}
              </div>
              
              {error && cameraPermission !== false && scanActive && (
                <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded text-left">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <FaExclamationTriangle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                {scanActive && cameraPermission === true && (
                  <button
                    onClick={restartScan}
                    className="ml-3 px-6 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    Reset Camera
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 4 && deviceInfo && (
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-semibold mb-6">Device Information</h2>
              {deviceInfo.imageUrl && (
                <div className="w-full mb-4">
                  <Image
                    src={deviceInfo.imageUrl}
                    alt={deviceInfo.name}
                    width={300}
                    height={200}
                    className="rounded-xl shadow-md"
                  />
                </div>
              )}
              <h3 className="text-lg font-semibold">{deviceInfo.name}</h3>
              <p className="text-gray-600">{deviceInfo.serialNumber}</p>
              <div className="mt-6">
                <button
                  onClick={handleComplete}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg"
                >
                  Complete Setup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;