'use client';

import React, { useRef, useCallback } from 'react';
import { useDrop, useDrag } from 'react-dnd/dist/hooks';

import { IoHandLeftOutline } from 'react-icons/io5';
import { FaPersonWalking } from "react-icons/fa6";
import ROSLIB from 'roslib';
import { FaHome } from 'react-icons/fa';

export interface BlockType {
type: string;
category: string;
params?: Record<string, number | string>;
isContainer?: boolean;
children?: BlockType[];
}

// Define the drag item type with updateSourceParent
interface DragItem {
block: BlockType;
sourceIndex: number;
sourcePath: number[];
sourceParent: BlockType[];
updateSourceParent: (
updated: BlockType[] | any,
action?: 'remove' | 'move',
path?: number[],
idx?: number,
targetIdx?: number
) => void;
}

interface NestedBlockProps {
block: BlockType;
index: number;
parentSequence: BlockType[];
updateParent: (
updated: BlockType[] | any,
action?: 'remove' | 'move',
path?: number[],
idx?: number,
targetIdx?: number
) => void;
isRunning: boolean;
path?: number[];
programAreaRef?: React.RefObject<HTMLDivElement | null>;
moveBlock?: (dragIndex: number, hoverIndex: number) => void;
}

const NestedBlock: React.FC<NestedBlockProps> = ({
block,
index,
parentSequence,
updateParent,
isRunning,
path = [],
programAreaRef,
moveBlock,
}) => {
const dragRef = useRef<HTMLDivElement>(null);
const dropRef = useRef<HTMLDivElement>(null);

const [{ isOver }, drop] = useDrop<
BlockType | DragItem,
{ dropped: boolean },
{ isOver: boolean }
>({
accept: ['BLOCK', 'EXISTING_BLOCK'],
drop: (item, monitor) => {
if (monitor.didDrop()) return { dropped: false };

  // Handle new blocks from palette
  if ('type' in item) {
    if (block.type === 'Repeat') {
      const newBlock: BlockType = { ...item };
      if (!block.children) block.children = [];
      block.children.push(newBlock);
      updateParent([...parentSequence]);
      return { dropped: true };
    }
  }
  
  // Handle existing blocks being moved into containers
  if ('block' in item && block.type === 'Repeat') {
    // Don't allow dropping a block into itself or its children
    const isNested = item.sourcePath.length > 0 && 
      path.length > 0 && 
      item.sourcePath.some((pathIdx, i) => path[i] === pathIdx);
    
    if (isNested) {
      return { dropped: false };
    }
    
    const newBlock: BlockType = { ...item.block };
    if (!block.children) block.children = [];
    block.children.push(newBlock);
    
    // Remove from source location
    const sourceCurrentPath = [...item.sourcePath];
    const sourceIdx = sourceCurrentPath.pop();
    if (sourceIdx !== undefined) {
      item.updateSourceParent(item.sourceParent, 'remove', sourceCurrentPath, sourceIdx);
    }
    
    updateParent([...parentSequence]);
    return { dropped: true };
  }

  return { dropped: false };
},
hover: (item, monitor) => {
  if (!dropRef.current) return;
  if (!monitor.isOver({ shallow: true })) return;
  
  // Only handle reordering for existing blocks at the same level
  if ('block' in item && item.sourceParent === parentSequence && item.sourceIndex !== index) {
    const dragIndex = item.sourceIndex;
    const hoverIndex = index;
    
    // Don't replace items with themselves
    if (dragIndex === hoverIndex) return;

    // Determine rectangle on screen
    const hoverBoundingRect = dropRef.current.getBoundingClientRect();
    
    // Get vertical middle
    const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
    
    // Determine mouse position
    const clientOffset = monitor.getClientOffset();
    if (!clientOffset) return;
    
    // Get pixels to the top
    const hoverClientY = clientOffset.y - hoverBoundingRect.top;
    
    // Only perform the move when the mouse has crossed half of the items height
    // When dragging downwards, only move when the cursor is below 50%
    // When dragging upwards, only move when the cursor is above 50%
    
    // Dragging downwards
    if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
      return;
    }
    
    // Dragging upwards
    if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
      return;
    }
    
    // Time to actually perform the action
    if (moveBlock) {
      moveBlock(dragIndex, hoverIndex);
    } else {
      // Fallback for nested blocks
      const newSequence = [...parentSequence];
      const draggedBlock = newSequence[dragIndex];
      newSequence.splice(dragIndex, 1);
      newSequence.splice(hoverIndex, 0, draggedBlock);
      updateParent(newSequence);
    }
    
    // Note: we're mutating the monitor item here!
    // Generally it's better to avoid mutations,
    // but it's good here for the sake of performance
    // to avoid having to render intermediate states.
    item.sourceIndex = hoverIndex;
  }
},
collect: (monitor) => ({
  isOver: monitor.isOver({ shallow: true }),
}),
});

