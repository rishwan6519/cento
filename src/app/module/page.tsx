"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FaKeyboard, FaArrowRight, FaExclamationTriangle, FaCamera } from "react-icons/fa";
import { RingLoader } from "react-spinners";
import jsQR from "jsqr";

interface DeviceInfo {
  name: string;
  serialNumber: string;
  status: string;
  type?: {
    name?: string;
  };
  imageUrl?: string;
  color?: string;
}

const OnboardingPage: React.FC = () => {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [step, setStep] = useState<number>(0);
  const [serialNumber, setSerialNumber] = useState<string>("");
  const [scanActive, setScanActive] = useState<boolean>(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    const setupCamera = async () => {
        if (step === 3 && scanActive) {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setCameraPermission(true);
                }
            } catch (err) {
                console.error("Error accessing camera:", err);

                // Check if err is an instance of Error
                const errorMessage = err instanceof Error && err.name === 'NotAllowedError'
                    ? "Camera access was denied or blocked. Please check your permissions."
                    : "Unexpected error when accessing the camera. Ensure that your camera is not being used by another application.";

                setCameraPermission(false);
                setError(errorMessage);
                setScanActive(false);
            }
        }
    };
    setupCamera();
    return () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
        }
    };
}, [step, scanActive]);

  useEffect(() => {
    const scanQRCode = () => {
      if (canvasRef.current && videoRef.current && videoRef.current.readyState === 4) {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (context) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, canvas.width, canvas.height);

          if (qrCode) {
            handleBarcodeDetected(qrCode.data);
          }
        }
      }
    };

    const interval = setInterval(scanQRCode, 500);

    return () => clearInterval(interval);
  }, [step, scanActive]);

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
    setScanActive(false);
    setSerialNumber(detectedCode);
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

