'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNodeStateStore } from '../../modules/nodeState';
import { 
  Zap, 
  ArrowRight, 
  ShieldAlert, 
  Lock, 
  ChevronRight,
  Target
} from 'lucide-react';

const AttackTimeline: React.FC = () => {
  const { timeline, isSimulating } = useNodeStateStore();

  if (timeline.length === 0 && !isSimulating) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Initial Access': return <Zap size={14} />;
      case 'Lateral Movement': return <ArrowRight size={14} />;
      case 'Privilege Escalation': return <ShieldAlert size={14} />;
      case 'Target Compromise': return <Target size={14} />;
      default: return <ChevronRight size={14} />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="absolute bottom-32 left-8 z-40 w-80"
      >
        <div className="bg-[#0a0a0a]/90 backdrop-blur-xl border border-gray-800 rounded-lg overflow-hidden flex flex-col shadow-2xl">
          <div className="px-4 py-3 border-b border-gray-800 bg-white/5 flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-widest text-gray-400 font-mono font-bold">Attack Timeline</h3>
            {isSimulating && (
              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </div>
          
          <div className="p-4 max-h-[400px] overflow-y-auto space-y-6 scrollbar-hide">
            {timeline.length === 0 && isSimulating ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-600 space-y-2">
                <div className="w-8 h-8 border-2 border-gray-800 border-t-white rounded-full animate-spin" />
                <p className="text-[10px] uppercase font-mono tracking-wider">Intercepting Traffic...</p>
              </div>
            ) : (
              timeline.map((step, index) => (
                <motion.div 
                  key={step.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative pl-6 border-l border-gray-800 pb-2 last:pb-0"
                >
                  {/* Dot */}
                  <div className={`absolute -left-1.5 top-0 w-3 h-3 rounded-full border-2 border-[#0a0a0a] ${
                    step.type === 'Target Compromise' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-white'
                  }`} />
                  
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white bg-white/10 p-1 rounded">
                      {getTypeIcon(step.type)}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-mono">{step.timestamp}</span>
                  </div>
                  
                  <h4 className="text-xs font-bold text-white mb-1 uppercase tracking-tight">{step.type}</h4>
                  <p className="text-[10px] text-gray-500 font-mono mb-1">{step.nodeLabel}</p>
                  <p className="text-[11px] text-gray-400 leading-relaxed border-l border-white/10 pl-2 ml-1">
                    {step.details}
                  </p>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AttackTimeline;
