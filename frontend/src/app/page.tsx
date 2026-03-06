'use client';

import React from 'react';
import PremiumLayout from '@/layout/PremiumLayout';
import SimulationWorkspace from '@/components/Canvas/SimulationWorkspace';
import NodeConfigPanel from '@/components/Panels/NodeConfigPanel';
import SimulationResultPanel from '@/components/Panels/SimulationResultPanel';
import AttackTimeline from '@/components/Panels/AttackTimeline';
import TopToolbar from '@/components/Toolbar/TopToolbar';
import { useNodeStateStore } from '@/modules/nodeState';

export default function Home() {
  const selectedNodeId = useNodeStateStore((s) => s.selectedNodeId);
  const simulationResults = useNodeStateStore((s) => s.simulationResults);
  const isSimulating = useNodeStateStore((s) => s.isSimulating);
  const timeline = useNodeStateStore((s) => s.timeline);

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
}
