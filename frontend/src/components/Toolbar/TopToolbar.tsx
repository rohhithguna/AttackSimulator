'use client';

import React from 'react';
import { useNodeStateStore } from '../../modules/nodeState';

const TopToolbar: React.FC = () => {
  const {
    viewMode,
    setWorkspaceView,
    setReportView,
  } = useNodeStateStore();

  return (
    <div className="flex w-full items-center justify-between h-full relative">
      {/* Left: Title */}
      <div className="flex items-center gap-2 w-1/3">
        <span className="text-[13px] font-semibold text-[#111]">
          {viewMode === 'workspace' ? 'Workspace' : 'Report'}
        </span>
        <span className="text-[11px] text-[#9CA3AF]">·</span>
        <span className="text-[11px] text-[#6B7280]">
          {viewMode === 'workspace' ? 'Network Simulation' : 'Attack Simulation Analysis'}
        </span>
      </div>

      {/* Center: View Toggle Pill */}
      <div className="absolute left-1/2 -translate-x-1/2 flex justify-center">
        <div className="flex items-center p-0.5 border border-[#E5E5E5] rounded-lg bg-[#F9FAFB] shadow-sm">
          <button
            onClick={setWorkspaceView}
            className={`px-4 py-1 rounded-md text-[13px] font-medium transition-all ${viewMode === 'workspace'
              ? 'bg-black text-white shadow'
              : 'text-[#6B7280] hover:text-[#111] hover:bg-[#F3F4F6]'
              }`}
          >
            Workspace
          </button>
          <button
            onClick={setReportView}
            className={`px-4 py-1 rounded-md text-[13px] font-medium transition-all ${viewMode === 'report'
              ? 'bg-black text-white shadow'
              : 'text-[#6B7280] hover:text-[#111] hover:bg-[#F3F4F6]'
              }`}
          >
            Report
          </button>
        </div>
      </div>

      {/* Right side: empty */}
      <div className="flex items-center justify-end w-1/3" />
    </div>
  );
};

export default TopToolbar;
