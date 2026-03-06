'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  Server,
  Database,
  Shield,
  Cloud,
  Monitor,
  HardDrive,
  Cpu
} from 'lucide-react';
import { useNodeStateStore } from '../../modules/nodeState';

export type InfrastructureNodeType =
  | 'WebServer'
  | 'AppServer'
  | 'Database'
  | 'Firewall'
  | 'CloudInstance'
  | 'Workstation'
  | 'Storage';

export interface InfrastructureNodeData {
  label: string;
  type: InfrastructureNodeType;
  ports?: string[];
  vulnerabilities?: number;
  status?: 'online' | 'compromised' | 'offline';
  ip?: string;
  publicExposure: boolean;
  privilegeLevel: 'Low' | 'Medium' | 'High';
  vulnerabilitiesList: string[];
  dataCriticality: 'Low' | 'Medium' | 'High';
  highlighted?: boolean;
  compromised?: boolean;
}

const getIcon = (type: InfrastructureNodeType) => {
  switch (type) {
    case 'WebServer': return <Server className="w-4 h-4" />;
    case 'AppServer': return <Cpu className="w-4 h-4" />;
    case 'Database': return <Database className="w-4 h-4" />;
    case 'Firewall': return <Shield className="w-4 h-4" />;
    case 'CloudInstance': return <Cloud className="w-4 h-4" />;
    case 'Workstation': return <Monitor className="w-4 h-4" />;
    case 'Storage': return <HardDrive className="w-4 h-4" />;
    default: return <Server className="w-4 h-4" />;
  }
};

const InfrastructureNode = ({ id, data, selected }: NodeProps<{ data: InfrastructureNodeData } & any>) => {
  const {
    label,
    type,
    ports,
    ip,
    compromised
  } = data;

  const pendingConnectionNodeId = useNodeStateStore((s) => s.pendingConnectionNodeId);
  const isConnectionSource = pendingConnectionNodeId === id;
  const isConnectionTarget = !!pendingConnectionNodeId && pendingConnectionNodeId !== id;
  const isCompromised = compromised;

  return (
    <div className={`
      relative min-w-[170px] max-w-[220px] bg-white border rounded-lg p-3
      transition-all duration-200 cursor-pointer
      ${isConnectionSource
        ? 'border-[#111] shadow-md ring-2 ring-[#111]/10'
        : selected ? 'border-[#111] shadow-md' : 'border-[#E5E5E5]'}
      ${isConnectionTarget
        ? 'border-[#6B7280] shadow-sm ring-1 ring-[#6B7280]/20 hover:border-[#111] hover:ring-[#111]/20 hover:shadow-md'
        : ''}
      ${isCompromised
        ? 'border-[#DC2626] bg-red-50'
        : !isConnectionSource && !isConnectionTarget
          ? 'hover:border-[#888] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:-translate-y-[1px]'
          : ''}
    `}>
      {/* Connection mode indicator */}
      {isConnectionSource && (
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-[#111] rounded-full flex items-center justify-center z-10">
          <div className="w-1.5 h-1.5 bg-white rounded-full" />
        </div>
      )}
      {isConnectionTarget && (
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#6B7280] rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10" />
      )}

      {/* Top Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-[#D1D5DB] !border-2 !border-white"
      />

      <div className="flex items-start gap-2.5">
        <div className={`
          p-1.5 rounded-md transition-colors
          ${isCompromised
            ? 'bg-red-100 text-[#DC2626]'
            : isConnectionSource
              ? 'bg-[#F0F0F0] text-[#111]'
              : 'bg-[#F7F7F7] text-[#6B7280]'}
        `}>
          {getIcon(type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-0.5">
            {type.replace(/([A-Z])/g, ' $1').trim()}
          </div>
          <div className={`text-[13px] font-semibold truncate ${isCompromised ? 'text-[#DC2626]' : 'text-[#111]'}`}>
            {label}
          </div>

          <div className="mt-1.5 space-y-0.5">
            {ip && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#D1D5DB]">IP</span>
                <span className="text-[11px] text-[#6B7280] font-mono">{ip}</span>
              </div>
            )}
            {ports && ports.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#D1D5DB]">Ports</span>
                <span className="text-[11px] text-[#6B7280] font-mono">{ports.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Dot */}
      <div className={`
        absolute top-3 right-3 w-1.5 h-1.5 rounded-full
        ${isCompromised ? 'bg-[#DC2626]' :
          data.status === 'online' ? 'bg-emerald-500' : 'bg-[#D1D5DB]'}
      `} />

      {/* Bottom Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-[#9CA3AF] !border-2 !border-white"
      />
    </div>
  );
};

export default memo(InfrastructureNode);
