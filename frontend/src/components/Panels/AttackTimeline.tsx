'use client';

import React, { useRef, useEffect } from 'react';
import { useNodeStateStore } from '../../modules/nodeState';
import { Play } from 'lucide-react';

/* Risk estimation from step type */
const getStepRisk = (type: string, index: number, total: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' => {
  if (index === total - 1) return 'CRITICAL';
  if (type === 'Privilege Escalation') return 'HIGH';
  if (type === 'Lateral Movement') return index >= total / 2 ? 'HIGH' : 'MEDIUM';
  if (type === 'Initial Access') return 'MEDIUM';
  return 'MEDIUM';
};

const riskColor: Record<string, string> = {
  CRITICAL: '#DC2626',
  HIGH: '#EA580C',
  MEDIUM: '#F59E0B',
  LOW: '#9CA3AF',
};

const riskBg: Record<string, string> = {
  CRITICAL: 'rgba(220,38,38,0.08)',
  HIGH: 'rgba(234,88,12,0.06)',
  MEDIUM: 'rgba(245,158,11,0.06)',
  LOW: 'rgba(156,163,175,0.06)',
};

const AttackTimeline: React.FC = () => {
  const { timeline, isSimulating, attackPlaybackStep } = useNodeStateStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Auto-scroll to keep active step centered
  useEffect(() => {
    if (attackPlaybackStep >= 0 && scrollRef.current && stepRefs.current[attackPlaybackStep]) {
      const container = scrollRef.current;
      const stepEl = stepRefs.current[attackPlaybackStep];
      if (stepEl) {
        const containerRect = container.getBoundingClientRect();
        const scrollTop = stepEl.offsetTop - container.offsetTop - (containerRect.height / 2) + (stepEl.offsetHeight / 2);
        container.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
      }
    }
  }, [attackPlaybackStep]);

  if (timeline.length === 0 && !isSimulating) return null;

  const isCompleted = (index: number) => attackPlaybackStep >= 0 && index < attackPlaybackStep;
  const isCurrent = (index: number) => attackPlaybackStep >= 0 && index === attackPlaybackStep;
  const isFuture = (index: number) => attackPlaybackStep >= 0 && index > attackPlaybackStep;
  const noPlayback = attackPlaybackStep < 0;

  return (
    <div className="w-full h-full flex flex-col">
      {timeline.length === 0 && isSimulating ? (
        <div className="flex flex-col items-center justify-center w-full py-16 text-[#9CA3AF] space-y-3">
          <div className="w-8 h-8 border-2 border-[#E5E5E5] border-t-[#111] rounded-full animate-spin" />
          <p className="text-[13px] text-[#9CA3AF] font-medium">Analyzing attack vectors...</p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto pr-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {/* Hide scrollbar with CSS */}
          <style>{`
            .timeline-scroll::-webkit-scrollbar { display: none; }
          `}</style>

          <div className="relative py-4 pl-8">
            {/* Vertical connector line */}
            <div
              className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-[#E5E5E5]"
            />

            {/* Filled progress line */}
            {attackPlaybackStep >= 0 && (
              <div
                className="absolute left-[19px] top-4 w-[2px] bg-[#DC2626] transition-all duration-500 ease-out"
                style={{
                  height: stepRefs.current[attackPlaybackStep]
                    ? `${(stepRefs.current[attackPlaybackStep]?.offsetTop || 0) + 20}px`
                    : '0px',
                }}
              />
            )}

            {timeline.map((step, index) => {
              const risk = getStepRisk(step.type, index, timeline.length);
              const completed = isCompleted(index);
              const current = isCurrent(index);
              const future = isFuture(index);

              return (
                <div
                  key={step.id}
                  ref={(el) => { stepRefs.current[index] = el; }}
                  className={`relative mb-2 transition-all duration-300 ${future ? 'opacity-40' : ''}`}
                >
                  {/* Step indicator dot */}
                  <div className="absolute -left-8 top-4 flex items-center justify-center z-10">
                    {current ? (
                      /* Current step: glowing pointer */
                      <div className="relative">
                        <div
                          className="w-[18px] h-[18px] rounded-full bg-[#DC2626] flex items-center justify-center shadow-lg"
                          style={{
                            boxShadow: '0 0 12px rgba(220,38,38,0.5), 0 0 24px rgba(220,38,38,0.2)',
                            animation: 'tlPulse 1.5s ease-in-out infinite',
                          }}
                        >
                          <Play size={8} className="text-white fill-white ml-[1px]" />
                        </div>
                        {/* Glow ring */}
                        <div
                          className="absolute -inset-1 rounded-full border-2 border-[#DC2626]/30"
                          style={{ animation: 'tlRingPulse 1.5s ease-in-out infinite' }}
                        />
                      </div>
                    ) : completed || noPlayback ? (
                      /* Completed step: filled red dot */
                      <div className={`w-[10px] h-[10px] rounded-full transition-colors duration-300 ${completed ? 'bg-[#DC2626]' : 'bg-[#111]'
                        }`} />
                    ) : (
                      /* Future step: grey hollow dot */
                      <div className="w-[10px] h-[10px] rounded-full border-2 border-[#D1D5DB] bg-white" />
                    )}
                  </div>

                  {/* Step content card */}
                  <div
                    className={`ml-4 rounded-xl px-5 py-3.5 transition-all duration-300 border ${current
                        ? 'border-[#DC2626]/30 shadow-sm'
                        : completed
                          ? 'border-transparent'
                          : noPlayback
                            ? 'border-transparent'
                            : 'border-transparent'
                      }`}
                    style={{
                      background: current
                        ? 'rgba(220,38,38,0.04)'
                        : 'transparent',
                    }}
                  >
                    {/* Step number */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${current ? 'text-[#DC2626]' : completed ? 'text-[#111]' : noPlayback ? 'text-[#6B7280]' : 'text-[#D1D5DB]'
                        }`}>
                        Step {index + 1}
                      </span>

                      {/* Risk Badge */}
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded-full"
                        style={{
                          color: riskColor[risk],
                          background: riskBg[risk],
                          border: `1px solid ${riskColor[risk]}20`,
                        }}
                      >
                        {risk}
                      </span>
                    </div>

                    {/* Node name */}
                    <div className={`text-[15px] font-bold font-mono mb-1 ${current ? 'text-[#DC2626]' : completed ? 'text-[#111]' : noPlayback ? 'text-[#111]' : 'text-[#9CA3AF]'
                      }`}>
                      {step.nodeLabel}
                    </div>

                    {/* Action + Time row */}
                    <div className="flex items-center gap-4 text-[11px]">
                      <div className="flex items-center gap-1">
                        <span className="text-[#9CA3AF]">Action:</span>
                        <span className={`font-medium ${current ? 'text-[#DC2626]' : 'text-[#6B7280]'}`}>
                          {step.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[#9CA3AF]">Time:</span>
                        <span className={`font-mono font-medium ${current ? 'text-[#DC2626]' : 'text-[#6B7280]'}`}>
                          {step.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <style>{`
            @keyframes tlPulse {
              0%, 100% { box-shadow: 0 0 8px rgba(220,38,38,0.4), 0 0 16px rgba(220,38,38,0.15); }
              50% { box-shadow: 0 0 16px rgba(220,38,38,0.6), 0 0 32px rgba(220,38,38,0.25); }
            }
            @keyframes tlRingPulse {
              0%, 100% { opacity: 0.5; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.3); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default AttackTimeline;
