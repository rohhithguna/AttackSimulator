'use client';

import React from 'react';
import {
  Server,
  Cpu,
  Cloud,
  HardDrive,
  Monitor,
  Database,
  Shield,
  GripVertical,
} from 'lucide-react';
import type { InfrastructureNodeType } from '../Nodes/InfrastructureNode';

interface NodePaletteItem {
  type: InfrastructureNodeType;
  label: string;
  icon: React.ElementType;
  defaultPorts: string[];
  defaultPrivilege: 'Low' | 'Medium' | 'High';
  defaultCriticality: 'Low' | 'Medium' | 'High';
  defaultAssetValue: number;
}

const NODE_PALETTE: NodePaletteItem[] = [
  { type: 'WebServer', label: 'Web Server', icon: Server, defaultPorts: ['80', '443'], defaultPrivilege: 'Low', defaultCriticality: 'Low', defaultAssetValue: 3 },
  { type: 'AppServer', label: 'App Server', icon: Cpu, defaultPorts: ['8080'], defaultPrivilege: 'Medium', defaultCriticality: 'Medium', defaultAssetValue: 5 },
  { type: 'Database', label: 'Database', icon: Database, defaultPorts: ['3306'], defaultPrivilege: 'High', defaultCriticality: 'High', defaultAssetValue: 8 },
  { type: 'Firewall', label: 'Firewall', icon: Shield, defaultPorts: ['443'], defaultPrivilege: 'High', defaultCriticality: 'Low', defaultAssetValue: 2 },
  { type: 'Storage', label: 'Storage', icon: HardDrive, defaultPorts: ['22'], defaultPrivilege: 'High', defaultCriticality: 'High', defaultAssetValue: 9 },
  { type: 'CloudInstance', label: 'Cloud Instance', icon: Cloud, defaultPorts: ['22', '443'], defaultPrivilege: 'Medium', defaultCriticality: 'Medium', defaultAssetValue: 6 },
  { type: 'Workstation', label: 'Workstation', icon: Monitor, defaultPorts: ['3389'], defaultPrivilege: 'Low', defaultCriticality: 'Low', defaultAssetValue: 3 },
];

const DraggableNode = ({ item }: { item: NodePaletteItem }) => {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow-type', item.type);
    event.dataTransfer.setData('application/reactflow-label', item.label);
    event.dataTransfer.setData('application/reactflow-ports', JSON.stringify(item.defaultPorts));
    event.dataTransfer.setData('application/reactflow-privilege', item.defaultPrivilege);
    event.dataTransfer.setData('application/reactflow-criticality', item.defaultCriticality);
    event.dataTransfer.setData('application/reactflow-assetvalue', String(item.defaultAssetValue));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-grab active:cursor-grabbing
        bg-white border border-[#E5E5E5] hover:bg-[#F3F4F6] hover:border-[#D1D5DB]
        transition-colors group select-none"
    >
      <GripVertical size={12} className="text-[#D1D5DB] group-hover:text-[#9CA3AF] transition-colors shrink-0" />
      <item.icon size={16} strokeWidth={1.5} className="text-[#6B7280] group-hover:text-[#111] transition-colors shrink-0" />
      <span className="text-[13px] font-medium text-[#374151] group-hover:text-[#111] transition-colors">
        {item.label}
      </span>
    </div>
  );
};

const LeftNav: React.FC = () => {
  return (
    <aside className="w-[260px] h-full bg-[#F7F7F7] border-r border-[#E5E5E5] flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-4 flex items-center gap-3 border-b border-[#E5E5E5]">
        <div className="w-7 h-7 bg-[#111] rounded-md flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm leading-none">A</span>
        </div>
        <div>
          <div className="text-[13px] font-semibold text-[#111] leading-none">Attack Simulator</div>
          <div className="text-[11px] text-[#9CA3AF] mt-0.5">v2.0</div>
        </div>
      </div>

      {/* Node Palette */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4">
        <div className="px-2 mb-3">
          <h3 className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Infrastructure Nodes</h3>
          <p className="text-[11px] text-[#D1D5DB] mt-1">Drag onto canvas</p>
        </div>
        <div className="space-y-1.5">
          {NODE_PALETTE.map((item) => (
            <DraggableNode key={item.type} item={item} />
          ))}
        </div>
      </div>
    </aside>
  );
};

export default LeftNav;
