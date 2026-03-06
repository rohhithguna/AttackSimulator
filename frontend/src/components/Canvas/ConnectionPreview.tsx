'use client';

import React, { memo } from 'react';
import { getSmoothStepPath, Position } from '@xyflow/react';
import type { ConnectionLineComponentProps } from '@xyflow/react';

const ConnectionPreview: React.FC<ConnectionLineComponentProps> = ({
    fromX,
    fromY,
    toX,
    toY,
    fromPosition,
    toPosition,
}) => {
    const [path] = getSmoothStepPath({
        sourceX: fromX,
        sourceY: fromY,
        sourcePosition: fromPosition,
        targetX: toX,
        targetY: toY,
        targetPosition: toPosition ?? Position.Top,
        borderRadius: 12,
    });

    return (
        <g>
            <path
                d={path}
                stroke="#9CA3AF"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                fill="none"
            />
            {/* Pulsing endpoint indicator at cursor */}
            <circle cx={toX} cy={toY} r={4} fill="#9CA3AF" opacity={0.4}>
                <animate
                    attributeName="r"
                    values="3;6;3"
                    dur="1.2s"
                    repeatCount="indefinite"
                />
                <animate
                    attributeName="opacity"
                    values="0.4;0.15;0.4"
                    dur="1.2s"
                    repeatCount="indefinite"
                />
            </circle>
            {/* Solid inner dot */}
            <circle cx={toX} cy={toY} r={2} fill="#9CA3AF" opacity={0.7} />
        </g>
    );
};

export default memo(ConnectionPreview);
