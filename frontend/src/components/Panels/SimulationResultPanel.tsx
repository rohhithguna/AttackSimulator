
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Clock, ShieldCheck, Activity, Shield, ArrowRight, RotateCcw, ShieldAlert } from 'lucide-react';
import { useNodeStore } from '../../modules/nodeState';

const SimulationResultPanel: React.FC = () => {
  const { 
    simulationResults, 
    isSimulating, 
    recommendations, 
    applyMitigation, 
    isMitigationActive, 
    revertMitigation,
    originalRiskScore
  } = useNodeStore();
  const [activeTab, setActiveTab] = useState<'metrics' | 'paths' | 'defender'>('metrics');

  if (!simulationResults && !isSimulating) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4"
      >
        <div className="bg-[#0a0a0a]/90 backdrop-blur-xl border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
          {/* Mitigation Active Banner */}
          {isMitigationActive && (
            <div className="bg-white/5 border-b border-gray-800 px-6 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert size={14} className="text-white animate-pulse" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Mitigation Simulation Active</span>
              </div>
              <button 
                onClick={revertMitigation}
                className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-widest"
              >
                <RotateCcw size={12} />
                Revert Simulation
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-gray-800/50 bg-black/40">
            <TabButton 
              active={activeTab === 'metrics'} 
              onClick={() => setActiveTab('metrics')}
              label="Metrics"
            />
            <TabButton 
              active={activeTab === 'paths'} 
              onClick={() => setActiveTab('paths')}
              label="Attack Paths"
            />
            <TabButton 
              active={activeTab === 'defender'} 
              onClick={() => setActiveTab('defender')}
              label="Defender Mode"
              highlight={recommendations.length > 0}
            />
          </div>

          <div className="p-6">
            {activeTab === 'metrics' && (
              <div className="flex items-center justify-between gap-8">
                {/* Risk Score */}
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${isSimulating ? 'bg-gray-800 animate-pulse' : 'bg-white/10'}`}>
                    <AlertCircle size={20} className={isSimulating ? 'text-gray-500' : 'text-white'} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-mono mb-1">Risk Score</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-semibold text-white leading-none">
                        {isSimulating ? '--' : simulationResults?.riskScore}
                        <span className="text-xs text-gray-600 font-normal ml-1">/ 100</span>
                      </p>
                      {isMitigationActive && originalRiskScore && (
                        <p className="text-xs text-green-500 font-mono flex items-center gap-1">
                          <ArrowRight size={10} />
                          -{Math.round(((originalRiskScore - simulationResults!.riskScore) / originalRiskScore) * 100)}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="w-[1px] h-10 bg-gray-800" />

                {/* Attack Paths */}
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-full bg-gray-800">
                    <Activity size={20} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-mono mb-1">Attack Paths</p>
                    <p className="text-2xl font-semibold text-white leading-none">
                      {isSimulating ? '--' : simulationResults?.attackPaths}
                    </p>
                  </div>
                </div>

                <div className="w-[1px] h-10 bg-gray-800" />

                {/* Breach Time */}
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-full bg-gray-800">
                    <Clock size={20} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-mono mb-1">Breach Time</p>
                    <p className="text-2xl font-semibold text-white leading-none">
                      {isSimulating ? '--' : simulationResults?.estimatedBreachTime}
                    </p>
                  </div>
                </div>

                <div className="w-[1px] h-10 bg-gray-800" />

                {/* Confidence */}
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-full bg-gray-800">
                    <ShieldCheck size={20} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-mono mb-1">Confidence</p>
                    <p className="text-2xl font-semibold text-white leading-none">
                      {isSimulating ? '--' : `${simulationResults?.confidenceScore}%`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'paths' && (
              <div className="h-24 flex items-center justify-center border border-dashed border-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">
                  {isSimulating ? 'Analyzing Attack Vectors...' : 'Attack Path Visualization Layer Active'}
                </p>
              </div>
            )}

            {activeTab === 'defender' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Top Defensive Actions</h4>
                  <span className="text-[9px] font-mono text-gray-600">{recommendations.length} recommended mitigations</span>
                </div>
                
                {recommendations.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {recommendations.slice(0, 4).map((rec) => (
                      <RecommendationCard 
                        key={rec.id} 
                        rec={rec} 
                        onSimulate={() => applyMitigation(rec)} 
                        isActive={isMitigationActive}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="h-24 flex items-center justify-center border border-dashed border-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">
                      Run simulation to generate defensive intelligence
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

const TabButton = ({ active, onClick, label, highlight }: { active: boolean, onClick: () => void, label: string, highlight?: boolean }) => (
  <button
    onClick={onClick}
    className={`px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all relative ${
      active ? 'text-white' : 'text-gray-500 hover:text-gray-300'
    }`}
  >
    {label}
    {highlight && !active && (
      <span className="absolute top-3 right-4 w-1 h-1 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
    )}
    {active && (
      <motion.div 
        layoutId="activeTab" 
        className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" 
      />
    )}
  </button>
);

const RecommendationCard = ({ rec, onSimulate, isActive }: { rec: any, onSimulate: () => void, isActive: boolean }) => (
  <div className="bg-white/5 border border-gray-800/50 p-4 rounded-lg hover:border-white/20 transition-all group">
    <div className="flex items-start justify-between gap-4 mb-3">
      <div className="p-1.5 rounded bg-white/5 text-gray-400 group-hover:text-white transition-colors">
        <Shield size={14} />
      </div>
      <div className="text-right">
        <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Risk Reduction</p>
        <p className="text-lg font-mono text-green-500 font-bold leading-none">{rec.estimatedRiskReduction}%</p>
      </div>
    </div>
    <h5 className="text-[11px] font-bold text-gray-200 mb-4 line-clamp-1">{rec.description}</h5>
    <button 
      disabled={isActive}
      onClick={onSimulate}
      className={`w-full py-2 rounded text-[9px] font-bold uppercase tracking-widest border transition-all ${
        isActive 
          ? 'border-gray-800 text-gray-700 cursor-not-allowed' 
          : 'border-white/10 text-white hover:bg-white hover:text-black hover:border-white'
      }`}
    >
      Simulate Fix
    </button>
  </div>
);

export default SimulationResultPanel;