// Drag functionality for existing blocks
const [{ isDragging }, drag] = useDrag<DragItem, void, { isDragging: boolean }>({
type: 'EXISTING_BLOCK',
item: () => ({
block,
sourceIndex: index,
sourcePath: path,
sourceParent: parentSequence,
updateSourceParent: updateParent
}),
end: (item, monitor) => {
const dropResult = monitor.getDropResult();
if (!dropResult && programAreaRef?.current) {
// Check if dragged outside program area
const clientOffset = monitor.getClientOffset();
if (clientOffset) {
const programAreaRect = programAreaRef.current.getBoundingClientRect();
const isOutside = (
clientOffset.x < programAreaRect.left ||
clientOffset.x > programAreaRect.right ||
clientOffset.y < programAreaRect.top ||
clientOffset.y > programAreaRect.bottom
);

      if (isOutside) {
        // Remove the block
        handleRemoveBlock();
      }
    }
  }
},
collect: (monitor) => ({
  isDragging: monitor.isDragging(),
}),
canDrag: !isRunning,
});

// Combine drag and drop refs
const combinedRef = useCallback((node: HTMLDivElement | null) => {
dragRef.current = node;
dropRef.current = node;
drag(node);
drop(node);
}, [drag, drop]);

const getCategoryIcon = (category: string) => {
switch (category) {
case 'arm':
return <IoHandLeftOutline className="text-white" />;
case 'wheel':
return <FaPersonWalking className="text-white" />;
case 'control':
return '⚙️';
default:
return '📦';
}
};

const getBlockColors = (category: string) => {
switch (category) {
case 'arm':
return {
bg: 'bg-gradient-to-r from-purple-600 to-purple-500',
border: 'border-purple-100',
highlight: 'bg-purple-300/20',
};
case 'wheel':
return {
bg: 'bg-gradient-to-r from-blue-600 to-blue-500',
border: 'border-blue-300',
highlight: 'bg-blue-400/20',
};
case 'control':
return {
bg: 'bg-gradient-to-r from-amber-400 to-amber-400',
border: 'border-amber-300',
highlight: 'bg-amber-400/20',
};
default:
return {
bg: 'bg-gray-600',
border: 'border-gray-300',
highlight: 'bg-gray-400/20',
};
}
};

const colors = getBlockColors(block.category);

const handleRemoveBlock = (e?: React.MouseEvent) => {
if (e) e.stopPropagation();
const currentPath = [...path]; 
const idx = currentPath.pop();
if (idx !== undefined) {
updateParent(parentSequence, 'remove', currentPath, idx);
}
};

// Helper function to get input constraints based on parameter key
const getInputConstraints = (key: string) => {
switch (key) {
case 'speed':
return { min: 0.1, max: 0.3, step: 0.01 };
case 'angle':
return { min: 1, max: 360, step: 1 };
case 'times': // For repeat blocks
return { min: 1, max: 10, step: 1 };
case 'seconds': // For delay blocks
return { min: 1, max: 10, step: 1 };
default:
return { min: undefined, max: undefined, step: 1 };
}
};

// Helper function to validate and constrain values
const validateValue = (key: string, value: number) => {
switch (key) {
case 'speed':
return Math.min(Math.max(value, 0.1), 0.3);
case 'angle':
return Math.min(Math.max(value, 1), 360);
case 'times':
return Math.min(Math.max(Math.round(value), 1), 10);
case 'seconds':
return Math.min(Math.max(Math.round(value), 1), 10);
default:
return value;
}
};

