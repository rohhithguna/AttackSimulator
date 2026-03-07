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
  Cpu,
  Router,
  Split,
  ShieldCheck,
  Eye,
  Activity,
  Laptop,
  Radio,
  Globe,
  Mail,
  Printer as PrinterIcon,
  ArrowLeftRight,
  Waypoints,
  KeyRound,
} from 'lucide-react';
import { useNodeStateStore } from '../../modules/nodeState';
import { calculateNodeRiskCategory } from '../../utils/calculateNodeRisk';

export type InfrastructureNodeType =
  | 'WebServer'
  | 'AppServer'
  | 'Database'
  | 'Firewall'
  | 'Storage'
  | 'CloudInstance'
  | 'Workstation'
  | 'Router'
  | 'LoadBalancer'
  | 'VPN'
  | 'IDS'
  | 'SIEM'
  | 'Endpoint'
  | 'IoTDevice'
  | 'DNSServer'
  | 'SMTPServer'
  | 'Printer'
  | 'ProxyServer'
  | 'APIGateway'
  | 'AuthServer';

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
  isEntry?: boolean;
  isTarget?: boolean;
  attackStep?: number;
}

const getIcon = (type: InfrastructureNodeType, isCompromised: boolean) => {
  const colorClass = isCompromised ? 'text-[#DC2626]' : (() => {
    switch (type) {
      case 'WebServer': return 'text-blue-500';
      case 'AppServer': return 'text-purple-500';
      case 'Database': return 'text-orange-500';
      case 'Storage': return 'text-teal-500';
      case 'Firewall': return 'text-gray-500';
      case 'CloudInstance': return 'text-indigo-500';
      case 'Workstation': return 'text-slate-500';
      case 'DNSServer': return 'text-cyan-500';
      case 'SMTPServer': return 'text-rose-500';
      case 'Printer': return 'text-gray-400';
      case 'ProxyServer': return 'text-amber-500';
      case 'APIGateway': return 'text-violet-500';
      case 'AuthServer': return 'text-emerald-500';
      default: return 'text-gray-500';
    }
  })();

  const iconProps = { className: `w-4 h-4 ${colorClass}` };

  switch (type) {
    case 'WebServer': return <Server {...iconProps} />;
    case 'AppServer': return <Cpu {...iconProps} />;
    case 'Database': return <Database {...iconProps} />;
    case 'Firewall': return <Shield {...iconProps} />;
    case 'CloudInstance': return <Cloud {...iconProps} />;
    case 'Workstation': return <Monitor {...iconProps} />;
    case 'Storage': return <HardDrive {...iconProps} />;
    case 'Router': return <Router {...iconProps} />;
    case 'LoadBalancer': return <Split {...iconProps} />;
    case 'VPN': return <ShieldCheck {...iconProps} />;
    case 'IDS': return <Eye {...iconProps} />;
    case 'SIEM': return <Activity {...iconProps} />;
    case 'Endpoint': return <Laptop {...iconProps} />;
    case 'IoTDevice': return <Radio {...iconProps} />;
    case 'DNSServer': return <Globe {...iconProps} />;
    case 'SMTPServer': return <Mail {...iconProps} />;
    case 'Printer': return <PrinterIcon {...iconProps} />;
    case 'ProxyServer': return <ArrowLeftRight {...iconProps} />;
    case 'APIGateway': return <Waypoints {...iconProps} />;
    case 'AuthServer': return <KeyRound {...iconProps} />;
    default: return <Server {...iconProps} />;
  }
};

