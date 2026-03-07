'use client';

import React, { memo } from 'react';
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
  data,
}: EdgeProps) => {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12,
  });

  const isPlaybackActive = (data as any)?.playbackActive === true;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: isPlaybackActive ? 3 : animated ? 2 : 1.5,
          stroke: isPlaybackActive ? '#DC2626' : animated ? '#DC2626' : (style.stroke || '#D1D5DB'),
          strokeDasharray: isPlaybackActive ? '6 4' : undefined,
          filter: isPlaybackActive ? 'drop-shadow(0 0 6px rgba(220,38,38,0.5))' : undefined,
        }}
      />

      {/* Flowing dash animation overlay for playback edges */}
      {isPlaybackActive && (
        <path
          d={edgePath}
          fill="none"
          stroke="#DC2626"
          strokeWidth={3}
          strokeDasharray="6 4"
          opacity={0.9}
          className="playback-edge-flow"
        />
      )}

      {/* Subtle flow animation dot */}
      <circle r={isPlaybackActive ? 3.5 : animated ? 2.5 : 1.5} fill={isPlaybackActive ? '#DC2626' : animated ? '#DC2626' : '#D1D5DB'}>
        <animateMotion
          dur={isPlaybackActive ? '0.8s' : animated ? '1.5s' : '5s'}
          repeatCount="indefinite"
          path={edgePath}
        />
      </circle>

      {/* Extra glow dot for playback edges */}
      {isPlaybackActive && (
        <circle r={6} fill="#DC2626" opacity={0.2}>
          <animateMotion
            dur="0.8s"
            repeatCount="indefinite"
            path={edgePath}
          />
        </circle>
      )}
    </>
  );
};

export default memo(NetworkEdge);
