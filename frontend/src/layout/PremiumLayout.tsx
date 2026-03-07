'use client';

import React, { ReactNode } from 'react';
import LeftNav from '@/components/Navigation/LeftNav';
import { useNodeStateStore } from '@/modules/nodeState';

interface PremiumLayoutProps {
  children: ReactNode;
}

const PremiumLayout: React.FC<PremiumLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen w-full bg-white text-[#111] font-sans overflow-hidden">
      {/* Left Navigation / Node Library */}
      <LeftNav />

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden bg-white min-w-0">
        {children}
      </main>
    </div>
  );
};

export default PremiumLayout;
