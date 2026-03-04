'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  ChevronLeft, 
  ChevronRight, 
  LayoutGrid, 
  Shield, 
  FileText, 
  Settings, 
  Activity, 
  Database, 
  Terminal, 
  HelpCircle,
  BarChart3,
  Layers,
  Zap,
  Cpu
} from 'lucide-react';
import { useWorkspaceStore } from '@/modules/workspaceState';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutGrid, label: 'Dashboard', path: '/dashboard' },
  { id: 'simulator', icon: Shield, label: 'Simulator', path: '/simulator' },
  { id: 'reports', icon: FileText, label: 'Reports', path: '/reports' },
];

const SECONDARY_NAV = [
  { id: 'assets', icon: Database, label: 'Asset Inventory', path: '#' },
  { id: 'vulnerabilities', icon: Activity, label: 'Vulnerabilities', path: '#' },
  { id: 'infrastructure', icon: Cpu, label: 'Compute Infrastructure', path: '#' },
  { id: 'logs', icon: Terminal, label: 'Operational Logs', path: '#' },
];

const LeftNav: React.FC = () => {
  const { isSidebarCollapsed, toggleSidebar } = useWorkspaceStore();
  const pathname = usePathname();

  return (
    <motion.aside
      animate={{ width: isSidebarCollapsed ? 72 : 280 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="h-full bg-black border-r border-neutral-900 flex flex-col relative z-50 shrink-0"
    >
      <div className="p-6 flex items-center justify-between mb-8">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 bg-white rounded flex items-center justify-center shrink-0">
            <span className="text-black font-bold text-lg leading-none italic">A</span>
          </div>
          {!isSidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col"
            >
              <span className="text-white font-bold text-sm tracking-tight leading-none">ATTACK OPS</span>
              <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest mt-1">SIMULATOR V1</span>
            </motion.div>
          )}
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-8">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.id} item={item} collapsed={isSidebarCollapsed} active={pathname === item.path} />
          ))}
        </div>

        <div className="space-y-1">
          {!isSidebarCollapsed && (
            <div className="px-4 py-2 text-[10px] text-neutral-600 font-bold uppercase tracking-widest">
              Analysis
            </div>
          )}
          {SECONDARY_NAV.map((item) => (
            <NavItem key={item.id} item={item} collapsed={isSidebarCollapsed} active={pathname === item.path} />
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-neutral-900 space-y-1">
        <NavItem 
          item={{ id: 'help', icon: HelpCircle, label: 'Documentation', path: '#' }} 
          collapsed={isSidebarCollapsed} 
          active={false}
        />
        <NavItem 
          item={{ id: 'settings', icon: Settings, label: 'Settings', path: '#' }} 
          collapsed={isSidebarCollapsed} 
          active={false}
        />
      </div>

      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 w-6 h-6 bg-neutral-900 border border-neutral-800 rounded-full flex items-center justify-center text-neutral-500 hover:text-white transition-colors"
      >
        {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </motion.aside>
  );
};

const NavItem = ({ item, collapsed, active }: { item: any, collapsed: boolean, active: boolean }) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link href={item.path}>
            <button
              className={`w-full flex items-center px-4 py-2.5 rounded-lg group transition-all duration-200 ${
                active ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-neutral-500 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <item.icon 
                size={18} 
                strokeWidth={1.5} 
                className={`shrink-0 ${active ? 'text-black' : 'text-neutral-500 group-hover:text-white'}`}
              />
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="ml-3 text-xs font-medium truncate"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          </Link>
        </TooltipTrigger>
        {collapsed && (
          <TooltipContent side="right" className="bg-white text-black border-none text-[11px] font-bold px-3 py-1.5 ml-2 uppercase tracking-tight">
            {item.label}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

export default LeftNav;
