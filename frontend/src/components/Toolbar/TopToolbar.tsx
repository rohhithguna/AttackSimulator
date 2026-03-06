'use client';

import React from 'react';
import { Play, RotateCcw, Search, Download, LayoutGrid, Trash2, Loader2, GitBranch } from 'lucide-react';
import { useNodeStateStore } from '../../modules/nodeState';

const TopToolbar: React.FC = () => {
  const {
    runSimulation,
    resetSimulation,
    generateExample,
    resetCanvas,
    autoArrange,
    isSimulating
  } = useNodeStateStore();

  return (
    <div className="flex w-full items-center justify-between">
      {/* Left: Title */}
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-semibold text-[#111]">Workspace</span>
        <span className="text-[11px] text-[#9CA3AF]">·</span>
        <span className="text-[11px] text-[#6B7280]">Network Simulation</span>
      </div>

      {/* Center: Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={runSimulation}
          disabled={isSimulating}
          className={`h-8 px-4 flex items-center gap-2 text-[12px] font-medium rounded-md transition-colors ${isSimulating
            ? 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed'
            : 'bg-[#111] text-white hover:bg-[#333]'
            }`}
        >
          {isSimulating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Play size={14} className="fill-current" />
          )}
          Run Simulation
        </button>

        <button
          onClick={resetSimulation}
          title="Reset Simulation"
          className="w-8 h-8 flex items-center justify-center text-[#6B7280] hover:text-[#111] hover:bg-[#F3F4F6] rounded-md transition-colors"
        >
          <RotateCcw size={15} />
        </button>

        <div className="w-px h-5 bg-[#E5E5E5] mx-1" />

        <button
          onClick={generateExample}
          title="Generate Example"
          className="w-8 h-8 flex items-center justify-center text-[#6B7280] hover:text-[#111] hover:bg-[#F3F4F6] rounded-md transition-colors"
        >
          <LayoutGrid size={15} />
        </button>

        <button
          onClick={autoArrange}
          title="Auto Arrange"
          className="w-8 h-8 flex items-center justify-center text-[#6B7280] hover:text-[#111] hover:bg-[#F3F4F6] rounded-md transition-colors"
        >
          <GitBranch size={15} />
        </button>

        <button
          onClick={resetCanvas}
          title="Clear Canvas"
          className="w-8 h-8 flex items-center justify-center text-[#6B7280] hover:text-[#DC2626] hover:bg-red-50 rounded-md transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Right: Search & Export */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-white border border-[#E5E5E5] rounded-md px-2.5 h-8 focus-within:border-[#111] transition-colors">
          <Search size={14} className="text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search nodes..."
            className="bg-transparent border-none outline-none text-[12px] text-[#111] placeholder-[#9CA3AF] pl-2 w-28 focus:w-40 transition-all"
          />
        </div>
        <button
          title="Export"
          className="w-8 h-8 flex items-center justify-center text-[#6B7280] hover:text-[#111] hover:bg-[#F3F4F6] border border-[#E5E5E5] rounded-md transition-colors"
        >
          <Download size={15} />
        </button>
      </div>
    </div>
  );
};

export default TopToolbar;
