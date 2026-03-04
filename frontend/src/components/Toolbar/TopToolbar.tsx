'use client';

import React from 'react';
import { Play, RotateCcw, Share2, Download, Search, ChevronRight, LayoutGrid, Trash2, Loader2 } from 'lucide-react';
import { useNodeStateStore } from '../../modules/nodeState';

const TopToolbar: React.FC = () => {
  const { 
    runSimulation, 
    resetSimulation, 
    generateExample, 
    resetCanvas, 
    isSimulating 
  } = useNodeStateStore();

  return (
    <div className="flex w-full items-center justify-between">
      {/* Left: Breadcrumbs & Project Name */}
      <div className="flex items-center gap-4 text-xs font-mono tracking-tight overflow-hidden">
        <span className="text-gray-500 hover:text-white transition-colors cursor-pointer uppercase">Projects</span>
        <ChevronRight size={12} className="text-gray-700" />
        <span className="text-white font-semibold uppercase truncate">Network_Sim_Alpha_01</span>
      </div>

      {/* Center: Controls */}
      <div className="flex items-center gap-1 bg-[#0a0a0a] p-1 rounded-md border border-gray-800">
        <button 
          onClick={runSimulation}
          disabled={isSimulating}
          className={`h-8 px-4 flex items-center justify-center text-xs font-medium rounded transition-all uppercase tracking-wider ${
            isSimulating 
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
              : 'bg-white text-black hover:bg-gray-200'
          }`}
        >
          {isSimulating ? (
            <Loader2 size={14} className="mr-2 animate-spin" />
          ) : (
            <Play size={14} className="mr-2 fill-current" />
          )}
          Run Simulation
        </button>
        <button 
          onClick={resetSimulation}
          title="Reset Simulation"
          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white transition-colors rounded hover:bg-white/5"
        >
          <RotateCcw size={14} />
        </button>
        <div className="w-[1px] h-4 bg-gray-800 mx-1" />
        <button 
          onClick={generateExample}
          title="Generate Example Infrastructure"
          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white transition-colors rounded hover:bg-white/5"
        >
          <LayoutGrid size={14} />
        </button>
        <button 
          onClick={resetCanvas}
          title="Clear Canvas"
          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors rounded hover:bg-red-500/5"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-[#0a0a0a] border border-gray-800 rounded px-2 h-8 mr-2 group focus-within:border-white transition-all">
          <Search size={14} className="text-gray-600 group-focus-within:text-white transition-colors" />
          <input 
            type="text" 
            placeholder="Search nodes..." 
            className="bg-transparent border-none outline-none text-xs text-gray-400 pl-2 w-32 focus:w-48 transition-all"
          />
        </div>
        <button className="h-8 w-8 flex items-center justify-center text-gray-500 hover:text-white border border-transparent hover:border-gray-800 rounded transition-all">
          <Share2 size={16} />
        </button>
        <button className="h-8 w-8 flex items-center justify-center text-gray-500 hover:text-white border border-transparent hover:border-gray-800 rounded transition-all">
          <Download size={16} />
        </button>
      </div>
    </div>
  );
};

export default TopToolbar;