const InfrastructureNode = ({ id, data, selected }: NodeProps<{ data: InfrastructureNodeData } & any>) => {
  const {
    label,
    type,
    ports,
    ip,
    compromised,
    isEntry,
    isTarget,
    attackStep
  } = data;

  const pendingConnectionNodeId = useNodeStateStore((s) => s.pendingConnectionNodeId);
  const hoveredTimelineNodeId = useNodeStateStore((s) => s.hoveredTimelineNodeId);
  const activeMitigations = useNodeStateStore((s) => s.activeMitigations);
  const heatmapEnabled = useNodeStateStore((s) => s.heatmapEnabled);
  const attackPath = useNodeStateStore((s) => s.attackPath);
  const attackPlaybackStep = useNodeStateStore((s) => s.attackPlaybackStep);
  const isPlaying = useNodeStateStore((s) => s.isPlaying);

  const isConnectionSource = pendingConnectionNodeId === id;
  const isConnectionTarget = !!pendingConnectionNodeId && pendingConnectionNodeId !== id;
  const isTimelineHovered = hoveredTimelineNodeId === id;
  const isCompromised = compromised;
  const isMitigated = activeMitigations.some(m => m.affectedNodes?.includes(id));

  // Playback-specific state
  const pathIndex = attackPath.indexOf(id);
  const isInPath = pathIndex !== -1;
  const isPlaybackActive = attackPlaybackStep >= 0 && isInPath;
  const isCurrentlyReached = isPlaybackActive && pathIndex <= attackPlaybackStep;
  const isCurrentStep = isPlaybackActive && pathIndex === attackPlaybackStep;
  const isPlaybackEntry = isCurrentlyReached && pathIndex === 0;
  const isPlaybackTarget = isCurrentlyReached && pathIndex === attackPath.length - 1;
  const isPlaybackIntermediate = isCurrentlyReached && !isPlaybackEntry && !isPlaybackTarget;

  const riskCategory = calculateNodeRiskCategory(data);

  const hoverDetails = `${label}
IP: ${ip || 'N/A'}
Ports: ${ports && ports.length > 0 ? ports.join(', ') : 'None'}
Privilege: ${data.privilegeLevel}
Asset Value: ${data.assetValue || 3}
Exposure: ${data.publicExposure ? 'Public' : 'Internal'}
Risk Level: ${riskCategory}`;

  // Determine playback-specific styling
  const getPlaybackClass = () => {
    if (!isPlaybackActive || !isCurrentlyReached) return '';
    if (isPlaybackEntry) return 'playback-entry-pulse';
    if (isPlaybackTarget) return 'playback-target-pulse';
    if (isPlaybackIntermediate) return 'playback-intermediate';
    return '';
  };

  const getPlaybackBorderStyle = (): React.CSSProperties => {
    if (!isPlaybackActive) return {};
    if (!isCurrentlyReached) return { opacity: 0.35, transition: 'opacity 0.3s ease' };
    if (isPlaybackTarget) return {
      borderColor: '#DC2626',
      boxShadow: '0 0 20px rgba(220,38,38,0.4), 0 0 40px rgba(220,38,38,0.15)',
      transition: 'all 0.3s ease',
    };
    if (isPlaybackEntry) return {
      borderColor: '#DC2626',
      boxShadow: '0 0 15px rgba(220,38,38,0.35), 0 0 30px rgba(220,38,38,0.1)',
      transition: 'all 0.3s ease',
    };
    if (isPlaybackIntermediate) return {
      borderColor: '#DC2626',
      boxShadow: '0 0 8px rgba(220,38,38,0.2)',
      transition: 'all 0.3s ease',
    };
    return {};
  };

  return (
    <div
      title={hoverDetails}
      className={`
      relative min-w-[170px] max-w-[220px] bg-white rounded-lg p-3
      transition-all duration-200 cursor-pointer
      ${getPlaybackClass()}
      ${heatmapEnabled
          ? riskCategory === 'CRITICAL' ? 'border-4' : ['HIGH', 'MEDIUM'].includes(riskCategory) ? 'border-2' : 'border'
          : 'border'}
      ${isConnectionSource
          ? 'border-[#111] shadow-md ring-2 ring-[#111]/10'
          : selected || isTimelineHovered ? 'border-[#111] shadow-md -translate-y-[1px]' : 'border-[#E5E5E5]'}
      ${isConnectionTarget
          ? 'border-[#6B7280] shadow-sm ring-1 ring-[#6B7280]/20 hover:border-[#111] hover:ring-[#111]/20 hover:shadow-md'
          : ''}
      ${isTarget && !isPlaybackActive
          ? '!border-[#DC2626] shadow-[0_0_15px_rgba(220,38,38,0.2)]'
          : ''}
      ${isCompromised && !isTarget && !isPlaybackActive
          ? 'border-[#DC2626] bg-red-50'
          : !isConnectionSource && !isConnectionTarget && !selected && !isTimelineHovered && !isPlaybackActive
            ? 'hover:border-[#888] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:-translate-y-[1px]'
            : ''}
      ${isEntry && !selected && !isTimelineHovered && !isPlaybackActive
          ? 'ring-2 ring-red-500 ring-offset-2 shadow-[0_0_12px_rgba(239,68,68,0.6)]'
          : ''}
    `}
      style={getPlaybackBorderStyle()}
    >
      {/* Connection mode indicator */}
      {isConnectionSource && (
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-[#111] rounded-full flex items-center justify-center z-10">
          <div className="w-1.5 h-1.5 bg-white rounded-full" />
        </div>
      )}
      {isConnectionTarget && (
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#6B7280] rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10" />
      )}

      {/* Badges */}
      {isEntry && (
        <div className="absolute -top-2.5 -left-2.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10 pointer-events-none">
          ENTRY
        </div>
      )}
      {isTarget && (
        <div className="absolute -bottom-2.5 -right-2.5 bg-[#DC2626] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10 pointer-events-none">
          TARGET
        </div>
      )}
      {attackStep !== undefined && (
        <div className="absolute -top-2.5 -right-2.5 w-[20px] h-[20px] bg-white border-2 border-[#111] text-[#111] text-[11px] font-bold rounded-full flex items-center justify-center shadow-sm z-10 pointer-events-none">
          {attackStep}
        </div>
      )}
      {isMitigated && (
        <div className="absolute -bottom-2 -left-2 bg-emerald-100 border border-emerald-300 text-emerald-700 text-[10px] flex items-center gap-1 font-bold px-1.5 py-0.5 rounded-md shadow-sm z-10 pointer-events-none">
          <Shield size={10} />
          Patched
        </div>
      )}

      {/* Playback step indicator */}
      {isCurrentStep && isPlaybackActive && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#DC2626] text-white text-[8px] font-bold px-2 py-0.5 rounded-full shadow-lg z-20 pointer-events-none whitespace-nowrap playback-step-badge">
          STEP {pathIndex + 1}
        </div>
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
          ${isCompromised || isCurrentlyReached
            ? 'bg-red-100'
            : isConnectionSource
              ? 'bg-[#F0F0F0]'
              : 'bg-[#F7F7F7]'}
        `}>
          {getIcon(type, !!(isCompromised || isCurrentlyReached))}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-0.5">
            {type.replace(/([A-Z])/g, ' $1').trim()}
          </div>
          <div className={`text-[13px] font-semibold truncate ${isCompromised || isCurrentlyReached ? 'text-[#DC2626]' : 'text-[#111]'}`}>
            {label}
          </div>

          <div className="mt-1 flex gap-1 flex-wrap">
            {data.publicExposure && (
              <span className="text-[10px] font-medium border px-1 rounded text-black border-gray-400">
                [ENTRY]
              </span>
            )}
            {(data.assetValue || 0) >= 8 && (
              <span className="text-[10px] font-medium border px-1 rounded text-black border-gray-400">
                [CRITICAL]
              </span>
            )}
            {heatmapEnabled && (
              <span className="text-xs border rounded px-1 text-black border-gray-400">
                RISK: {riskCategory}
              </span>
            )}
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
        ${isCompromised || isCurrentlyReached ? 'bg-[#DC2626]' :
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
