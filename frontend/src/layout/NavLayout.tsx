import React from 'react';

interface NavLayoutProps {
  children: React.ReactNode;
}

const NavLayout: React.FC<NavLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-black text-gray-200">
      {/* Top Navbar */}
      <nav className="h-14 border-b border-gray-900 px-6 flex items-center justify-between bg-black sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="text-white font-bold tracking-tighter text-lg">REDTEAM_BOX</div>
          <div className="flex gap-4 text-xs font-mono uppercase text-gray-500">
            <span className="text-white cursor-pointer hover:text-white transition-colors">Simulator</span>
            <span className="hover:text-white cursor-pointer transition-colors">Analyzer</span>
            <span className="hover:text-white cursor-pointer transition-colors">Intel</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          <span className="text-[10px] font-mono text-gray-500">SYSTEM_ONLINE</span>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
};

export default NavLayout;
