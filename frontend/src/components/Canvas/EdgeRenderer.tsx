'use client';

import React from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath } from '@xyflow/react';

const NetworkEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  animated,
}: EdgeProps) => {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  return (
    <>
      {/* Background shadow for attack path */}
      {animated && (
        <path
          d={edgePath}
          fill="none"
          stroke="#ef4444"
          strokeWidth={4}
          strokeOpacity={0.2}
          className="blur-sm"
        />
      )}
      
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: animated ? 2 : 1.5,
          stroke: animated ? '#ef4444' : (style.stroke || '#1a1a1a'),
          transition: 'all 0.5s ease'
        }}
      />
      
      {/* Active data flow animation */}
      <circle r={animated ? 2 : 1.5} fill={animated ? '#ef4444' : '#ffffff22'}>
        <animateMotion
          dur={animated ? "1.5s" : "4s"}
          repeatCount="indefinite"
          path={edgePath}
        />
      </circle>
      
      {/* Glow effect for attack path */}
      {animated && (
        <circle r="3" fill="#ef4444">
          <animateMotion
            dur="1.5s"
            repeatCount="indefinite"
            path={edgePath}
          />
          <animate
            attributeName="opacity"
            values="1;0.5;1"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
      )}
    </>
  );
};

export default NetworkEdge;
