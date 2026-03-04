'use client';

import React from 'react';
import PremiumLayout from '@/layout/PremiumLayout';
import { motion } from 'framer-motion';
import { FileText, Download, Share2, Filter, Search, Clock, ShieldCheck } from 'lucide-react';

const ReportsPage: React.FC = () => {
  return (
    <PremiumLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-12">
        <header className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold tracking-tighter text-white uppercase italic">Security_Reports</h1>
              <p className="text-neutral-500 text-sm font-mono uppercase tracking-[0.2em]">Automated Analysis & Strategic Documentation</p>
            </div>
            <button className="px-6 py-2.5 bg-white text-black text-[11px] font-bold uppercase tracking-widest rounded shadow-xl hover:shadow-white/20 transition-all flex items-center gap-2">
              <Plus size={14} /> Generate_New_Report
            </button>
          </div>

          <div className="flex items-center gap-4 bg-neutral-900/50 p-2 rounded-xl border border-neutral-800">
            <div className="flex-1 flex items-center px-4 gap-3 border-r border-neutral-800">
              <Search size={16} className="text-neutral-500" />
              <input 
                type="text" 
                placeholder="Search reports by ID, type, or asset..." 
                className="bg-transparent border-none focus:outline-none w-full text-xs text-white placeholder:text-neutral-700 font-mono py-2"
              />
            </div>
            <div className="flex items-center gap-2 px-4 border-r border-neutral-800">
              <Filter size={16} className="text-neutral-500" />
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Type: All</span>
            </div>
            <div className="flex items-center gap-2 px-4">
              <Clock size={16} className="text-neutral-500" />
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Range: Last 30 Days</span>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4">
          <ReportListItem id="REP-2026-004-X1" title="Penetration Test: Internal Subnet A" date="2026.03.04" type="Internal Audit" risk="High" status="Signed" />
          <ReportListItem id="REP-2026-003-V2" title="Compliance Validation: SOC2 Type II" date="2026.02.18" type="Compliance" risk="Low" status="Archived" />
          <ReportListItem id="REP-2026-002-Z9" title="Asset Inventory & Risk Exposure" date="2026.02.12" type="Inventory" risk="Medium" status="In Progress" />
          <ReportListItem id="REP-2026-001-B1" title="External Edge Security Assessment" date="2026.01.24" type="External Edge" risk="High" status="Resolved" />
        </section>
      </div>
    </PremiumLayout>
  );
};

const ReportListItem = ({ id, title, date, type, risk, status }: any) => (
  <div className="flex items-center justify-between p-6 bg-black border border-neutral-900 rounded-2xl hover:border-neutral-700 transition-all group hover:bg-neutral-950/50">
    <div className="flex items-center gap-6">
      <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 rounded flex items-center justify-center shrink-0 group-hover:bg-white group-hover:border-white transition-colors duration-300">
        <FileText size={20} className="text-neutral-500 group-hover:text-black transition-colors" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-neutral-600 tracking-tighter">{id}</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-500 font-mono tracking-tighter uppercase">{type}</span>
        </div>
        <span className="text-sm font-bold text-white tracking-tight">{title}</span>
        <span className="text-[10px] text-neutral-700 font-mono uppercase mt-1">Generated: {date} · Status: {status}</span>
      </div>
    </div>
    <div className="flex items-center gap-8">
      <div className="flex flex-col items-end gap-1 px-8 border-r border-neutral-900">
        <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest">Risk Level</span>
        <span className={`text-[11px] font-bold uppercase ${risk === 'High' ? 'text-red-500' : risk === 'Medium' ? 'text-amber-500' : 'text-green-500'}`}>{risk}</span>
      </div>
      <div className="flex items-center gap-3">
        <button className="p-2.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-white transition-colors">
          <Download size={16} />
        </button>
        <button className="p-2.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-white transition-colors">
          <Share2 size={16} />
        </button>
      </div>
    </div>
  </div>
);

const Plus = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

export default ReportsPage;
