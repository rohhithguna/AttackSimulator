'use client';

import React from 'react';
import PremiumLayout from '@/layout/PremiumLayout';
import SimulationWorkspace from '@/components/Canvas/SimulationWorkspace';
import NodeConfigPanel from '@/components/Panels/NodeConfigPanel';

import AttackReportView from '@/components/Report/AttackReportView';
import TopToolbar from '@/components/Toolbar/TopToolbar';
import FloatingControlBar from '@/components/FloatingControlBar';
import { useNodeStateStore } from '@/modules/nodeState';

export default function Home() {
  const selectedNodeId = useNodeStateStore((s) => s.selectedNodeId);
  const viewMode = useNodeStateStore((s) => s.viewMode);

  return (
    <PremiumLayout>
      <div className="flex flex-col h-full w-full overflow-hidden">
        {/* Top Toolbar */}
        <div className="h-12 border-b border-[#E5E5E5] flex items-center px-4 bg-white z-20 shrink-0">
          <TopToolbar />
        </div>

        {/* Main Area: Canvas + Right Panel OR Report View */}
        <div className="flex-1 flex overflow-hidden relative">
          {viewMode === 'workspace' && <FloatingControlBar />}
          {/* Always render canvas in background */}
          <div className="flex-1 relative overflow-hidden min-w-0">
            <SimulationWorkspace />
          </div>

          {/* Right Inspector Panel (Only Node Config in Workspace mode) */}
          {viewMode === 'workspace' && selectedNodeId && (
            <div className="w-[320px] shrink-0 border-l border-[#E5E5E5] bg-white overflow-y-auto custom-scrollbar relative z-10">
              <NodeConfigPanel />
            </div>
          )}

          {/* Report View Overlay */}
          {viewMode === 'report' && (
            <div className="absolute inset-0 z-20 flex">
              <AttackReportView />
            </div>
          )}
        </div>
      </div>
    </PremiumLayout>
  );
}
