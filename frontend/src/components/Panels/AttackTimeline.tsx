'use client';

import React from 'react';
import { useNodeStateStore } from '../../modules/nodeState';
import {
  Zap,
  ArrowRight,
  ShieldAlert,
  Target,
  ChevronRight,
} from 'lucide-react';

const AttackTimeline: React.FC = () => {
  const { timeline, isSimulating } = useNodeStateStore();

  if (timeline.length === 0 && !isSimulating) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Initial Access': return <Zap size={13} />;
      case 'Lateral Movement': return <ArrowRight size={13} />;
      case 'Privilege Escalation': return <ShieldAlert size={13} />;
      case 'Target Compromise': return <Target size={13} />;
      default: return <ChevronRight size={13} />;
    }
  };

  return (
    <div className="border-b border-[#E5E5E5]">
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#E5E5E5] bg-[#FAFAFA]">
        <h3 className="text-[13px] font-semibold text-[#111]">Attack Timeline</h3>
        {isSimulating && (
          <span className="flex h-2 w-2 rounded-full bg-[#DC2626] animate-pulse" />
        )}
      </div>

      <div className="p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
        {timeline.length === 0 && isSimulating ? (
          <div className="flex flex-col items-center justify-center py-6 text-[#9CA3AF] space-y-2">
            <div className="w-6 h-6 border-2 border-[#E5E5E5] border-t-[#111] rounded-full animate-spin" />
            <p className="text-[11px] text-[#9CA3AF]">Analyzing attack vectors...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {timeline.map((step, index) => (
              <div
                key={step.id}
                className="relative pl-5 border-l border-[#E5E5E5] pb-1 last:pb-0"
              >
                {/* Dot */}
                <div className={`absolute -left-[5px] top-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${step.type === 'Target Compromise' ? 'bg-[#DC2626]' : 'bg-[#111]'
                  }`} />

                <div className="flex items-center gap-2 mb-1">
                  <span className={`p-1 rounded ${step.type === 'Target Compromise' ? 'text-[#DC2626] bg-red-50' : 'text-[#111] bg-[#F3F4F6]'
                    }`}>
                    {getTypeIcon(step.type)}
                  </span>
                  <span className="text-[10px] text-[#9CA3AF] font-mono">{step.timestamp}</span>
                </div>

                <h4 className="text-[12px] font-semibold text-[#111] mb-0.5">{step.type}</h4>
                <p className="text-[11px] text-[#6B7280] font-mono mb-0.5">{step.nodeLabel}</p>
                <p className="text-[11px] text-[#9CA3AF] leading-relaxed">{step.details}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttackTimeline;
