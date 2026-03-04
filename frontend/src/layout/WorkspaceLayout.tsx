import React from 'react';
import { motion } from 'framer-motion';

interface WorkspaceLayoutProps {
  sidebar: React.ReactNode;
  toolbar: React.ReactNode;
  children: React.ReactNode;
}

const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({ sidebar, toolbar, children }) => {
  return (
    <div className="flex h-screen w-full bg-black text-gray-200 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-16 border-r border-gray-800 flex flex-col items-center py-6 bg-black z-20">
        {sidebar}
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Toolbar */}
        <header className="h-14 border-b border-gray-800 flex items-center px-6 bg-black z-10">
          {toolbar}
        </header>

        {/* Content Area */}
        <main className="flex-1 relative overflow-hidden bg-[#0a0a0a]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default WorkspaceLayout;
