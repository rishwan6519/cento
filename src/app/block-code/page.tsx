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

const BlockCode: React.FC = () => {
  const [ros, setRos] = useState<ROSLIB.Ros | null>(null);
  const [sequence, setSequence] = useState<Block[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const isRunningRef = useRef<boolean>(isRunning);
  

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);
  useEffect(()=>{
    const userRole = localStorage.getItem("userRole");
    if (userRole === "developer") {
      toast.success("Welcome  Developer!");
    } else {
      toast.error("You are not authorized to access this page.");
      window.location.href = "/login"; // Redirect to login page
    }
  },[])

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

    rosConnection.on('error', (error:Error) => {
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

  useEffect(() => {
    connectToROS();
  }, []);

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
      <div className="min-h-screen bg-gray-50 font-geinst ">
        <div className="container mx-auto p-4 sm:p-6">
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex items-center flex-wrap gap-2 ">
                <img src="/logo.png" alt="Cento Logo" className="h-12 w-12 sm:h-16 sm:w-16 " />
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

export default BlockCode;
