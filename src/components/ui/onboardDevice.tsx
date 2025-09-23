"use client";
import React, { useState, useRef, useEffect, ChangeEvent } from "react";
import { Card } from "@/components/ui/card";
import { CardContent } from "@/components/ui/cardContent";
import { Button } from "@/components/ui/button";
import { FiSearch, FiCheckCircle, FiArrowLeft, FiArrowRight, FiCamera, FiX, FiAlertCircle } from "react-icons/fi";
import toast from "react-hot-toast";
import Quagga from 'quagga';
import Image from "next/image";

// Define types for our component
interface DeviceDetails {
  id: string;
  serialNumber: string;
  name: string;
  description: string;
  imageUrl: string;
  type: string;
  macAddress: string;
  handMovements: Array<string>;
  addedAt: string;
}

const OnboardDevice: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [serialNumber, setSerialNumber] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [deviceDetails, setDeviceDetails] = useState<DeviceDetails | null>(null);
  const [deviceNotFound, setDeviceNotFound] = useState<boolean>(false);
  const [isAdded, setIsAdded] = useState<boolean>(false);
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [scanning, setScanning] = useState<boolean>(false);
  
  const scannerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleSerialNumberChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setSerialNumber(e.target.value);
    // Reset device not found status when input changes
    if (deviceNotFound) {
      setDeviceNotFound(false);
    }
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
    }, (err: Error) => {
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

  // Function to check if a device exists
  const fetchDeviceDetails = async (serialNum: string): Promise<DeviceDetails | null> => {
    try {
      const response = await fetch(`/api/serialnumber?serialNum=${serialNum}`);

  
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Device not found
        }
        throw new Error(`Error: ${response.status}`);
      }
  
      const data = await response.json();
      return data.device;
    } catch (error) {
      console.error("Error fetching device:", error);
      throw error;
    }
  };
  

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

      // Fetch actual device details from backend
      setIsLoading(true);
      try {
        const deviceData = await fetchDeviceDetails(serialNumber);
        
        if (deviceData) {
          setDeviceDetails(deviceData);
          setDeviceNotFound(false);
          setCurrentStep(1);
        } else {
          setDeviceNotFound(true);
          toast.error("Device not found");
        }
      } catch (error) {
        toast.error("Error fetching device details");
        console.error(error);
      } finally {
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
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    } else if (currentStep === 2) {
      // Reset the form
      setCurrentStep(0);
      setSerialNumber("");
      setDeviceDetails(null);
      setDeviceNotFound(false);
      setIsAdded(false);
    }
  };

  const handleBack = (): void => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
console.log(deviceDetails,"........................")
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
                <>
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
                  
                  {deviceNotFound && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                      <FiAlertCircle className="text-red-500 mr-2 mt-1" />
                      <div>
                        <p className="text-red-700 font-medium">Device Not Found</p>
                        <p className="text-sm text-red-600">
                          The serial number you entered does not match any registered device in our database. 
                          Please check the serial number and try again.
                        </p>
                      </div>
                    </div>
                  )}
                </>
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
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{deviceDetails.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="font-medium">{deviceDetails.description}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Photo</p>
                    <Image src={deviceDetails.imageUrl} alt={deviceDetails.name} width={100} height={100} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Type</p>
                    <p className="font-medium">{deviceDetails.handMovements}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start">
                <FiCheckCircle className="text-blue-500 mr-2 mt-1" />
                <div>
                  <p className="text-blue-700 font-medium">Ready to Add</p>
                  <p className="text-sm text-blue-600">
                    This device is available and can be added to your account. Click "Next" to complete the process.
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 p-4 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-green-100 p-4">
                  <FiCheckCircle className="text-green-500 text-3xl" />
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium">Device Successfully Added</h3>
                <p className="text-sm text-gray-500 mt-1">
                  The device has been successfully added to your account and is ready to use
                </p>
              </div>
              
              {deviceDetails && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-left">
                    <p className="text-sm text-gray-500">Device</p>
                    <p className="font-medium">{deviceDetails.id} ({deviceDetails.serialNumber})</p>
                  </div>
                </div>
              )}
              
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
                <FiCheckCircle className="text-green-500 mr-2 mt-1" />
                <div className="text-left">
                  <p className="text-green-700 font-medium">Successfully Onboarded</p>
                  <p className="text-sm text-green-600">
                    You can now manage this device from your device dashboard.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-between">
            {currentStep > 0 && currentStep < 2 ? (
              <Button 
                onClick={handleBack}
                className="px-4 py-2 flex items-center bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                disabled={isLoading}
              >
                <FiArrowLeft className="mr-2" /> Back
              </Button>
            ) : (
              <div></div> // Empty div to maintain flex spacing
            )}
            
            <Button 
              onClick={handleNext}
              className={`px-4 py-2 flex items-center ${
                currentStep === 2 ? "bg-green-500 hover:bg-green-600" : "bg-blue-500 hover:bg-blue-600"
              } text-white rounded`}
              disabled={isLoading}
            >
              {isLoading ? (
                <span>Loading...</span>
              ) : (
                <>
                  {currentStep === 0 && (
                    <>
                      <FiSearch className="mr-2" /> Find Device
                    </>
                  )}
                  {currentStep === 1 && (
                    <>
                      <FiCheckCircle className="mr-2" /> Add Device
                    </>
                  )}
                  {currentStep === 2 && (
                    <>
                      Add Another Device
                    </>
                  )}
                  {currentStep < 2 && <FiArrowRight className="ml-2" />}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardDevice;