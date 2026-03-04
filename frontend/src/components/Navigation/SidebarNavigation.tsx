'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, Shield, Database, Terminal, Settings, Activity } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { icon: LayoutGrid, label: 'Canvas', active: true },
  { icon: Shield, label: 'Attack Simulator', active: false },
  { icon: Database, label: 'Data Sources', active: false },
  { icon: Terminal, label: 'Logs', active: false },
  { icon: Activity, label: 'Performance', active: false },
  { icon: Settings, label: 'Settings', active: false },
];

const SidebarNavigation: React.FC = () => {
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 w-full items-center">
        {/* Logo or Brand Mark */}
        <div className="w-10 h-10 bg-white rounded flex items-center justify-center mb-6">
          <span className="text-black font-bold text-xl leading-none">O</span>
        </div>

        {navItems.map((item, index) => (
          <Tooltip key={index} delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                className={`w-10 h-10 flex items-center justify-center rounded transition-all duration-200 group ${
                  item.active ? 'bg-white text-black' : 'text-gray-500 hover:text-white hover:bg-gray-900'
                }`}
              >
                <item.icon size={20} strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-white text-black border-none text-xs font-medium px-2 py-1 ml-2">
              {item.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default SidebarNavigation;
