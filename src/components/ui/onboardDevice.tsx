"use client";
import React, { useState, useRef, ChangeEvent } from "react";
import { Card } from "@/components/ui/card";
import { CardContent } from "@/components/ui/cardContent";
import { Button } from "@/components/ui/button";
import { FiSearch, FiCheckCircle, FiArrowLeft, FiArrowRight, FiCamera, FiX } from "react-icons/fi";
import toast from "react-hot-toast";

// Define types for our component
interface DeviceDetails {
  id: string;
  serialNumber: string;
  model: string;
  firmware: string;
  lastSeen: string;
  status: string;
  macAddress: string;
}

const OnboardDevice: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [serialNumber, setSerialNumber] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [deviceDetails, setDeviceDetails] = useState<DeviceDetails | null>(null);
  const [isAdded, setIsAdded] = useState<boolean>(false);
  const [showCamera, setShowCamera] = useState<boolean>(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleSerialNumberChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setSerialNumber(e.target.value);
  };

  const startCamera = async (): Promise<void> => {
    try {
      const constraints = {
        video: { facingMode: "environment" } // Use back camera on mobile devices
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
        toast.success("Camera activated. Position barcode in view.");
      }
    } catch (error) {
      toast.error("Unable to access camera. Please ensure camera permissions are granted.");
      console.error("Error accessing camera:", error);
    }
  };

  const stopCamera = (): void => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const captureBarcode = (): void => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // In a real implementation, you would use a barcode scanning library here
    // For example: ZXing, QuaggaJS, or a cloud-based solution
    
    // For demo purposes, we'll simulate a successful scan
    toast.success("Barcode detected!");
    setSerialNumber("CENTO-D3V1C3-2025");
    stopCamera();
  };

  const handleScanBarcode = (): void => {
    startCamera();
  };

  const handleNext = async (): Promise<void> => {
    if (currentStep === 0) {
      if (!serialNumber) {
        toast.error("Please enter a serial number or scan a barcode");
        return;
      }

      // Simulate fetching device details from backend
      setIsLoading(true);
      try {
        // Here you would make an actual API call
        // const response = await fetch(`/api/devices/${serialNumber}`);
        // const data = await response.json();
        
        // Simulating API response
        setTimeout(() => {
          setDeviceDetails({
            id: "DEV-" + Math.floor(Math.random() * 10000),
            serialNumber: serialNumber,
            model: "Cento Smart Speaker",
            firmware: "v1.2.3",
            lastSeen: "Never",
            status: "New",
            macAddress: "00:1A:2B:3C:4D:5E"
          });
          setIsLoading(false);
          setCurrentStep(1);
        }, 1500);
      } catch (error) {
        toast.error("Error fetching device details");
        setIsLoading(false);
      }
    } else if (currentStep === 1) {
      // Add device to user's account
      setIsLoading(true);
      try {
        // Simulate API call to add the device
        // In a real implementation, you would call your backend API
        // const response = await fetch('/api/devices', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ deviceId: deviceDetails?.id })
        // });
        
        setTimeout(() => {
          setIsLoading(false);
          setIsAdded(true);
          setCurrentStep(2);
          toast.success("Device added successfully!");
        }, 1500);
      } catch (error) {
        toast.error("Error adding device");
        setIsLoading(false);
      }
    } else if (currentStep === 2) {
      // Reset the form
      setCurrentStep(0);
      setSerialNumber("");
      setDeviceDetails(null);
      setIsAdded(false);
    }
  };

  const handleBack = (): void => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Steps array for the stepper
  const steps: string[] = ["Enter Device Information", "Review Device Details", "Confirmation"];

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="mt-4 shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold">Device Onboarding</h2>
        </div>
        
        <CardContent>
          {/* Custom stepper */}
          <div className="mb-8 mt-4">
            <div className="flex justify-between">
              {steps.map((step: string, index: number) => (
                <div key={index} className="flex flex-col items-center">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index < currentStep ? "bg-green-500 text-white" : 
                      index === currentStep ? "bg-blue-500 text-white" : 
                      "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {index < currentStep ? <FiCheckCircle /> : index + 1}
                  </div>
                  <p className={`text-xs mt-2 ${index === currentStep ? "font-semibold" : "text-gray-500"}`}>
                    {step}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-2 mx-10">
              <div className="h-1 bg-gray-200 flex">
                <div 
                  className="bg-blue-500 h-full" 
                  style={{ width: `${currentStep * 50}%` }}
                ></div>
              </div>
            </div>
          </div>

          {currentStep === 0 && (
            <div className="space-y-6 p-4">
              <div className="text-center">
                <h3 className="text-lg font-medium">Enter Device Serial Number</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Please enter the serial number found on the bottom of your device or scan the barcode
                </p>
              </div>
              
              {showCamera ? (
                <div className="camera-container">
                  <div className="relative">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full rounded-lg border border-gray-300"
                      style={{ maxHeight: "350px" }}
                    ></video>
                    <canvas ref={canvasRef} className="hidden"></canvas>
                    <div className="absolute top-2 right-2">
                      <Button 
                        variant="destructive" 
                        onClick={stopCamera}
                        className="rounded-full p-2 bg-gray-800 text-white"
                      >
                        <FiX />
                      </Button>
                    </div>
                    <div className="scanning-line bg-blue-500 h-1 w-full absolute top-1/2 transform-translate-y-1/2 opacity-70"></div>
                  </div>
                  <div className="mt-4 flex justify-center">
                    <Button 
                      onClick={captureBarcode}
                      className="bg-blue-500 text-white px-6 py-2 rounded flex items-center"
                    >
                      <FiCamera className="mr-2" /> Capture Barcode
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    placeholder="Enter serial number"
                    value={serialNumber}
                    onChange={handleSerialNumberChange}
                    className="flex-grow p-2 border border-gray-300 rounded"
                  />
                  <Button 
                    variant="outline"
                    onClick={handleScanBarcode}
                    className="border border-gray-300 px-4 py-2 rounded flex items-center"
                  >
                    <FiCamera className="mr-2" /> Scan
                  </Button>
                </div>
              )}
            </div>
          )}

          {currentStep === 1 && deviceDetails && (
            <div className="space-y-6 p-4">
              <div className="text-center">
                <h3 className="text-lg font-medium">Device Details</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Review the details of your device before adding it to your account
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Serial Number</p>
                    <p className="font-medium">{deviceDetails.serialNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Model</p>
                    <p className="font-medium">{deviceDetails.model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Firmware Version</p>
                    <p className="font-medium">{deviceDetails.firmware}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">MAC Address</p>
                    <p className="font-medium">{deviceDetails.macAddress}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-medium">{deviceDetails.status}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && isAdded && (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <FiCheckCircle className="text-green-500 text-6xl" />
              </div>
              <h3 className="text-xl font-medium">Device Added Successfully!</h3>
              <p className="text-gray-500 mt-2">
                Your device has been successfully added to your account. You can now manage it from the dashboard.
              </p>
            </div>
          )}

          <div className="flex justify-between p-4 border-t border-gray-200 mt-6">
            {currentStep > 0 && currentStep < 2 && (
              <Button 
                variant="outline" 
                onClick={handleBack} 
                disabled={isLoading}
                className="flex items-center border border-gray-300 px-4 py-2 rounded"
              >
                <FiArrowLeft className="mr-2" /> Back
              </Button>
            )}
            {currentStep === 0 && <div></div>}
            <Button 
              onClick={handleNext} 
              disabled={isLoading}
              className={`flex items-center px-4 py-2 rounded ${isLoading ? "bg-gray-400" : "bg-blue-500 text-white"}`}
            >
              {isLoading ? "Processing..." : 
                currentStep === 0 ? "Next" : 
                currentStep === 1 ? "Add Device" : 
                "Finish"}
              {currentStep < 2 && <FiArrowRight className="ml-2" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardDevice;