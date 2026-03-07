'use client';

import React, { useState, useEffect } from 'react';
import {
  X, ChevronDown, ChevronRight, ShieldAlert, Globe, Server, Cpu, Cloud, Database,
  Shield, Router, Split, ShieldCheck, Eye, Activity, Laptop, Radio, Mail,
  Printer as PrinterIcon, ArrowLeftRight, Waypoints, KeyRound, HardDrive, Monitor
} from 'lucide-react';
import { useNodeStateStore } from '../../modules/nodeState';

const getMonochromeIcon = (type: string) => {
  const props = { className: "w-5 h-5 text-[#111]" };
  switch (type) {
    case 'WebServer': return <Server {...props} />;
    case 'AppServer': return <Cpu {...props} />;
    case 'Database': return <Database {...props} />;
    case 'Firewall': return <Shield {...props} />;
    case 'CloudInstance': return <Cloud {...props} />;
    case 'Workstation': return <Monitor {...props} />;
    case 'Storage': return <HardDrive {...props} />;
    case 'Router': return <Router {...props} />;
    case 'LoadBalancer': return <Split {...props} />;
    case 'VPN': return <ShieldCheck {...props} />;
    case 'IDS': return <Eye {...props} />;
    case 'SIEM': return <Activity {...props} />;
    case 'Endpoint': return <Laptop {...props} />;
    case 'IoTDevice': return <Radio {...props} />;
    case 'DNSServer': return <Globe {...props} />;
    case 'SMTPServer': return <Mail {...props} />;
    case 'Printer': return <PrinterIcon {...props} />;
    case 'ProxyServer': return <ArrowLeftRight {...props} />;
    case 'APIGateway': return <Waypoints {...props} />;
    case 'AuthServer': return <KeyRound {...props} />;
    default: return <Server {...props} />;
  }
};

const CollapsibleSection = ({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#E5E5E5] rounded-md overflow-hidden bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-[#FAFAFA] hover:bg-[#F3F4F6] transition-colors border-b border-transparent"
      >
        <span className="text-[11px] font-semibold text-[#111] uppercase tracking-wider">{title}</span>
        {isOpen ? <ChevronDown size={14} className="text-[#6B7280]" /> : <ChevronRight size={14} className="text-[#6B7280]" />}
      </button>
      {isOpen && (
        <div className="p-3 border-t border-[#E5E5E5] space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-[11px] text-[#6B7280] font-medium uppercase tracking-wide mb-1.5">{label}</label>
    {children}
  </div>
);

const NodeConfigPanel: React.FC = () => {
  const nodes = useNodeStateStore((state) => state.nodes);
  const edges = useNodeStateStore((state) => state.edges);
  const selectedNodeId = useNodeStateStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useNodeStateStore((state) => state.setSelectedNodeId);
  const updateNodeData = useNodeStateStore((state) => state.updateNodeData);

  const [saveStatus, setSaveStatus] = useState<'Unsaved Changes' | 'Saved' | null>(null);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  useEffect(() => {
    if (!selectedNode) return;
    setSaveStatus('Unsaved Changes');
    const timer = setTimeout(() => {
      setSaveStatus('Saved');
    }, 1000);
    return () => clearTimeout(timer);
  }, [selectedNode?.data]);

  if (!selectedNode) return null;

  const { data } = selectedNode;

  const handleUpdate = (field: string, value: any) => {
    updateNodeData(selectedNode.id, { [field]: value });
  };

  const incomingEdges = edges.filter(e => e.target === selectedNode.id).length;
  const outgoingEdges = edges.filter(e => e.source === selectedNode.id).length;

  const typeName = data.type?.replace(/([A-Z])/g, ' $1').trim().toUpperCase() || 'UNKNOWN';

  const getInsightText = () => {
    if (data.publicExposure) return "This node is publicly exposed and could be used as an attacker entry point.";
    if ((data.assetValue || 0) >= 8) return "This node stores high-value data and may become a priority attack target.";
    return "This internal asset serves standard infrastructure roles.";
  };

  return (
    <div className="border-b border-[#E5E5E5] bg-white h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#E5E5E5] bg-[#FAFAFA] shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-[13px] font-semibold text-[#111]">Node Config</h2>
            <p className="text-[11px] text-[#9CA3AF] font-mono">{selectedNode.id}</p>
          </div>
          {saveStatus && (
            <span className={`text-[10px] italic px-2 py-0.5 rounded-full ${saveStatus === 'Saved' ? 'text-[#6B7280] bg-[#F3F4F6]' : 'text-[#111] bg-[#E5E5E5]'}`}>
              {saveStatus}
            </span>
          )}
        </div>
        <button
          onClick={() => setSelectedNodeId(null)}
          className="p-1.5 hover:bg-[#F3F4F6] rounded-md transition-colors text-[#9CA3AF] hover:text-[#111]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Node Summary Header */}
        <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-md p-3 flex items-start gap-3">
          <div className="p-2 bg-white border border-[#E5E5E5] rounded-md shrink-0">
            {getMonochromeIcon(data.type)}
          </div>
          <div className="min-w-0">
            <h3 className="text-[12px] font-bold text-[#111] truncate">{data.label?.toUpperCase() || typeName}</h3>
            <div className="text-[11px] text-[#6B7280] mt-0.5">
              Type: {typeName}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#111] flex-wrap">
              <span className="font-mono bg-[#E5E5E5] px-1 rounded">IP: {data.ip || 'N/A'}</span>
              <span className="font-mono bg-[#E5E5E5] px-1 rounded">Ports: {(data.ports && data.ports.length > 0) ? data.ports.join(', ') : 'None'}</span>
            </div>
          </div>
        </div>

        {/* Node Insight Text */}
        <div className="px-3 border-l-2 border-[#111] py-1">
          <p className="text-[11px] text-[#111] italic">{getInsightText()}</p>
        </div>

        {/* General Section */}
        <CollapsibleSection title="General">
          <Field label="Node Name">
            <input
              type="text"
              value={data.label}
              onChange={(e) => handleUpdate('label', e.target.value)}
              className="w-full bg-white border border-[#E5E5E5] rounded-md px-3 py-2 text-[12px] text-[#111] focus:outline-none focus:border-[#111] transition-colors"
            />
          </Field>
          <div className="flex items-center justify-between py-1">
            <span className="text-[12px] text-[#374151] font-medium">Public Exposure</span>
            <button
              onClick={() => handleUpdate('publicExposure', !data.publicExposure)}
              className={`w-8 h-4 rounded-full relative transition-colors ${data.publicExposure ? 'bg-[#111]' : 'bg-[#E5E5E5]'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all bg-white shadow-sm ${data.publicExposure ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>
        </CollapsibleSection>

        {/* Network Section */}
        <CollapsibleSection title="Network">
          <Field label="Open Ports">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {data.ports?.map((port: string, i: number) => (
                <div key={i} className="flex items-center gap-1 px-1.5 py-0.5 bg-[#F3F4F6] border border-[#E5E5E5] rounded text-[11px] font-mono text-[#111]">
                  {port}
                  <button onClick={() => {
                    const newPorts = [...(data.ports || [])];
                    newPorts.splice(i, 1);
                    handleUpdate('ports', newPorts);
                  }} className="text-[#9CA3AF] hover:text-[#111]">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add port (Press Enter)"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = (e.currentTarget.value).trim();
                  if (val && !data.ports?.includes(val)) {
                    handleUpdate('ports', [...(data.ports || []), val]);
                    e.currentTarget.value = '';
                  }
                }
              }}
              className="w-full bg-white border border-[#E5E5E5] rounded-md px-3 py-1.5 text-[12px] text-[#111] focus:outline-none focus:border-[#111] transition-colors font-mono"
            />
          </Field>

          <div className="mt-4 border-t border-[#E5E5E5] pt-3">
            <h4 className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wide mb-2">Connections</h4>
            <div className="flex gap-2">
              <div className="flex-1 bg-[#FAFAFA] border border-[#E5E5E5] rounded px-2 py-1.5 flex justify-between items-center">
                <span className="text-[11px] text-[#6B7280]">Incoming</span>
                <span className="text-[12px] font-medium text-[#111]">{incomingEdges}</span>
              </div>
              <div className="flex-1 bg-[#FAFAFA] border border-[#E5E5E5] rounded px-2 py-1.5 flex justify-between items-center">
                <span className="text-[11px] text-[#6B7280]">Outgoing</span>
                <span className="text-[12px] font-medium text-[#111]">{outgoingEdges}</span>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Security Section */}
        <CollapsibleSection title="Security">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Privilege Level">
              <select
                value={data.privilegeLevel}
                onChange={(e) => handleUpdate('privilegeLevel', e.target.value)}
                className="w-full bg-white border border-[#E5E5E5] rounded-md px-2 py-1.5 text-[12px] text-[#111] focus:outline-none focus:border-[#111]"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </Field>
            <Field label="Data Criticality">
              <select
                value={data.dataCriticality}
                onChange={(e) => handleUpdate('dataCriticality', e.target.value)}
                className="w-full bg-white border border-[#E5E5E5] rounded-md px-2 py-1.5 text-[12px] text-[#111] focus:outline-none focus:border-[#111]"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </Field>
          </div>

          <Field label="Vulnerabilities">
            <div className="space-y-1.5 mb-2">
              {data.vulnerabilitiesList?.map((vuln: string, i: number) => (
                <div key={i} className="flex items-center justify-between px-2 py-1.5 bg-[#F9FAFB] border border-[#E5E5E5] rounded-md">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#111]" />
                    <span className="text-[11px] text-[#111] font-mono">{vuln}</span>
                  </div>
                  <button
                    onClick={() => {
                      const newList = data.vulnerabilitiesList.filter((_: string, idx: number) => idx !== i);
                      updateNodeData(selectedNode.id, {
                        vulnerabilitiesList: newList,
                        vulnerabilities: newList.length
                      });
                    }}
                    className="text-[#9CA3AF] hover:text-[#111] transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <input
              type="text"
              placeholder="+ Add Vulnerability (Enter)"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = (e.currentTarget.value).trim();
                  if (val) {
                    const newList = [...(data.vulnerabilitiesList || []), val];
                    updateNodeData(selectedNode.id, {
                      vulnerabilitiesList: newList,
                      vulnerabilities: newList.length
                    });
                    e.currentTarget.value = '';
                  }
                }
              }}
              className="w-full bg-white border border-[#E5E5E5] rounded-md px-3 py-1.5 text-[12px] text-[#111] focus:outline-none focus:border-[#111] transition-colors font-mono"
            />
          </Field>
        </CollapsibleSection>

        {/* Risk Attributes Section */}
        <CollapsibleSection title="Risk Attributes">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-[#6B7280] uppercase">Asset Value</span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => {
                const isActive = (data.assetValue || 0) === val;
                return (
                  <button
                    key={val}
                    onClick={() => handleUpdate('assetValue', val)}
                    className={`flex-1 h-6 flex items-center justify-center text-[10px] font-medium border rounded transition-colors ${isActive ? 'border-[#111] bg-[#111] text-white' : 'border-[#E5E5E5] bg-white text-[#6B7280] hover:border-[#111] hover:text-[#111]'
                      }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-md p-3">
            <h4 className="text-[10px] font-semibold text-[#111] uppercase tracking-wide mb-2">Risk Factors</h4>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between border-b border-[#E5E5E5] pb-1">
                <span className="text-[#6B7280]">Exposure</span>
                <span className="font-medium text-[#111]">{data.publicExposure ? 'Public' : 'Internal'}</span>
              </div>
              <div className="flex justify-between border-b border-[#E5E5E5] pb-1">
                <span className="text-[#6B7280]">Ports</span>
                <span className="font-medium text-[#111]">{data.ports?.length || 0}</span>
              </div>
              <div className="flex justify-between border-b border-[#E5E5E5] pb-1">
                <span className="text-[#6B7280]">Privilege</span>
                <span className="font-medium text-[#111]">{data.privilegeLevel || 'Low'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Asset Value</span>
                <span className="font-medium text-[#111]">{data.assetValue || 0} / 10</span>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Quick Actions Section */}
        <CollapsibleSection title="Quick Actions">
          <div className="space-y-2">
            <button
              onClick={() => handleUpdate('privilegeLevel', 'Low')}
              className="w-full text-left px-3 py-2 text-[12px] font-medium text-[#111] bg-white border border-[#E5E5E5] rounded hover:border-[#111] hover:bg-[#FAFAFA] transition-colors"
            >
              Harden Node (Set Privilege Low)
            </button>
            <button
              onClick={() => {
                updateNodeData(selectedNode.id, { vulnerabilitiesList: [], vulnerabilities: 0 });
              }}
              className="w-full text-left px-3 py-2 text-[12px] font-medium text-[#111] bg-white border border-[#E5E5E5] rounded hover:border-[#111] hover:bg-[#FAFAFA] transition-colors"
            >
              Remove Vulnerabilities
            </button>
            <button
              onClick={() => handleUpdate('publicExposure', false)}
              className="w-full text-left px-3 py-2 text-[12px] font-medium text-[#111] bg-white border border-[#E5E5E5] rounded hover:border-[#111] hover:bg-[#FAFAFA] transition-colors"
            >
              Isolate Node (Disable Public Exposure)
            </button>
          </div>
        </CollapsibleSection>

      </div>
    </div>
  );
};

export default NodeConfigPanel;
