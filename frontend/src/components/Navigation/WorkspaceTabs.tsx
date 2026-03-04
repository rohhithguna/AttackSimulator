'use client';

import React from 'react';
import { motion, Reorder } from 'framer-motion';
import { X, Plus, Maximize2, Monitor } from 'lucide-react';
import { useWorkspaceStore } from '@/modules/workspaceState';

const WorkspaceTabs: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, removeTab, addTab } = useWorkspaceStore();

  const handleAddNewTab = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    addTab({ id: newId, title: `New Simulation ${tabs.length + 1}`, type: 'simulator' });
  };

  return (
    <div className="flex items-center px-4 h-12 border-b border-neutral-900 bg-black overflow-x-auto no-scrollbar gap-1 relative z-40">
      <div className="flex items-center gap-1 min-w-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 h-9 px-4 py-2 rounded-t-lg transition-all duration-200 group shrink-0 min-w-[140px] max-w-[200px] border-x border-t border-transparent ${
              tab.id === activeTabId 
                ? 'bg-neutral-900 border-neutral-800 text-white shadow-[0_-2px_8px_rgba(0,0,0,0.5)]' 
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${tab.id === activeTabId ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-neutral-700'}`} />
            <span className="text-[11px] font-bold uppercase tracking-tight truncate flex-1 text-left">
              {tab.title}
            </span>
            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeTab(tab.id);
                }}
                className={`p-0.5 rounded hover:bg-neutral-800 transition-colors opacity-0 group-hover:opacity-100 ${tab.id === activeTabId ? 'opacity-100' : ''}`}
              >
                <X size={12} strokeWidth={1.5} className="text-neutral-500 hover:text-white" />
              </button>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={handleAddNewTab}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-900 text-neutral-600 hover:text-white transition-all ml-1 shrink-0"
      >
        <Plus size={16} strokeWidth={1.5} />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-4 px-2">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-950 border border-neutral-900 text-[10px] text-neutral-500 font-mono tracking-tighter">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          SYSTEMS ACTIVE
        </div>
        <button className="text-neutral-600 hover:text-white transition-colors">
          <Maximize2 size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};

export default WorkspaceTabs;