return (
<div
ref={combinedRef}
className={`${colors.bg} rounded-lg shadow-md mb-3 overflow-hidden transition-all duration-200 w-full max-w-[500px] mx-auto ${
        isDragging ? 'opacity-50 transform rotate-2 scale-105' : ''
      } ${!isRunning ? 'cursor-move' : 'cursor-default'}`}
style={{
opacity: isDragging ? 0.5 : 1,
}}
>
<div className="p-3 text-white relative group">
<div className="flex items-center">
<span className="mr-2">{getCategoryIcon(block.category)}</span>
<span className="font-medium">{block.type}</span>
{block.params &&
Object.entries(block.params).map(([key, value]) => {
const constraints = getInputConstraints(key);
return (
<div key={key} className="flex items-center bg-white/20 mx-1 px-2 py-1 rounded-lg">
<span className="text-sm mr-1">{key}:</span>
<input
type="number"
min={constraints.min}
max={constraints.max}
step={constraints.step}
className="bg-white/10 px-2 py-0.5 rounded text-sm w-14 focus:outline-none focus:ring-2 focus:ring-white/50"
defaultValue={value}
onChange={(e) => {
let val = parseFloat(e.target.value);
if (isNaN(val)) return;

                    val = validateValue(key, val);
                    block.params![key] = val;
                    updateParent([...parentSequence]);
                  }}
                  disabled={isRunning}
                />
              </div>
            );
          })}

        <button
          onClick={handleRemoveBlock}
          disabled={isRunning}
          className="opacity-0 group-hover:opacity-100 ml-auto bg-red-500/80 hover:bg-red-600 p-1 rounded-full transition-opacity"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    {block.isContainer && (
      <div
        className={`${isOver ? colors.highlight : 'bg-black/10'} mx-2 mb-2 p-2 rounded-lg border-2 border-dashed ${colors.border} transition-colors duration-200 min-h-12`}
      >
        {block.children?.length ? (
          block.children.map((child, childIndex) => (
            <NestedBlock
              key={childIndex}
              block={child}
              index={childIndex}
              parentSequence={block.children!}
              updateParent={(newChildren, action, path, idx, targetIdx) => {
                if (action === 'remove') {
                  newChildren.splice(idx, 1);
                } else if (action === 'move') {
                  const movedBlock = newChildren.splice(idx, 1)[0];
                  newChildren.splice(targetIdx, 0, movedBlock);
                } else {
                  block.children = newChildren;
                }
                updateParent([...parentSequence]);
              }}
              isRunning={isRunning}
              path={[...path, childIndex]}
              programAreaRef={programAreaRef}
              moveBlock={(dragIndex, hoverIndex) => {
                const newChildren = [...block.children!];
                const draggedBlock = newChildren[dragIndex];
                newChildren.splice(dragIndex, 1);
                newChildren.splice(hoverIndex, 0, draggedBlock);
                block.children = newChildren;
                updateParent([...parentSequence]);
              }}
            />
          ))
        ) : (
          <div className="flex items-center justify-center h-12 text-white/60 text-sm">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Drag blocks here
          </div>
        )}
      </div>
    )}
  </div>
);
};

interface ProgramAreaProps {
sequence: BlockType[];
onDrop: (block: BlockType) => void;
onPlay: () => void;
onStop: () => void;
isRunning: boolean;
updateSequence: (updated: BlockType[]) => void;
removeBlock?: (index: number) => void;
ros?: ROSLIB.Ros | null;
}

