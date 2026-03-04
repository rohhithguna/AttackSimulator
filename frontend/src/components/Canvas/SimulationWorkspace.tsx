'use client';

import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  Panel,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import InfrastructureNode from '../Nodes/InfrastructureNode';
import NetworkEdge from './EdgeRenderer';
import { useNodeStateStore } from '../../modules/nodeState';
import NodeConfigPanel from '../Panels/NodeConfigPanel';
import SimulationResultPanel from '../Panels/SimulationResultPanel';
import AttackTimeline from '../Panels/AttackTimeline';

const nodeTypes = {
  infrastructure: InfrastructureNode,
};

const edgeTypes = {
  network: NetworkEdge,
};

const SimulationWorkspace: React.FC = () => {
  const { 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    onConnect,
    setSelectedNodeId,
    isSimulating
  } = useNodeStateStore();

  const onNodeClick = useCallback((_: React.MouseEvent, node: any) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  const defaultEdgeOptions = useMemo(() => ({
    style: { stroke: '#1a1a1a', strokeWidth: 1.5, transition: 'all 0.5s ease' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#1a1a1a' },
  }), []);

  return (
    <div className="w-full h-full bg-[#0a0a0a] relative overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
        colorMode="dark"
        style={{ background: '#0a0a0a' }}
        defaultEdgeOptions={defaultEdgeOptions}
        minZoom={0.1}
        maxZoom={2}
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1} 
          color="#1a1a1a" 
        />
        <Controls 
          className="bg-black border border-gray-800 rounded-md overflow-hidden !left-4 !bottom-4 !top-auto" 
          showInteractive={false}
          position="bottom-left"
        />
        <MiniMap 
          className="bg-black border border-gray-800 !right-4 !bottom-4 rounded-lg overflow-hidden" 
          maskColor="rgba(0, 0, 0, 0.7)" 
          nodeColor={(n) => {
            if (n.data.compromised) return '#ef4444';
            if (n.data.highlighted) return '#ef4444';
            return '#1a1a1a';
          }}
          zoomable
          pannable
        />
        
        {/* Simulation HUD */}
        <Panel position="top-right" className="m-4">
          <div className={`p-4 bg-black/80 border border-gray-800 rounded-md shadow-2xl min-w-56 backdrop-blur-md transition-all duration-500 ${isSimulating ? 'border-red-900 shadow-red-900/10' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em]">Simulation Stats</h3>
              {isSimulating && (
                <span className="flex items-center gap-1.5 text-[9px] text-red-500 font-mono animate-pulse">
                  <div className="w-1 h-1 rounded-full bg-red-500" /> ACTIVE
                </span>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-900 pb-2">
                <span className="text-[10px] text-gray-500 font-mono">NODES</span>
                <span className="text-[10px] font-mono text-white">
                  {nodes.length.toString().padStart(2, '0')}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-900 pb-2">
                <span className="text-[10px] text-gray-500 font-mono">COMPROMISED</span>
                <span className={`text-[10px] font-mono ${nodes.some(n => n.data.compromised) ? 'text-red-500' : 'text-gray-400'}`}>
                  {nodes.filter(n => n.data.compromised).length.toString().padStart(2, '0')}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-gray-600 font-mono uppercase">Propagation</span>
                  <span className="text-[9px] font-mono text-gray-400">
                    {Math.round((nodes.filter(n => n.data.compromised).length / (nodes.length || 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-900 h-1 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${isSimulating ? 'bg-red-500' : 'bg-white'}`}
                    style={{ width: `${(nodes.filter(n => n.data.compromised).length / (nodes.length || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>

      {/* Overlays */}
      <NodeConfigPanel />
      <SimulationResultPanel />
      <AttackTimeline />

      {/* Global CSS Overrides */}
      <style jsx global>{`
        .react-flow__handle {
          opacity: 0;
          transition: opacity 0.2s;
        }
        .react-flow__node:hover .react-flow__handle,
        .react-flow__node.selected .react-flow__handle {
          opacity: 1;
        }
        .react-flow__controls button {
          background: #000 !important;
          border-bottom: 1px solid #1a1a1a !important;
          fill: #444 !important;
        }
        .react-flow__controls button:hover {
          background: #0a0a0a !important;
          fill: #fff !important;
        }
        .react-flow__attribution {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default SimulationWorkspace;
