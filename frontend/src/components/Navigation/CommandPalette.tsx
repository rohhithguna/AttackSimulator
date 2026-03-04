'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Terminal, Plus, Save, Play, RefreshCw, X, Command } from 'lucide-react';
import { useWorkspaceStore } from '@/modules/workspaceState';

const COMMANDS = [
  { id: 'new_simulation', label: 'New Simulation', icon: Plus, shortcut: '⌘ N' },
  { id: 'run_simulation', label: 'Run Simulation', icon: Play, shortcut: '⌘ R' },
  { id: 'save_project', label: 'Save Project', icon: Save, shortcut: '⌘ S' },
  { id: 'reset_canvas', label: 'Reset Canvas', icon: RefreshCw, shortcut: '⌘ L' },
  { id: 'open_logs', label: 'Open Logs', icon: Terminal, shortcut: '⌘ T' },
];

const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const togglePalette = useCallback(() => setIsOpen((prev) => !prev), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        togglePalette();
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePalette]);

  const filteredCommands = COMMANDS.filter((cmd) =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-[600px] bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden z-[10000]"
          >
            <div className="flex items-center px-4 border-b border-neutral-800 h-14">
              <Search className="w-5 h-5 text-neutral-500 mr-3" />
              <input
                autoFocus
                type="text"
                placeholder="Search commands..."
                className="bg-transparent border-none focus:outline-none w-full text-neutral-200 text-lg placeholder:text-neutral-600"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="flex items-center px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-[10px] text-neutral-400 font-mono">
                ESC
              </div>
            </div>

            <div className="p-2 max-h-[400px] overflow-y-auto">
              {filteredCommands.length > 0 ? (
                filteredCommands.map((cmd, index) => (
                  <button
                    key={cmd.id}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors group ${
                      index === selectedIndex ? 'bg-white text-black' : 'text-neutral-400 hover:bg-neutral-800'
                    }`}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-center">
                      <cmd.icon className={`w-4 h-4 mr-3 ${index === selectedIndex ? 'text-black' : 'text-neutral-500'}`} />
                      <span className="text-sm font-medium">{cmd.label}</span>
                    </div>
                    <div className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      index === selectedIndex ? 'bg-neutral-200 border-neutral-300 text-black' : 'bg-neutral-800 border-neutral-700 text-neutral-500'
                    }`}>
                      {cmd.shortcut}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-neutral-500 text-sm">
                  No commands found
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-4 text-[10px] text-neutral-500 font-mono">
                <span className="flex items-center gap-1"><Command className="w-3 h-3" /> + K to search</span>
                <span className="flex items-center gap-1">↑↓ to navigate</span>
                <span className="flex items-center gap-1">ENTER to select</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
