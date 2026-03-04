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

const InfrastructureNode = ({ data, selected }: NodeProps<{ data: InfrastructureNodeData } & any>) => {
  const { 
    label, 
    type, 
    ports, 
    vulnerabilities, 
    status = 'online', 
    ip, 
    highlighted, 
    compromised 
  } = data;

  const currentStatus = compromised ? 'compromised' : status;

  return (
    <div className={`
      relative min-w-[180px] bg-[#0a0a0a] border rounded-lg p-3
      transition-all duration-500 ease-in-out
      ${selected ? 'border-white ring-1 ring-white/20' : 'border-gray-800'}
      ${highlighted ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] scale-[1.02]' : 'hover:border-gray-700 shadow-[0_8px_30px_rgb(0,0,0,0.12)]'}
      ${compromised ? 'bg-red-500/5' : ''}
    `}>
      {/* Glow effect for highlighted nodes */}
      {highlighted && (
        <div className="absolute inset-0 rounded-lg animate-pulse bg-red-500/10 pointer-events-none" />
      )}

      {/* Top Handles */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-2 h-2 !bg-gray-600 !border-black"
      />
      
      <div className="flex items-start gap-3 relative z-10">
        <div className={`
          p-2 rounded-md border transition-colors duration-500
          ${currentStatus === 'compromised' 
            ? 'bg-red-500/20 border-red-500/50 text-red-500' 
            : 'bg-gray-900 border-gray-800 text-gray-400'}
        `}>
          {getIcon(type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-mono text-gray-500 uppercase tracking-wider mb-0.5">
            {type.replace(/([A-Z])/g, ' $1').trim()}
          </div>
          <div className={`text-xs font-bold truncate mb-2 transition-colors duration-500 ${currentStatus === 'compromised' ? 'text-red-400' : 'text-white'}`}>
            {label}
          </div>
          
          <div className="space-y-1">
            {ip && (
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-gray-600 font-mono">IP:</span>
                <span className="text-[10px] text-gray-400 font-mono">{ip}</span>
              </div>
            )}
            {ports && ports.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-gray-600 font-mono">PORTS:</span>
                <span className="text-[10px] text-gray-400 font-mono">{ports.join(',')}</span>
              </div>
            )}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-900">
              <span className="text-[9px] text-gray-600 font-mono uppercase">Vulns</span>
              <span className={`
                text-[10px] font-mono font-bold
                ${vulnerabilities && vulnerabilities > 0 ? 'text-red-400' : 'text-gray-700'}
              `}>
                {vulnerabilities || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Indicator Dot */}
      <div className={`
        absolute top-3 right-3 w-1.5 h-1.5 rounded-full transition-all duration-500
        ${currentStatus === 'online' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 
          currentStatus === 'compromised' ? 'bg-red-500 shadow-[0_0_12px_#ef4444] animate-pulse' : 
          'bg-gray-600'}
      `} />

      {/* Bottom Handles */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-2 h-2 !bg-gray-400 !border-black"
      />
    </div>
  );
};

export default memo(InfrastructureNode);
