'use client';

import React, { useCallback } from 'react';
import {
  X,
  Globe,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useNodeStateStore } from '../../modules/nodeState';

const NodeConfigPanel: React.FC = () => {
  const nodes = useNodeStateStore((state) => state.nodes);
  const selectedNodeId = useNodeStateStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useNodeStateStore((state) => state.setSelectedNodeId);
  const updateNodeData = useNodeStateStore((state) => state.updateNodeData);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  if (!selectedNode) return null;

  const { data } = selectedNode;

  const handleUpdate = (field: string, value: any) => {
    updateNodeData(selectedNode.id, { [field]: value });
  };

  return (
    <div className="border-b border-[#E5E5E5]">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#E5E5E5] bg-[#FAFAFA]">
        <div>
          <h2 className="text-[13px] font-semibold text-[#111]">Node Config</h2>
          <p className="text-[11px] text-[#9CA3AF] font-mono">{selectedNode.id}</p>
        </div>
        <button
          onClick={() => setSelectedNodeId(null)}
          className="p-1.5 hover:bg-[#F3F4F6] rounded-md transition-colors text-[#9CA3AF] hover:text-[#111]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* General */}
        <Section title="General">
          <div className="space-y-3">
            <Field label="Node Name">
              <input
                type="text"
                value={data.label}
                onChange={(e) => handleUpdate('label', e.target.value)}
                className="w-full bg-white border border-[#E5E5E5] rounded-md px-3 py-2 text-[13px] text-[#111] focus:outline-none focus:border-[#111] transition-colors"
              />
            </Field>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#9CA3AF]" />
                <span className="text-[13px] text-[#374151]">Public Exposure</span>
              </div>
              <button
                onClick={() => handleUpdate('publicExposure', !data.publicExposure)}
                className={`
                  w-9 h-5 rounded-full relative transition-colors
                  ${data.publicExposure ? 'bg-[#111]' : 'bg-[#E5E5E5]'}
                `}
              >
                <div className={`
                  absolute top-0.5 w-4 h-4 rounded-full transition-all bg-white shadow-sm
                  ${data.publicExposure ? 'right-0.5' : 'left-0.5'}
                `} />
              </button>
            </div>
          </div>
        </Section>

        {/* Network */}
        <Section title="Network">
          <Field label="Open Ports (comma separated)">
            <input
              type="text"
              value={data.ports?.join(', ')}
              onChange={(e) => handleUpdate('ports', e.target.value.split(',').map(s => s.trim()))}
              className="w-full bg-white border border-[#E5E5E5] rounded-md px-3 py-2 text-[13px] text-[#111] focus:outline-none focus:border-[#111] transition-colors font-mono"
              placeholder="80, 443, 22..."
            />
          </Field>
        </Section>

        {/* Security */}
        <Section title="Security">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Privilege Level">
              <select
                value={data.privilegeLevel}
                onChange={(e) => handleUpdate('privilegeLevel', e.target.value)}
                className="w-full bg-white border border-[#E5E5E5] rounded-md px-3 py-2 text-[13px] text-[#111] focus:outline-none focus:border-[#111] appearance-none"
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
                className="w-full bg-white border border-[#E5E5E5] rounded-md px-3 py-2 text-[13px] text-[#111] focus:outline-none focus:border-[#111] appearance-none"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </Field>
          </div>

          {/* Vulnerabilities */}
          <div className="mt-3">
            <label className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-wide mb-1.5 block">Vulnerabilities</label>
            <div className="space-y-1.5">
              {data.vulnerabilitiesList.map((vuln: string, i: number) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-red-50 border border-red-100 rounded-md">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#DC2626]" />
                    <span className="text-[12px] text-[#DC2626] font-mono">{vuln}</span>
                  </div>
                  <button
                    onClick={() => {
                      const newList = data.vulnerabilitiesList.filter((_: string, idx: number) => idx !== i);
                      updateNodeData(selectedNode.id, {
                        vulnerabilitiesList: newList,
                        vulnerabilities: newList.length
                      });
                    }}
                    className="text-[#D1D5DB] hover:text-[#DC2626] transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <input
                type="text"
                placeholder="CVE-XXXX-XXXX (press Enter)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value;
                    if (val) {
                      const newList = [...data.vulnerabilitiesList, val];
                      updateNodeData(selectedNode.id, {
                        vulnerabilitiesList: newList,
                        vulnerabilities: newList.length
                      });
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
                className="w-full bg-white border border-[#E5E5E5] rounded-md px-3 py-2 text-[12px] text-[#111] focus:outline-none focus:border-[#111] transition-colors font-mono"
              />
            </div>
          </div>
        </Section>

        {/* Asset Value */}
        <Section title="Asset Value">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] text-[#6B7280]">Value (1-10)</span>
            <span className="text-[14px] font-semibold text-[#111] tabular-nums">{(data as any).assetValue || 5}</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={(data as any).assetValue || 5}
            onChange={(e) => handleUpdate('assetValue', parseInt(e.target.value, 10))}
            className="w-full h-1 bg-[#E5E5E5] rounded-full appearance-none cursor-pointer accent-[#111]"
          />
          <div className="flex justify-between text-[10px] text-[#D1D5DB] mt-1">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
            <span>Critical</span>
          </div>
        </Section>
      </div>
    </div>
  );
};

/* ── Helpers ───────────────────────────────────────── */

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">{title}</h3>
    {children}
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-wide">{label}</label>
    {children}
  </div>
);

export default NodeConfigPanel;
