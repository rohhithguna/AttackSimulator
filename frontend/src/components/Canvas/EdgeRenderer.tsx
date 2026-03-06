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

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: animated ? 2 : 1.5,
          stroke: animated ? '#DC2626' : (style.stroke || '#D1D5DB'),
        }}
      />

      {/* Subtle flow animation dot */}
      <circle r={animated ? 2.5 : 1.5} fill={animated ? '#DC2626' : '#D1D5DB'}>
        <animateMotion
          dur={animated ? '1.5s' : '5s'}
          repeatCount="indefinite"
          path={edgePath}
        />
      </circle>
    </>
  );
};

export default memo(NetworkEdge);
