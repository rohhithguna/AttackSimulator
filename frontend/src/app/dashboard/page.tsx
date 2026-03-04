'use client';

import React from 'react';
import PremiumLayout from '@/layout/PremiumLayout';
import { motion } from 'framer-motion';
import { BarChart3, Shield, Activity, Lock, Users, AlertTriangle } from 'lucide-react';

const DashboardPage: React.FC = () => {
  return (
    <PremiumLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-12">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tighter text-white uppercase italic">Security_Ops_Center</h1>
          <p className="text-neutral-500 text-sm font-mono uppercase tracking-[0.2em]">Operational Oversight & Strategic Intelligence</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard icon={Shield} label="Total Assets" value="2,842" sub="Across 12 subnets" />
          <StatCard icon={Activity} label="Risk Profile" value="Elevated" sub="0.84 Criticality" color="text-amber-500" />
          <StatCard icon={Lock} label="Compliance" value="94%" sub="SOC2 / ISO 27001" />
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-neutral-900/30 border border-neutral-800 rounded-2xl p-6 h-[400px] flex flex-col gap-4">
            <h3 className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest flex items-center gap-2">
              <BarChart3 size={12} /> Threat_Vector_Frequency
            </h3>
            <div className="flex-1 flex items-end gap-3 px-4 pb-4">
              {[60, 45, 90, 30, 75, 55, 40].map((h, i) => (
                <div key={i} className="flex-1 bg-neutral-800 rounded-t-lg relative group transition-all duration-300 hover:bg-white overflow-hidden">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    className="absolute bottom-0 w-full bg-neutral-700 group-hover:bg-white"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-neutral-900/30 border border-neutral-800 rounded-2xl p-6 h-[400px] space-y-6">
            <h3 className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest flex items-center gap-2">
              <AlertTriangle size={12} /> Critical_Vulnerabilities
            </h3>
            <div className="space-y-4">
              <VulnerabilityItem id="CVE-2026-0042" title="Remote Code Execution" severity="Critical" score="9.8" />
              <VulnerabilityItem id="CVE-2025-9821" title="Privilege Escalation" severity="High" score="8.4" />
              <VulnerabilityItem id="CVE-2026-1102" title="Injection Bypass" severity="High" score="7.5" />
            </div>
          </div>
        </section>
      </div>
    </PremiumLayout>
  );
};

const StatCard = ({ icon: Icon, label, value, sub, color }: any) => (
  <div className="bg-black border border-neutral-900 p-8 rounded-2xl hover:border-neutral-700 transition-all group relative overflow-hidden">
    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
      <Icon size={64} />
    </div>
    <div className="flex flex-col gap-4 relative z-10">
      <div className="flex items-center gap-2 text-neutral-500">
        <Icon size={16} strokeWidth={1.5} />
        <span className="text-[10px] uppercase font-bold tracking-widest">{label}</span>
      </div>
      <div className="flex flex-col">
        <span className={`text-4xl font-mono tracking-tighter ${color || 'text-white'}`}>{value}</span>
        <span className="text-[10px] text-neutral-600 font-mono mt-1 uppercase">{sub}</span>
      </div>
    </div>
  </div>
);

const VulnerabilityItem = ({ id, title, severity, score }: any) => (
  <div className="flex items-center justify-between p-4 bg-black border border-neutral-900 rounded-xl hover:border-neutral-700 transition-colors">
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-mono text-neutral-500 tracking-tighter">{id}</span>
      <span className="text-sm font-medium text-white">{title}</span>
    </div>
    <div className="flex flex-col items-end gap-1">
      <span className={`text-[10px] font-bold uppercase ${severity === 'Critical' ? 'text-red-500' : 'text-amber-500'}`}>{severity}</span>
      <span className="text-xs font-mono text-neutral-500">{score}</span>
    </div>
  </div>
);

export default DashboardPage;