const ProgramArea: React.FC<ProgramAreaProps> = ({
sequence,
onDrop,
onPlay,
onStop,
isRunning,
updateSequence,
ros,
}) => {
const programAreaRef = useRef<HTMLDivElement | null>(null);
const dropAreaRef = useRef<HTMLDivElement | null>(null);

const moveBlock = useCallback((dragIndex: number, hoverIndex: number) => {
const newSequence = [...sequence];
const draggedBlock = newSequence[dragIndex];
newSequence.splice(dragIndex, 1);
newSequence.splice(hoverIndex, 0, draggedBlock);
updateSequence(newSequence);
}, [sequence, updateSequence]);

const [{ isOver }, drop] = useDrop<
BlockType | DragItem,
{ dropped: boolean },
{ isOver: boolean }
>({
accept: ['BLOCK', 'EXISTING_BLOCK'],
drop: (item, monitor) => {
if (monitor.didDrop()) return { dropped: false };

  // Handle new blocks from palette
  if ('type' in item) {
    onDrop(item);
    return { dropped: true };
  }
  
  return { dropped: false };
},
collect: (monitor) => ({
  isOver: monitor.isOver({ shallow: true }),
}),
});

// Combine drop ref
const combinedDropRef = useCallback((node: HTMLDivElement | null) => {
dropAreaRef.current = node;
drop(node);
}, [drop]);

const updateBlockInSequence = (
newSequence: BlockType[],
action?: 'remove' | 'move',
path: number[] = [],
index?: number,
targetIndex?: number
) => {
if (action === 'remove' && typeof index === 'number') {
let currentArray = newSequence;
for (const idx of path) {
currentArray = currentArray[idx].children!;
}
currentArray.splice(index, 1);
updateSequence([...newSequence]);
} else if (action === 'move' && typeof index === 'number' && typeof targetIndex === 'number') {
let currentArray = newSequence;
for (const idx of path) {
currentArray = currentArray[idx].children!;
}
const movedBlock = currentArray.splice(index, 1)[0];
currentArray.splice(targetIndex, 0, movedBlock);
updateSequence([...newSequence]);
} else {
updateSequence(newSequence);
}
};

const handleHomeClick = () => {
if (!ros) return;
const topic = new ROSLIB.Topic({
ros,
name: '/c20000002/arm_topic',
messageType: 'std_msgs/msg/String',
});

topic.publish(new ROSLIB.Message({ data: 'Home' }));
console.log('Sent Home command to robot');
};

return (
<div 
   ref={programAreaRef}
   className="bg-white rounded-xl shadow-md p-4 sm:p-6"
 >
   <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
     <h2 className="text-lg sm:text-xl font-bold text-gray-800">Program</h2>

    <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
      {/* Play Button */}
      <button
        onClick={onPlay}
        disabled={isRunning || sequence.length === 0}
        className={`flex-1 sm:flex-none flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg shadow transition-all text-sm sm:text-base ${
          isRunning || sequence.length === 0
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-green-500 hover:bg-green-600 text-white hover:shadow-md'
        }`}
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path>
        </svg>
        Play
      </button>

      {/* Stop Button */}
      <button
        onClick={onStop}
        disabled={!isRunning}
        className={`flex-1 sm:flex-none flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg shadow transition-all text-sm sm:text-base ${
          !isRunning
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-red-500 hover:bg-red-600 text-white hover:shadow-md'
        }`}
      >
         <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd"></path>
        </svg>
        Stop
      </button>

      {/* Home Button */}
      <button
        onClick={handleHomeClick}
        disabled={isRunning}
        className={`flex-1 sm:flex-none flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg shadow transition-all text-sm sm:text-base ${
          isRunning
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-indigo-500 hover:bg-indigo-600 text-white hover:shadow-md'
        }`}
      >
       <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
        Home
      </button>
    </div>
  </div>

  {/* Drop Area */}
  <div
    ref={combinedDropRef}
    className={`min-h-[300px] sm:min-h-[400px] border-2 border-dashed rounded-lg p-3 sm:p-4 transition-colors duration-200 ${
      isOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
    }`}
  >
    {sequence.length > 0 ? (
      sequence.map((block, index) => (
        <NestedBlock
          key={index}
          block={block}
          index={index}
          parentSequence={sequence}
          updateParent={updateBlockInSequence}
          isRunning={isRunning}
          path={[index]}
          programAreaRef={programAreaRef}
          moveBlock={moveBlock}
        />
      ))
    ) : (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4v16m8-8H4" />
        </svg>
        <p className="text-lg">Drag blocks here to build your program</p>
        <p className="text-sm mt-1">Drag blocks outside to remove them</p>
      </div>
    )}
  </div>
</div>
);
};

export default ProgramArea;