'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DndProvider } from 'react-dnd/dist/core/DndProvider';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ROSLIB from 'roslib';
import BlockPalette from '@/components/BlockPalette/BlockPalette';
import ProgramArea from '@/components/ProgramArea/ProgramArea';
import toast from 'react-hot-toast';

export type Block = {
  type: string;
  category: string;
  params?: Record<string, any>;
  children?: Block[];
  _prevBlock?: Block | null;
};

const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
);

const RobotIcon = ({ className }: { className?: string }) => (
  <div className={`relative ${className}`}>
    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center animate-pulse">
      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
        <div className="w-4 h-4 bg-blue-500 rounded animate-bounce"></div>
      </div>
    </div>
    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full animate-ping"></div>
  </div>
);

const BlockCodingGate: React.FC = () => {
  const [isBlockCodingActive, setIsBlockCodingActive] = useState<boolean>(false);
  const [ros, setRos] = useState<ROSLIB.Ros | null>(null);
  const [connecting, setConnecting] = useState<boolean>(true);
  const [dots, setDots] = useState<string>('');
  const [lastCheckTime, setLastCheckTime] = useState<string>('');
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const blockCodingTopicRef = useRef<ROSLIB.Topic | null>(null);

  // Animated dots effect
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Function to check block coding status
  const checkBlockCodingStatus = () => {
    if (!blockCodingTopicRef.current) return;
    
    const now = new Date().toLocaleTimeString();
    setLastCheckTime(now);
    console.log(`🕐 [${now}] Checking block coding status...`);
    
    // Create a service call or topic to request current status
    // Since we're checking periodically, we can also log this for debugging
    const statusTopic = new ROSLIB.Topic({
      ros: ros!,
      name: '/c20000002/block_coding_status_request',
      messageType: 'std_msgs/String'
    });
    
    // Send a status request message
    statusTopic.publish(new ROSLIB.Message({ data: 'status_check' }));
  };

  useEffect(() => {
    const userRole = localStorage.getItem("userRole");
    if (userRole === "developer") {
      toast.success("Welcome Developer!");
    } else {
      toast.error("You are not authorized to access this page.");
      window.location.href = "/login";
      return;
    }

    // Connect to ROS and setup periodic checking
    const connectAndListen = () => {
      const rosConnection = new ROSLIB.Ros({
        url: `ws://c20000002.local:9090`,
      });

      rosConnection.on('connection', () => {
        console.log('✅ Connected to ROS 2 websocket server.');
        setRos(rosConnection);
        setConnecting(false);

        // Subscribe to block_coding topic
        const blockCodingTopic = new ROSLIB.Topic({
          ros: rosConnection,
          name: '/c20000002/block_coding',
          messageType: 'std_msgs/String'
        });
        
        blockCodingTopicRef.current = blockCodingTopic;
        
        console.log('🔔 Subscribing to block_coding topic...');
        blockCodingTopic.subscribe((message: any) => {
          const timestamp = new Date().toLocaleTimeString();
          console.log(`📦 [${timestamp}] Block coding message received:`, message.data);
          
          if (message.data === 'start') {
            setIsBlockCodingActive(true);
            toast.success('🚀 Block coding activated!');
            
            // Clear the periodic check since we're now active
            if (checkIntervalRef.current) {
              clearInterval(checkIntervalRef.current);
              checkIntervalRef.current = null;
            }
          } else if (message.data === 'stop') {
            setIsBlockCodingActive(false);
            toast.error('🛑 Block coding deactivated!');
            
            // Restart periodic checking
            startPeriodicCheck();
          }
        });

        // Start periodic checking every 5 seconds
        startPeriodicCheck();
      });

      rosConnection.on('error', (error: Error) => {
        console.error('❌ Error connecting to websocket server:', error);
        setConnecting(false);
        
        // Clear interval on connection error
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
        
        setTimeout(connectAndListen, 3000); // Retry connection
      });

      rosConnection.on('close', () => {
        console.log('🔌 Connection to websocket server closed.');
        setIsBlockCodingActive(false);
        setConnecting(true);
        
        // Clear interval on connection close
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
        
        setTimeout(connectAndListen, 3000); // Retry connection
      });
    };

    const startPeriodicCheck = () => {
      // Clear any existing interval
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      
      // Start new interval for checking every 5 seconds
      checkIntervalRef.current = setInterval(() => {
        if (!isBlockCodingActive) {
          checkBlockCodingStatus();
        }
      }, 5000);
      
      console.log('⏰ Started periodic checking every 5 seconds');
    };

    connectAndListen();

    // Cleanup on unmount
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [isBlockCodingActive]);

  if (!isBlockCodingActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-2xl mx-auto text-center">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
            <div className="absolute top-1/3 right-1/4 w-32 h-32 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-1/4 left-1/3 w-32 h-32 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
          </div>

          {/* Main Content */}
          <div className="relative z-10 bg-white/80 backdrop-blur-sm rounded-3xl p-8 sm:p-12 shadow-2xl border border-white/20">
            <div className="mb-8 flex justify-center">
              <RobotIcon className="transform hover:scale-110 transition-transform duration-300" />
            </div>

            <div className="space-y-6">
              <div className="relative">
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                  CENTO Robot Controller
                </h1>
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000"></div>
              </div>

              <div className="space-y-4">
                <div className="inline-flex items-center space-x-3 bg-yellow-50 border-2 border-yellow-200 rounded-2xl px-6 py-4">
                  <div className="flex space-x-1">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce animation-delay-200"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce animation-delay-400"></div>
                  </div>
                  <span className="text-yellow-800 font-semibold text-lg">
                    {connecting ? `Connecting to robot${dots}` : 'Waiting for activation'}
                  </span>
                </div>

                <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-6">
                  <div className="flex items-center justify-center space-x-3 mb-4">
                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">!</span>
                    </div>
                    <h2 className="text-xl font-bold text-red-700">Access Restricted</h2>
                  </div>
                  
                  <p className="text-red-600 text-lg leading-relaxed mb-4">
                    You can't access this page right now.
                  </p>
                  
                  <div className="bg-white/50 rounded-xl p-4 border border-red-200">
                    <p className="text-red-700 font-medium text-base">
                      Please start <span className="font-bold bg-red-100 px-2 py-1 rounded">block coding</span> on the robot first
                    </p>
                  </div>
                </div>

                {connecting ? (
                  <div className="flex items-center justify-center space-x-3 text-blue-600">
                    <LoadingSpinner />
                    <span className="text-lg font-medium">Establishing connection...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-3 text-gray-500">
                      <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse"></div>
                      <span className="text-lg">Checking every 5 seconds...</span>
                    </div>
                    {lastCheckTime && (
                      <div className="text-sm text-gray-400">
                        Last check: {lastCheckTime}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Floating Animation Elements */}
          <div className="absolute top-10 left-10 w-4 h-4 bg-blue-400 rounded-full animate-float"></div>
          <div className="absolute top-20 right-20 w-6 h-6 bg-purple-400 rounded-full animate-float animation-delay-1000"></div>
          <div className="absolute bottom-20 left-20 w-5 h-5 bg-indigo-400 rounded-full animate-float animation-delay-2000"></div>
          <div className="absolute bottom-10 right-10 w-3 h-3 bg-pink-400 rounded-full animate-float animation-delay-3000"></div>
        </div>

        <style jsx>{`
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          
          .animate-blob {
            animation: blob 7s infinite;
          }
          
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
          
          .animation-delay-200 {
            animation-delay: 0.2s;
          }
          
          .animation-delay-400 {
            animation-delay: 0.4s;
          }
          
          .animation-delay-1000 {
            animation-delay: 1s;
          }
          
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          
          .animation-delay-3000 {
            animation-delay: 3s;
          }
          
          .animation-delay-4000 {
            animation-delay: 4s;
          }
        `}</style>
      </div>
    );
  }

  // Original BlockCode component content when block coding is active
  return <BlockCode ros={ros} />;
};

// Original BlockCode component (extracted for cleaner code)
const BlockCode: React.FC<{ ros: ROSLIB.Ros | null }> = ({ ros: initialRos }) => {
  const [ros, setRos] = useState<ROSLIB.Ros | null>(initialRos);
  const [sequence, setSequence] = useState<Block[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const isRunningRef = useRef<boolean>(isRunning);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    if (initialRos) {
      setRos(initialRos);
    }
  }, [initialRos]);

  const connectToROS = () => {
    setConnecting(true);
    setConnectionError(null);

    const rosConnection = new ROSLIB.Ros({
      url: `ws://c20000002.local:9090`,
    });

    rosConnection.on('connection', () => {
      console.log('✅ Connected to ROS 2 websocket server.');
      setRos(rosConnection);
      setConnecting(false);
    });

    rosConnection.on('error', (error: Error) => {
      console.error('❌ Error connecting to websocket server:', error);
      setConnectionError('Failed to connect to robot. Please check if the robot is powered on and try again.');
      setRos(null);
      setConnecting(false);
    });

    rosConnection.on('close', () => {
      console.log('🔌 Connection to websocket server closed.');
      setConnectionError('Connection lost. Please try reconnecting.');
      setRos(null);
      setConnecting(false);
    });
  };

  const handleDrop = (block: Block) => {
    setSequence((prev) => [...prev, { ...block }]);
  };

  const updateSequence = (newSequence: Block[]) => {
    setSequence(newSequence);
  };

  const removeBlock = (index: number) => {
    const newSequence = [...sequence];
    newSequence.splice(index, 1);
    setSequence(newSequence);
  };

  const SAFETY_DELAY = 2000;

  const isWheelTransitionRisky = (prev?: Block | null, curr?: Block): boolean => {
    if (!prev || !curr) return false;

    const linear = ['Move Forward', 'Move Backward'];
    const angular = ['Turn Left', 'Turn Right'];

    const isPrevLinear = linear.includes(prev.type);
    const isCurrLinear = linear.includes(curr.type);
    const isPrevAngular = angular.includes(prev.type);
    const isCurrAngular = angular.includes(curr.type);

    const isOpposite =
      (prev.type === 'Move Forward' && curr.type === 'Move Backward') ||
      (prev.type === 'Move Backward' && curr.type === 'Move Forward') ||
      (prev.type === 'Turn Left' && curr.type === 'Turn Right') ||
      (prev.type === 'Turn Right' && curr.type === 'Turn Left');

    const isTypeSwitch = (isPrevLinear && isCurrAngular) || (isPrevAngular && isCurrLinear);

    return isOpposite || isTypeSwitch;
  };

  const executeBlock = async (block: Block): Promise<void> => {
    if (!ros) return;

    console.log(`Executing block: ${block.type}`, block.params);

    if (block.type === 'Repeat' && block.children) {
      const times = block.params?.times ?? 1;

      for (let i = 0; i < times && isRunningRef.current; i++) {
        for (const child of block.children) {
          if (!isRunningRef.current) break;
          await executeBlock(child);

          if (child.category === 'arm') {
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        }
        if (i < times - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
      return;
    }

    if (block.category === 'arm') {
      const topic = new ROSLIB.Topic({
        ros,
        name: '/c20000002/arm_topic',
        messageType: 'std_msgs/msg/String',
      });

      topic.publish(new ROSLIB.Message({ data: block.type }));
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    if (block.category === 'wheel' && block._prevBlock && isWheelTransitionRisky(block._prevBlock, block)) {
      await new Promise((resolve) => setTimeout(resolve, SAFETY_DELAY));
    }

    if (block.type === 'Delay') {
      const delayTime = (block.params?.seconds || 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delayTime));
      return;
    }

    if (block.category === 'wheel') {
      const topic = new ROSLIB.Topic({
        ros,
        name: '/c20000002/cmd_vel',
        messageType: 'geometry_msgs/msg/Twist',
      });

      if (block.type.includes('Left') || block.type.includes('Right')) {
        const angularSpeed = 0.3;
        const angle = block.params?.angle ?? 0;
        const angleRad = (angle * Math.PI) / 180;
        const duration = angleRad / (angularSpeed + 0.0634);

        const twist = new ROSLIB.Message({
          linear: { x: 0, y: 0, z: 0 },
          angular: {
            x: 0,
            y: 0,
            z: block.type.includes('Left') ? angularSpeed : -angularSpeed,
          },
        });

        const interval = 100;
        let elapsed = 0;
        const timer = setInterval(() => {
          topic.publish(twist);
          elapsed += interval;
          if (elapsed >= duration * 1000) {
            clearInterval(timer);
            topic.publish(new ROSLIB.Message({ linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } }));
          }
        }, interval);

        await new Promise((resolve) => setTimeout(resolve, duration * 1000 + 100));
      } else if (block.type === 'Move Forward' || block.type === 'Move Backward') {
        const speed = 0.3;
        const duration = block.params?.duration ?? 2;

        const twist = new ROSLIB.Message({
          linear: { x: block.type === 'Move Forward' ? speed : -speed, y: 0, z: 0 },
          angular: { x: 0, y: 0, z: 0 },
        });

        topic.publish(twist);
        await new Promise((resolve) => setTimeout(resolve, duration * 1000));
        topic.publish(new ROSLIB.Message({ linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } }));
      }
    }
  };

  const playSequence = async () => {
    if (!ros) {
      console.error("Cannot play sequence: ROS connection not established");
      return;
    }

    setIsRunning(true);
    isRunningRef.current = true;

    try {
      let prevBlock: Block | null = null;
      for (const block of sequence) {
        if (!isRunningRef.current) break;
        block._prevBlock = prevBlock;
        await executeBlock(block);
        prevBlock = block;
      }
    } catch (err) {
      console.error("Error executing sequence:", err);
    } finally {
      setIsRunning(false);
      isRunningRef.current = false;
    }
  };

  const stopSequence = () => {
    setIsRunning(false);
    isRunningRef.current = false;
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gray-50 font-geinst">
        <div className="container mx-auto p-4 sm:p-6">
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex items-center flex-wrap gap-2">
                <img src="/logo.png" alt="Cento Logo" className="h-12 w-12 sm:h-16 sm:w-16" />
                <h1 className="text-lg sm:text-xl font-bold text-indigo-700">CENTO ROBOT CONTROLLER</h1>
              </div>

              <div className="w-full sm:w-auto">
                {connecting ? (
                  <div className="flex items-center bg-blue-50 px-3 py-2 rounded-lg text-sm sm:text-base">
                    <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-blue-700">Connecting to robot...</span>
                  </div>
                ) : connectionError ? (
                  <div className="w-full space-y-2">
                    <div className="bg-red-50 px-3 py-2 rounded-lg text-sm">
                      <p className="text-red-700 mb-2">{connectionError}</p>
                      <button
                        onClick={connectToROS}
                        className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-md text-sm"
                      >
                        Retry Connection
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg text-sm">
                      <span className="text-gray-500">Status:</span>
                      <span className={`font-medium ${ros ? 'text-green-500' : 'text-red-500'}`}>
                        {ros ? '✅ Connected' : '❌ Not Connected'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
            <div className="w-full lg:w-72">
              <BlockPalette />
            </div>
            <div className="flex-1">
              <ProgramArea
                sequence={sequence}
                onDrop={handleDrop}
                onPlay={playSequence}
                onStop={stopSequence}
                isRunning={isRunning}
                updateSequence={updateSequence}
                removeBlock={removeBlock}
                ros={ros}
              />
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default BlockCodingGate;







//

// 'use client';

// import React, { useState, useEffect, useRef } from 'react';
// import { DndProvider } from 'react-dnd/dist/core/DndProvider';
// import { HTML5Backend } from 'react-dnd-html5-backend';
// import ROSLIB from 'roslib';
// import BlockPalette from '@/components/BlockPalette/BlockPalette';
// import ProgramArea from '@/components/ProgramArea/ProgramArea';
// import toast from 'react-hot-toast';

// export type Block = {
//   type: string;
//   category: string;
//   params?: Record<string, any>;
//   children?: Block[];
//   _prevBlock?: Block | null;
// };

// const BlockCode: React.FC = () => {
//   const [ros, setRos] = useState<ROSLIB.Ros | null>(null);
//   const [sequence, setSequence] = useState<Block[]>([]);
//   const [isRunning, setIsRunning] = useState<boolean>(false);
//   const [connecting, setConnecting] = useState<boolean>(false);
//   const [connectionError, setConnectionError] = useState<string | null>(null);
//   const isRunningRef = useRef<boolean>(isRunning);
  

//   useEffect(() => {
//     isRunningRef.current = isRunning;
//   }, [isRunning]);
//   useEffect(()=>{
//     const userRole = localStorage.getItem("userRole");
//     if (userRole === "developer") {
//       toast.success("Welcome  Developer!");
//     } else {
//       toast.error("You are not authorized to access this page.");
//       window.location.href = "/login"; // Redirect to login page
//     }
//   },[])

//   const connectToROS = () => {
//     setConnecting(true);
//     setConnectionError(null);

//     const rosConnection = new ROSLIB.Ros({
//       url: `ws://c20000002.local:9090`,
//     });

//     rosConnection.on('connection', () => {
//       console.log('✅ Connected to ROS 2 websocket server.');
//       setRos(rosConnection);
//       setConnecting(false);
//     });

//     rosConnection.on('error', (error:Error) => {
//       console.error('❌ Error connecting to websocket server:', error);
//       setConnectionError('Failed to connect to robot. Please check if the robot is powered on and try again.');
//       setRos(null);
//       setConnecting(false);
//     });

//     rosConnection.on('close', () => {
//       console.log('🔌 Connection to websocket server closed.');
//       setConnectionError('Connection lost. Please try reconnecting.');
//       setRos(null);
//       setConnecting(false);
//     });
//   };

//   useEffect(() => {
//     connectToROS();
//   }, []);

//   const handleDrop = (block: Block) => {
//     setSequence((prev) => [...prev, { ...block }]);
//   };

//   const updateSequence = (newSequence: Block[]) => {
//     setSequence(newSequence);
//   };

//   const removeBlock = (index: number) => {
//     const newSequence = [...sequence];
//     newSequence.splice(index, 1);
//     setSequence(newSequence);
//   };

//   const SAFETY_DELAY = 2000;

//   const isWheelTransitionRisky = (prev?: Block | null, curr?: Block): boolean => {
//     if (!prev || !curr) return false;

//     const linear = ['Move Forward', 'Move Backward'];
//     const angular = ['Turn Left', 'Turn Right'];

//     const isPrevLinear = linear.includes(prev.type);
//     const isCurrLinear = linear.includes(curr.type);
//     const isPrevAngular = angular.includes(prev.type);
//     const isCurrAngular = angular.includes(curr.type);

//     const isOpposite =
//       (prev.type === 'Move Forward' && curr.type === 'Move Backward') ||
//       (prev.type === 'Move Backward' && curr.type === 'Move Forward') ||
//       (prev.type === 'Turn Left' && curr.type === 'Turn Right') ||
//       (prev.type === 'Turn Right' && curr.type === 'Turn Left');

//     const isTypeSwitch = (isPrevLinear && isCurrAngular) || (isPrevAngular && isCurrLinear);

//     return isOpposite || isTypeSwitch;
//   };

//   const executeBlock = async (block: Block): Promise<void> => {
//     if (!ros) return;

//     console.log(`Executing block: ${block.type}`, block.params);

//     if (block.type === 'Repeat' && block.children) {
//       const times = block.params?.times ?? 1;

//       for (let i = 0; i < times && isRunningRef.current; i++) {
//         for (const child of block.children) {
//           if (!isRunningRef.current) break;
//           await executeBlock(child);

//           if (child.category === 'arm') {
//             await new Promise((resolve) => setTimeout(resolve, 1500));
//           }
//         }
//         if (i < times - 1) {
//           await new Promise((resolve) => setTimeout(resolve, 2000));
//         }
//       }
//       return;
//     }

//     if (block.category === 'arm') {
//       const topic = new ROSLIB.Topic({
//         ros,
//         name: '/c20000002/arm_topic',
//         messageType: 'std_msgs/msg/String',
//       });

//       topic.publish(new ROSLIB.Message({ data: block.type }));
//       await new Promise((resolve) => setTimeout(resolve, 5000));
//     }

//     if (block.category === 'wheel' && block._prevBlock && isWheelTransitionRisky(block._prevBlock, block)) {
//       await new Promise((resolve) => setTimeout(resolve, SAFETY_DELAY));
//     }

//     if (block.type === 'Delay') {
//       const delayTime = (block.params?.seconds || 1) * 1000;
//       await new Promise((resolve) => setTimeout(resolve, delayTime));
//       return;
//     }

//     if (block.category === 'wheel') {
//       const topic = new ROSLIB.Topic({
//         ros,
//         name: '/c20000002/cmd_vel',
//         messageType: 'geometry_msgs/msg/Twist',
//       });

//       if (block.type.includes('Left') || block.type.includes('Right')) {
//         const angularSpeed = 0.3;
//         const angle = block.params?.angle ?? 0;
//         const angleRad = (angle * Math.PI) / 180;
//         const duration = angleRad / (angularSpeed + 0.0634);

//         const twist = new ROSLIB.Message({
//           linear: { x: 0, y: 0, z: 0 },
//           angular: {
//             x: 0,
//             y: 0,
//             z: block.type.includes('Left') ? angularSpeed : -angularSpeed,
//           },
//         });

//         const interval = 100;
//         let elapsed = 0;
//         const timer = setInterval(() => {
//           topic.publish(twist);
//           elapsed += interval;
//           if (elapsed >= duration * 1000) {
//             clearInterval(timer);
//             topic.publish(new ROSLIB.Message({ linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } }));
//           }
//         }, interval);

//         await new Promise((resolve) => setTimeout(resolve, duration * 1000 + 100));
//       } else if (block.type === 'Move Forward' || block.type === 'Move Backward') {
//         const speed = 0.3;
//         const duration = block.params?.duration ?? 2;

//         const twist = new ROSLIB.Message({
//           linear: { x: block.type === 'Move Forward' ? speed : -speed, y: 0, z: 0 },
//           angular: { x: 0, y: 0, z: 0 },
//         });

//         topic.publish(twist);
//         await new Promise((resolve) => setTimeout(resolve, duration * 1000));
//         topic.publish(new ROSLIB.Message({ linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } }));
//       }
//     }
//   };

//   const playSequence = async () => {
//     if (!ros) {
//       console.error("Cannot play sequence: ROS connection not established");
//       return;
//     }

//     setIsRunning(true);
//     isRunningRef.current = true;

//     try {
//       let prevBlock: Block | null = null;
//       for (const block of sequence) {
//         if (!isRunningRef.current) break;
//         block._prevBlock = prevBlock;
//         await executeBlock(block);
//         prevBlock = block;
//       }
//     } catch (err) {
//       console.error("Error executing sequence:", err);
//     } finally {
//       setIsRunning(false);
//       isRunningRef.current = false;
//     }
//   };

//   const stopSequence = () => {
//     setIsRunning(false);
//     isRunningRef.current = false;
//   };

//   return (
//     <DndProvider backend={HTML5Backend}>
//       <div className="min-h-screen bg-gray-50 font-geinst ">
//         <div className="container mx-auto p-4 sm:p-6">
//           <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md mb-4 sm:mb-6">
//             <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
//               <div className="flex items-center flex-wrap gap-2 ">
//                 <img src="/logo.png" alt="Cento Logo" className="h-12 w-12 sm:h-16 sm:w-16 " />
//                 <h1 className="text-lg sm:text-xl font-bold text-indigo-700">CENTO ROBOT CONTROLLER</h1>
//               </div>

//               <div className="w-full sm:w-auto">
//                 {connecting ? (
//                   <div className="flex items-center bg-blue-50 px-3 py-2 rounded-lg text-sm sm:text-base">
//                     <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24">
//                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
//                     </svg>
//                     <span className="text-blue-700">Connecting to robot...</span>
//                   </div>
//                 ) : connectionError ? (
//                   <div className="w-full space-y-2">
//                     <div className="bg-red-50 px-3 py-2 rounded-lg text-sm">
//                       <p className="text-red-700 mb-2">{connectionError}</p>
//                       <button
//                         onClick={connectToROS}
//                         className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-md text-sm"
//                       >
//                         Retry Connection
//                       </button>
//                     </div>
//                   </div>
//                 ) : (
//                   <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
//                     <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg text-sm">
//                       <span className="text-gray-500">Status:</span>
//                       <span className={`font-medium ${ros ? 'text-green-500' : 'text-red-500'}`}>
//                         {ros ? '✅ Connected' : '❌ Not Connected'}
//                       </span>
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>

//           <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
//             <div className="w-full lg:w-72">
//               <BlockPalette />
//             </div>
//             <div className="flex-1">
//               <ProgramArea
//                 sequence={sequence}
//                 onDrop={handleDrop}
//                 onPlay={playSequence}
//                 onStop={stopSequence}
//                 isRunning={isRunning}
//                 updateSequence={updateSequence}
//                 removeBlock={removeBlock}
//                 ros={ros}
//               />
//             </div>
//           </div>
//         </div>
//       </div>
//     </DndProvider>
//   );
// };

// export default BlockCode;
