'use client';

import React, { ReactNode } from 'react';
import LeftNav from '@/components/Navigation/LeftNav';
import WorkspaceTabs from '@/components/Navigation/WorkspaceTabs';
import CommandPalette from '@/components/Navigation/CommandPalette';
import { motion, AnimatePresence } from 'framer-motion';

interface PremiumLayoutProps {
  children: ReactNode;
}

const PremiumLayout: React.FC<PremiumLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen w-full bg-black text-white font-sans overflow-hidden antialiased">
      {/* Command Palette is global */}
      <CommandPalette />

      {/* Persistent Left Navigation */}
      <LeftNav />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Workspace Management (Tabs) */}
        <WorkspaceTabs />

        {/* Content Container */}
        <main className="flex-1 relative overflow-hidden bg-neutral-950">
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Global Keyboard Shortcut Hints (Optional Overlay) */}
        <div className="fixed bottom-4 right-6 pointer-events-none opacity-20 transition-opacity hover:opacity-100 flex items-center gap-6 text-[10px] text-white font-mono uppercase tracking-widest z-[100]">
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800">
            <kbd className="px-1 py-0.5 rounded bg-neutral-800 border border-neutral-700 min-w-[20px] text-center">⌘</kbd> + K · SEARCH
          </span>
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800">
            <kbd className="px-1 py-0.5 rounded bg-neutral-800 border border-neutral-700 min-w-[20px] text-center">SPACE</kbd> · SELECT
          </span>
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800">
            <kbd className="px-1 py-0.5 rounded bg-neutral-800 border border-neutral-700 min-w-[20px] text-center">TAB</kbd> · FOCUS
          </span>
        </div>
      </div>
    </div>
  );
};

export default PremiumLayout;