const validateAndFetchDevice = async (serialNum: string) => {
    setLoading(true);
    setError("");
    try {
        console.log(`Fetching device data with serial number: ${serialNum}`); // Debug log
        const response = await fetch(`/api/get-device/serialNumber?serialNumber=${serialNum}`, );
        console.log("Response received:", response); // Debug log
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Response error data:", errorData); // Debug log
            throw new Error(errorData.message || "Failed to validate device");
        }
        const data = await response.json();
        console.log("Device data:", data); // Debug log
        if (data.success && data.deviceData) {
            setDeviceInfo(data.deviceData);
            setStep(4);
        } else {
            throw new Error("Invalid device data returned from server");
        }
    } catch (err) {
        console.error("Error validating device:", err);
        setError(err instanceof Error ? err.message : "Device validation failed. Please check the serial number and try again.");
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

  const handleComplete = () => {
    router.push("/dashboard");
  };

  const restartScan = () => {
    setSerialNumber("");
    setScanActive(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800">
      {loading && (
        <div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50">
          <div className="text-center">
            <RingLoader size={60} color="#4F46E5" />
            <p className="mt-4 text-lg font-medium text-indigo-700">Connecting to your device...</p>
          </div>
        </div>
      )}

      <header className="w-full py-6 flex justify-center">
        <Image src="/assets/centelon_logo.png" alt="Logo" width={150} height={50} priority />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {step === 0 && (
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="relative h-48 bg-indigo-600">
              <Image src="/assets/2.jpg" alt="Welcome" fill objectFit="cover" className="opacity-75" />
              <div className="absolute inset-0 flex items-center justify-center">
                <h1 className="text-4xl font-bold text-white">Welcome!</h1>
              </div>
            </div>
            <div className="p-8 text-center">
              <h2 className="text-2xl font-semibold mb-4">Get Started with Your Robotic Platform</h2>
              <p className="text-gray-600 mb-8">Let's begin by onboarding your first device. This quick process will connect your device to our platform.</p>
              <button onClick={handleStart} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-8 py-3 rounded-lg transition-colors duration-200 flex items-center justify-center mx-auto">
                Onboard Device
                <FaArrowRight className="ml-2" />
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-8 text-center">
              <h2 className="text-2xl font-semibold mb-6">How would you like to enter the device serial number?</h2>
              <div className="grid grid-cols-2 gap-6 mt-8">
                <button onClick={() => handleMethodSelection("scan")} className="flex flex-col items-center justify-center p-6 border-2 border-indigo-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-400 transition-all duration-200">
                  <div className="bg-indigo-100 p-4 rounded-full mb-4">
                    <FaCamera className="text-indigo-600 text-3xl" />
                  </div>
                  <span className="font-medium">Scan Barcode</span>
                </button>
                <button onClick={() => handleMethodSelection("manual")} className="flex flex-col items-center justify-center p-6 border-2 border-indigo-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-400 transition-all duration-200">
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
              <h2 className="text-2xl font-semibold mb-6 text-center">Enter Device Serial Number</h2>
              <div className="mb-6">
                <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="Enter Serial Number" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
              </div>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-start">
                  <FaExclamationTriangle className="text-red-500 mt-1 mr-2 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}
              <div className="flex justify-between mt-8">
                <button onClick={() => setStep(1)} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                  Back
                </button>
                <button onClick={handleSerialSubmit} disabled={!serialNumber.trim()} className={`px-6 py-2 rounded-lg ${serialNumber.trim() ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-gray-300 text-gray-500 cursor-not-allowed"} transition-colors`}>
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
              {scanActive ? (
                <div className="relative w-full h-full">
                  <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-64 h-64 border-2 border-indigo-500 border-opacity-70 rounded-lg"></div>
                  </div>
                  {cameraPermission === false && (
                    <div className="absolute inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center text-white p-4">
                      <div className="text-center">
                        <FaExclamationTriangle className="text-yellow-400 text-3xl mx-auto mb-2" />
                        <p className="text-lg font-medium mb-2">Camera Access Required</p>
                        <button onClick={() => setStep(1)} className="px-4 py-2 bg-white text-gray-800 rounded-lg">
                          Try Another Method
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : serialNumber ? (
                <div className="text-center py-8">
                  <div className="checkmark-circle mx-auto mb-4">
                    <div className="bg-green-500 text-white w-16 h-16 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-lg font-medium text-gray-700">Serial Number Detected</p>
                  <p className="text-xl font-bold text-indigo-600 mt-2">{serialNumber}</p>
                  <button onClick={restartScan} className="mt-4 text-indigo-600 underline text-sm">
                    Scan a different code
                  </button>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-12">
                  <FaCamera className="text-gray-400 text-5xl mb-4" />
                  <p className="text-gray-500">Camera initialization...</p>
                </div>
              )}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-start">
                  <FaExclamationTriangle className="text-red-500 mt-1 mr-2 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}
              <div className="flex justify-between mt-8">
                <button onClick={() => setStep(1)} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                  Back
                </button>
                <button onClick={handleSerialSubmit} disabled={!serialNumber} className={`px-6 py-2 rounded-lg ${serialNumber ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-gray-300 text-gray-500 cursor-not-allowed"} transition-colors`}>
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 4 && deviceInfo && (
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-8 text-center">
              <h2 className="text-2xl font-semibold mb-4">Device Successfully Onboarded!</h2>
              <div className="mb-6 px-4">
                {deviceInfo.imageUrl && (
                  <div className="mb-4">
                    <Image src={deviceInfo.imageUrl} alt={deviceInfo.name} width={150} height={150} className="mx-auto rounded-lg object-cover shadow-sm" />
                  </div>
                )}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <p className="text-gray-500">Name:</p>
                    <p className="font-medium text-gray-800">{deviceInfo.name}</p>
                    <p className="text-gray-500">Serial Number:</p>
                    <p className="font-medium text-gray-800">{deviceInfo.serialNumber}</p>
                    <p className="text-gray-500">Status:</p>
                    <p className="font-medium text-gray-800 capitalize">{deviceInfo.status}</p>
                    <p className="text-gray-500">Type:</p>
                    <p className="font-medium text-gray-800">{deviceInfo.type?.name || "N/A"}</p>
                    {deviceInfo.color && (
                      <>
                        <p className="text-gray-500">Color:</p>
                        <p className="font-medium text-gray-800 capitalize">{deviceInfo.color}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-gray-600 mb-6">Your device has been successfully connected to your account.</p>
              <button onClick={handleComplete} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-8 py-3 rounded-lg transition-colors duration-200">
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="w-full py-4 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} Centelon Robotic Platform • Need help? Contact support
      </footer>
    </div>
  );
};

export default OnboardingPage;