"use client";
import React, { useState, useRef, useEffect, ChangeEvent } from "react";
import { Card } from "@/components/ui/card";
import { CardContent } from "@/components/ui/cardContent";
import { Button } from "@/components/ui/button";
import { FiSearch, FiCheckCircle, FiArrowLeft, FiArrowRight, FiCamera, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import Quagga from 'quagga';


// Define types for our component
interface DeviceDetails {
  id: string;
  serialNumber: string;
  model: string;
  firmware: string;
  lastSeen: string;
  status: string;
  macAddress: string;
  addedAt: string; // Added timestamp field
}

const OnboardDevice: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [serialNumber, setSerialNumber] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [deviceDetails, setDeviceDetails] = useState<DeviceDetails | null>(null);
  const [isAdded, setIsAdded] = useState<boolean>(false);
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [scanning, setScanning] = useState<boolean>(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);

  const handleSerialNumberChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setSerialNumber(e.target.value);
  };

  // Initialize and start the barcode scanner
  const initBarcodeScanner = () => {
    if (!scannerRef.current) return;
    
    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: scannerRef.current,
        constraints: {
          facingMode: "environment", // Use back camera on mobile devices
          width: { min: 450 },
          height: { min: 300 },
          aspectRatio: { min: 1, max: 2 }
        },
      },
      locator: {
        patchSize: "medium",
        halfSample: true
      },
      numOfWorkers: 2,
      frequency: 10,
      decoder: {
        readers: [
          "code_128_reader",
          "ean_reader",
          "ean_8_reader",
          "code_39_reader",
          "code_39_vin_reader",
          "codabar_reader",
          "upc_reader",
          "upc_e_reader",
          "i2of5_reader"
        ]
      },
      locate: true
    }, (err:Error) => {
      if (err) {
        console.error("Error initializing Quagga:", err);
        toast.error("Failed to initialize barcode scanner");
        return;
      }
      
      // Start the scanner when initialized successfully
      Quagga.start();
      setScanning(true);
      
      // Set up the detection callback
      Quagga.onDetected(handleBarcodeDetected);
      
      // Draw detection box
      Quagga.onProcessed(handleProcessed);
    });
  };

  // Process frames and draw detection box
  const handleProcessed = (result: any) => {
    const drawingCtx = Quagga.canvas.ctx.overlay;
    const drawingCanvas = Quagga.canvas.dom.overlay;

    if (result) {
      if (result.boxes) {
        drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        
        // Draw all boxes
        result.boxes.filter((box: any) => box !== result.box).forEach((box: any) => {
          Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, { color: "green", lineWidth: 2 });
        });
      }

      if (result.box) {
        // Draw main box in red
        Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, { color: "#FF3B58", lineWidth: 2 });
      }

      if (result.codeResult && result.codeResult.code) {
        // Highlight the found code
        Quagga.ImageDebug.drawPath(result.line, { x: 'x', y: 'y' }, drawingCtx, { color: 'yellow', lineWidth: 3 });
      }
    }
  };

  // Handle successful barcode detection
  const handleBarcodeDetected = (result: any) => {
    // We need a confidence threshold to avoid false positives
    if (result.codeResult && result.codeResult.code && result.codeResult.startInfo.error < 0.25) {
      const code = result.codeResult.code;
      
      // Stop scanning
      stopBarcodeScanner();
      
      // Update the serial number field with the scanned barcode
      setSerialNumber(code);
      
      // Show success message
      toast.success(`Barcode detected: ${code}`);
      
      // Close the camera view
      setShowCamera(false);
    }
  };

  // Stop the barcode scanner
  const stopBarcodeScanner = () => {
    if (scanning) {
      Quagga.stop();
      setScanning(false);
    }
  };

  const startCamera = async (): Promise<void> => {
    setShowCamera(true);
    
    // Initialize the barcode scanner after the component is rendered
    setTimeout(() => {
      initBarcodeScanner();
    }, 500);
  };

  const stopCamera = (): void => {
    stopBarcodeScanner();
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setShowCamera(false);
  };

  const handleScanBarcode = (): void => {
    startCamera();
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopBarcodeScanner();
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Function to save device to the JSON file via API
  const saveDeviceToFile = async (device: DeviceDetails): Promise<boolean> => {
    try {
      const response = await fetch('/api/onboarded-devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(device),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save device');
      }
      
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error saving device:', error);
      return false;
    }
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
          const timestamp = new Date().toISOString();
          setDeviceDetails({
            id: "DEV-" + Math.floor(Math.random() * 10000),
            serialNumber: serialNumber,
            model: "Cento Smart Speaker",
            firmware: "v1.2.3",
            lastSeen: "Never",
            status: "New",
            macAddress: "00:1A:2B:3C:4D:5E",
            addedAt: timestamp // Add timestamp
          });
          setIsLoading(false);
          setCurrentStep(1);
        }, 1500);
      } catch (error) {
        toast.error("Error fetching device details");
        setIsLoading(false);
      }
    } else if (currentStep === 1) {
      // Add device to user's account and save to JSON file
      setIsLoading(true);
      try {
        if (deviceDetails) {
          // Save device to JSON file via API
          const saved = await saveDeviceToFile(deviceDetails);
          
          if (saved) {
            setIsLoading(false);
            setIsAdded(true);
            setCurrentStep(2);
            toast.success("Device added successfully!");
          } else {
            throw new Error("Failed to save device data");
          }
        }
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
                    <div 
                      ref={scannerRef} 
                      className="w-full rounded-lg border border-gray-300 overflow-hidden"
                      style={{ 
                        minHeight: "300px",
                        maxHeight: "350px",
                        position: "relative"
                      }}
                    >
                      {/* QuaggaJS will inject the video element here */}
                      <div className="scanner-overlay absolute inset-0 z-10">
                        <div className="scanner-laser bg-red-500 h-px w-full absolute top-1/2 transform-translate-y-1/2 opacity-70"></div>
                      </div>
                    </div>
                    
                    <div className="absolute top-2 right-2 z-20">
                      <Button 
                        onClick={stopCamera}
                        className="rounded-full p-2 bg-gray-800 text-white"
                      >
                        <FiX />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600 font-medium">
                      Position the barcode within the camera view for scanning
                    </p>
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
                  <div>
                    <p className="text-sm text-gray-500">Added At</p>
                    <p className="font-medium">{new Date(deviceDetails.addedAt).toLocaleString()}</p>
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
                Your device has been successfully added to your account and saved to the database. You can now manage it from the dashboard.
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