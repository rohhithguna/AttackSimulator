'use client';

import React from 'react';
import PremiumLayout from '@/layout/PremiumLayout';
import SimulationWorkspace from '@/components/Canvas/SimulationWorkspace';
import NodeConfigPanel from '@/components/Panels/NodeConfigPanel';
import { motion } from 'framer-motion';
import { useNodeStore } from '@/modules/nodeState';
import SimulationResultPanel from '@/components/Panels/SimulationResultPanel';
import { Terminal, Shield, AlertTriangle, Cpu, Globe } from 'lucide-react';

const SimulatorPage: React.FC = () => {
  const { selectedNodeId, nodes } = useNodeStore();
  
  return (
    <PremiumLayout>
      <div className="flex h-full w-full overflow-hidden relative">
        
        {/* Main Simulation Canvas */}
        <div className="flex-1 h-full relative border-r border-neutral-900 overflow-hidden">
          <SimulationWorkspace />
          
          {/* Subtle Overlay Effect */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[radial-gradient(circle_at_center,_#ffffff_1px,_transparent_1px)] bg-[length:32px_32px] z-10" />

          {/* Simulation Results Panel */}
          <SimulationResultPanel />
        </div>

        {/* Dynamic Right Sidebar: Inspector or Global Metrics */}
        <aside className="w-[340px] h-full bg-black flex flex-col z-30 relative shrink-0 shadow-[-12px_0_32px_rgba(0,0,0,0.8)]">
          <div className="h-12 border-b border-neutral-900 px-6 flex items-center justify-between bg-neutral-950/50">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Live Intelligence</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-neutral-600">STABLE_v1.0.4</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8 bg-gradient-to-b from-black to-neutral-950">
            
            {/* Global Infrastructure Health */}
            <section>
              <h4 className="text-[10px] text-neutral-500 uppercase mb-4 tracking-widest font-bold flex items-center gap-2">
                <Cpu size={12} strokeWidth={1.5} />
                Infrastructure_Health
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Nodes" value={nodes.length.toString()} trend="baseline" />
                <MetricCard label="Exposed" value={nodes.filter(n => n.data.isPublic).length.toString()} trend="critical" />
              </div>
            </section>

            {/* Active Threats / Alerts */}
            <section>
              <h4 className="text-[10px] text-neutral-500 uppercase mb-4 tracking-widest font-bold flex items-center gap-2">
                <AlertTriangle size={12} strokeWidth={1.5} />
                Active_Threat_Log
              </h4>
              <div className="space-y-2">
                <LogItem time="14:22:01" msg="DNS_RECON_DETECTION" level="info" />
                <LogItem time="14:18:45" msg="PORT_SCAN_X_34" level="warn" />
                <LogItem time="14:05:12" msg="BRUTE_FORCE_SSH" level="error" />
              </div>
            </section>

            {/* System Intelligence Block */}
            <div className="mt-auto pt-8 border-t border-neutral-900">
              <div className="p-4 bg-neutral-900/30 border border-neutral-800 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Global Risk Index</span>
                  <span className="text-xl font-mono text-white tracking-tighter">74.2</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '74.2%' }}
                    className="h-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.5)]"
                  />
                </div>
                <p className="text-[9px] text-neutral-600 leading-relaxed italic">
                  Critical exposure detected on subnet 10.0.4.x. Immediate remediation required for target AppServer_01.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Node Configuration Panel (Floating Layer) */}
        <NodeConfigPanel />
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #222;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #333;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </PremiumLayout>
  );
};

const MetricCard = ({ label, value, trend }: { label: string, value: string, trend: 'baseline' | 'critical' }) => (
  <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-xl flex flex-col gap-1 hover:border-neutral-800 transition-colors group">
    <span className="text-[10px] text-neutral-600 uppercase font-bold tracking-tighter group-hover:text-neutral-400 transition-colors">{label}</span>
    <div className="flex items-center justify-between">
      <span className="text-lg font-mono text-neutral-200">{value}</span>
      <div className={`w-1.5 h-1.5 rounded-full ${trend === 'critical' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-neutral-600'}`} />
    </div>
  </div>
);

const LogItem = ({ time, msg, level }: { time: string, msg: string, level: 'info' | 'warn' | 'error' }) => (
  <div className="flex items-center gap-3 py-2 border-b border-neutral-900/50 hover:bg-neutral-900/20 transition-colors px-1 rounded">
    <span className="text-[9px] font-mono text-neutral-600 shrink-0">{time}</span>
    <span className={`text-[10px] font-bold tracking-tight truncate flex-1 ${
      level === 'error' ? 'text-red-400' : level === 'warn' ? 'text-amber-400' : 'text-neutral-400'
    }`}>{msg}</span>
    <div className={`w-1 h-1 rounded-full ${
      level === 'error' ? 'bg-red-500' : level === 'warn' ? 'bg-amber-500' : 'bg-neutral-500'
    }`} />
  </div>
);

export default SimulatorPage;
