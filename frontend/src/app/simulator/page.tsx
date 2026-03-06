'use client';

import React from 'react';
import PremiumLayout from '@/layout/PremiumLayout';
import SimulationWorkspace from '@/components/Canvas/SimulationWorkspace';
import NodeConfigPanel from '@/components/Panels/NodeConfigPanel';
import SimulationResultPanel from '@/components/Panels/SimulationResultPanel';
import AttackTimeline from '@/components/Panels/AttackTimeline';
import TopToolbar from '@/components/Toolbar/TopToolbar';
import { useNodeStateStore } from '@/modules/nodeState';
import { Shield, Activity, AlertTriangle, Cpu } from 'lucide-react';

const SimulatorPage: React.FC = () => {
  const nodes = useNodeStateStore((s) => s.nodes);
  const edges = useNodeStateStore((s) => s.edges);
  const selectedNodeId = useNodeStateStore((s) => s.selectedNodeId);
  const simulationResults = useNodeStateStore((s) => s.simulationResults);
  const backendResult = useNodeStateStore((s) => s.backendResult);
  const isSimulating = useNodeStateStore((s) => s.isSimulating);
  const timeline = useNodeStateStore((s) => s.timeline);

  const exposedCount = nodes.filter(n => n.data?.publicExposure).length;
  const compromisedCount = nodes.filter(n => n.data?.compromised).length;
  const showRightPanel = selectedNodeId || simulationResults || isSimulating || timeline.length > 0;

  return (
    <PremiumLayout>
      <div className="flex flex-col h-full w-full overflow-hidden">
        {/* Top Toolbar */}
        <div className="h-12 border-b border-[#E5E5E5] flex items-center px-4 bg-white z-20 shrink-0">
          <TopToolbar />
        </div>

        {/* Main Area: Canvas + Right Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Canvas */}
          <div className="flex-1 relative overflow-hidden min-w-0">
            <SimulationWorkspace />
          </div>

          {/* Right Inspector Panel */}
          {showRightPanel && (
            <div className="w-[320px] shrink-0 border-l border-[#E5E5E5] bg-white overflow-y-auto custom-scrollbar">
              {/* Infrastructure Health Summary */}
              <div className="p-4 border-b border-[#E5E5E5]">
                <h4 className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Cpu size={12} />
                  Infrastructure Health
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <InlineMetric label="Nodes" value={String(nodes.length)} />
                  <InlineMetric label="Connections" value={String(edges.length)} />
                  <InlineMetric label="Exposed" value={String(exposedCount)} highlight={exposedCount > 0} />
                  <InlineMetric label="Compromised" value={String(compromisedCount)} highlight={compromisedCount > 0} />
                </div>

                {simulationResults && (
                  <div className="mt-3 pt-3 border-t border-[#F3F4F6] grid grid-cols-2 gap-2">
                    <InlineMetric
                      label="Risk Score"
                      value={backendResult?.risk_score?.toFixed(1) ?? String(simulationResults.riskScore)}
                      highlight
                    />
                    <InlineMetric
                      label="Confidence"
                      value={`${simulationResults.confidenceScore}%`}
                    />
                  </div>
                )}
              </div>

              {/* Node Config (shown when a node is selected) */}
              <NodeConfigPanel />

              {/* Attack Timeline (shown after simulation) */}
              <AttackTimeline />

              {/* Simulation Results (shown after simulation) */}
              <SimulationResultPanel />
            </div>
          )}
        </div>
      </div>
    </PremiumLayout>
  );
};

const InlineMetric = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-lg p-2.5">
    <span className="text-[10px] text-[#9CA3AF] uppercase font-semibold tracking-wide block">{label}</span>
    <span className={`text-[16px] font-semibold tabular-nums ${highlight ? 'text-[#DC2626]' : 'text-[#111]'}`}>{value}</span>
  </div>
);

export default SimulatorPage;
