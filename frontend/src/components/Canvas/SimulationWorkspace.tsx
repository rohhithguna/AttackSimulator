'use client';

import React, { useCallback, useMemo, useRef, memo, useEffect, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  Panel,
  MarkerType,
  ConnectionLineType,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import InfrastructureNode from '../Nodes/InfrastructureNode';
import NetworkEdge from './EdgeRenderer';
import ConnectionPreview from './ConnectionPreview';
import { useNodeStateStore, type InfrastructureNode as INode } from '../../modules/nodeState';
import type { InfrastructureNodeType } from '../Nodes/InfrastructureNode';

const nodeTypes = {
  infrastructure: InfrastructureNode,
} as any;

const edgeTypes = {
  network: NetworkEdge,
} as any;

let nodeCounter = 100;

/* ── Suggestion engine for unconnected nodes ── */
const SUGGESTED_CONNECTIONS: Record<string, string[]> = {
  'WebServer': ['AppServer', 'Firewall'],
  'AppServer': ['Database', 'Storage', 'CloudInstance'],
  'Database': ['Storage'],
  'Firewall': ['WebServer', 'AppServer'],
  'CloudInstance': ['Database', 'Storage'],
  'Workstation': ['AppServer', 'WebServer'],
  'Storage': [],
};

interface ConnectionSuggestion {
  sourceId: string;
  targetId: string;
  sourceLabel: string;
  targetLabel: string;
}

const Flow: React.FC = memo(() => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNodeId,
    addNode,
    isSimulating,
    simulationError,
    pendingConnectionNodeId,
    setPendingConnection,
    addEdgeBetween,
  } = useNodeStateStore();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  /* ── Mouse position for click-to-connect preview line ── */
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  /* ── Connection Suggestions ── */
  const suggestions = useMemo<ConnectionSuggestion[]>(() => {
    if (nodes.length < 2 || edges.length > 0) return [];
    const result: ConnectionSuggestion[] = [];
    for (const node of nodes) {
      const nodeType = node.data.type as string;
      const targets = SUGGESTED_CONNECTIONS[nodeType] || [];
      for (const targetType of targets) {
        const targetNode = nodes.find(n => n.data.type === targetType && n.id !== node.id);
        if (targetNode) {
          const alreadySuggested = result.some(
            s => (s.sourceId === node.id && s.targetId === targetNode.id) ||
              (s.sourceId === targetNode.id && s.targetId === node.id)
          );
          if (!alreadySuggested) {
            result.push({
              sourceId: node.id,
              targetId: targetNode.id,
              sourceLabel: node.data.label,
              targetLabel: targetNode.data.label,
            });
          }
        }
      }
    }
    return result.slice(0, 5);
  }, [nodes, edges]);

  /* ── Click-to-connect: node click handler ── */
  const onNodeClick = useCallback((_: React.MouseEvent, node: any) => {
    if (pendingConnectionNodeId) {
      if (pendingConnectionNodeId === node.id) {
        // Cancel: clicked same node
        setPendingConnection(null);
      } else {
        // Create edge
        addEdgeBetween(pendingConnectionNodeId, node.id);
        setPendingConnection(null);
      }
    } else {
      // Start connection mode OR just select
      setPendingConnection(node.id);
      setSelectedNodeId(node.id);
    }
  }, [pendingConnectionNodeId, setPendingConnection, addEdgeBetween, setSelectedNodeId]);

  const onPaneClick = useCallback(() => {
    setPendingConnection(null);
    setSelectedNodeId(null);
  }, [setPendingConnection, setSelectedNodeId]);

  /* ── ESC key to cancel connection ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pendingConnectionNodeId) {
        setPendingConnection(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pendingConnectionNodeId, setPendingConnection]);

  /* ── Track mouse for preview line ── */
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (pendingConnectionNodeId && reactFlowWrapper.current) {
      const rect = reactFlowWrapper.current.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }, [pendingConnectionNodeId]);

  useEffect(() => {
    if (!pendingConnectionNodeId) setMousePos(null);
  }, [pendingConnectionNodeId]);

  /* ── Source node center position for preview line ── */
  const sourceNodeCenter = useMemo(() => {
    if (!pendingConnectionNodeId) return null;
    const node = nodes.find(n => n.id === pendingConnectionNodeId);
    if (!node) return null;
    return { x: node.position.x + 95, y: node.position.y + 50 };
  }, [pendingConnectionNodeId, nodes]);

  /* ── Drag and drop ── */
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();

    const type = event.dataTransfer.getData('application/reactflow-type') as InfrastructureNodeType;
    if (!type) return;

    const label = event.dataTransfer.getData('application/reactflow-label') || type;
    const ports = JSON.parse(event.dataTransfer.getData('application/reactflow-ports') || '[]');
    const privilege = event.dataTransfer.getData('application/reactflow-privilege') || 'Low';
    const criticality = event.dataTransfer.getData('application/reactflow-criticality') || 'Low';
    const assetValue = parseInt(event.dataTransfer.getData('application/reactflow-assetvalue') || '3', 10);

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    nodeCounter++;
    const newNode: INode = {
      id: `node-${nodeCounter}`,
      type: 'infrastructure',
      position,
      data: {
        label: label.toLowerCase().replace(/\s+/g, '_'),
        type,
        ports,
        vulnerabilities: 0,
        status: 'online',
        publicExposure: false,
        privilegeLevel: privilege as 'Low' | 'Medium' | 'High',
        vulnerabilitiesList: [],
        dataCriticality: criticality as 'Low' | 'Medium' | 'High',
        assetValue,
      },
    };

    addNode(newNode);
  }, [screenToFlowPosition, addNode]);

  const defaultEdgeOptions = useMemo(() => ({
    style: { stroke: '#D1D5DB', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#D1D5DB' },
  }), []);

  const connectionLineStyle = useMemo(() => ({
    stroke: '#D1D5DB',
    strokeWidth: 1.5,
    strokeDasharray: '6 3',
  }), []);

  return (
    <div
      ref={reactFlowWrapper}
      className="w-full h-full bg-white relative overflow-hidden"
      onMouseMove={onMouseMove}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[24, 24]}
        colorMode="light"
        style={{ background: '#FFFFFF' }}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineStyle={connectionLineStyle}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineComponent={ConnectionPreview}
        minZoom={0.1}
        maxZoom={2}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#E0E0E0"
        />
        <Controls
          className="!bg-white !border !border-[#E5E5E5] !rounded-lg overflow-hidden !left-4 !bottom-4 !top-auto !shadow-sm"
          showInteractive={false}
          position="bottom-left"
        />
        <MiniMap
          className="!bg-white !border !border-[#E5E5E5] !right-4 !bottom-4 !rounded-lg overflow-hidden !shadow-sm"
          maskColor="rgba(255, 255, 255, 0.7)"
          nodeColor={(n) => {
            if (n.data.compromised) return '#DC2626';
            if (n.data.highlighted) return '#DC2626';
            return '#E5E5E5';
          }}
          zoomable
          pannable
        />

        {/* Simulation Stats HUD */}
        <Panel position="top-right" className="m-4">
          <div className={`px-4 py-3 bg-white border rounded-lg shadow-sm min-w-48 transition-colors ${isSimulating ? 'border-red-200' : 'border-[#E5E5E5]'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Stats</h3>
              {isSimulating && (
                <span className="flex items-center gap-1.5 text-[10px] text-[#DC2626] font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse" /> Running
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[#9CA3AF]">Nodes</span>
                <span className="text-[12px] font-semibold text-[#111] tabular-nums">
                  {nodes.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[#9CA3AF]">Edges</span>
                <span className="text-[12px] font-semibold text-[#111] tabular-nums">
                  {edges.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[#9CA3AF]">Compromised</span>
                <span className={`text-[12px] font-semibold tabular-nums ${nodes.some(n => n.data.compromised) ? 'text-[#DC2626]' : 'text-[#111]'}`}>
                  {nodes.filter(n => n.data.compromised).length}
                </span>
              </div>
            </div>
          </div>
        </Panel>

        {/* Drop hint when canvas is empty */}
        {nodes.length === 0 && (
          <Panel position="top-center" className="mt-40">
            <div className="text-center p-8 border-2 border-dashed border-[#E5E5E5] rounded-xl bg-[#FAFAFA]">
              <div className="text-2xl mb-3">📐</div>
              <p className="text-[13px] font-medium text-[#374151] mb-1">Drag infrastructure nodes here</p>
              <p className="text-[12px] text-[#9CA3AF] max-w-xs">
                Drag nodes from the left panel, connect them, then run the attack simulation.
              </p>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Click-to-connect preview line (SVG overlay) */}
      {pendingConnectionNodeId && mousePos && sourceNodeCenter && (
        <svg
          className="absolute inset-0 pointer-events-none z-[5]"
          width="100%"
          height="100%"
        >
          <line
            x1={sourceNodeCenter.x}
            y1={sourceNodeCenter.y}
            x2={mousePos.x}
            y2={mousePos.y}
            stroke="#9CA3AF"
            strokeWidth="1.5"
            strokeDasharray="6 3"
            opacity="0.6"
          />
          <circle
            cx={mousePos.x}
            cy={mousePos.y}
            r="4"
            fill="#9CA3AF"
            opacity="0.4"
          />
        </svg>
      )}

      {/* Connection mode banner */}
      {pendingConnectionNodeId && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 bg-white border border-[#E5E5E5] rounded-lg px-4 py-2 shadow-sm">
          <p className="text-[11px] text-[#6B7280]">
            Click another node to connect · <span className="text-[#9CA3AF]">ESC to cancel</span>
          </p>
        </div>
      )}

      {/* Connection Suggestions */}
      {suggestions.length > 0 && !pendingConnectionNodeId && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 bg-white border border-[#E5E5E5] rounded-lg px-4 py-3 shadow-sm max-w-sm">
          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide font-semibold mb-2">Suggested Connections</p>
          <div className="space-y-1.5">
            {suggestions.map((s) => (
              <button
                key={`${s.sourceId}-${s.targetId}`}
                onClick={() => addEdgeBetween(s.sourceId, s.targetId)}
                className="flex items-center gap-2 w-full text-left px-2 py-1 rounded hover:bg-[#F3F4F6] transition-colors group"
              >
                <span className="text-[11px] font-mono text-[#374151]">{s.sourceLabel}</span>
                <span className="text-[10px] text-[#D1D5DB] group-hover:text-[#9CA3AF]">→</span>
                <span className="text-[11px] font-mono text-[#374151]">{s.targetLabel}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error toast */}
      {simulationError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 rounded-lg px-5 py-3 shadow-sm">
          <p className="text-[12px] text-[#DC2626] font-medium">{simulationError}</p>
        </div>
      )}

      {/* CSS Overrides for ReactFlow controls */}
      <style jsx global>{`
        .react-flow__handle {
          opacity: 0;
          transition: opacity 0.15s;
        }
        .react-flow__node:hover .react-flow__handle,
        .react-flow__node.selected .react-flow__handle {
          opacity: 1;
        }
        .react-flow__controls button {
          background: #fff !important;
          border-bottom: 1px solid #E5E5E5 !important;
          fill: #9CA3AF !important;
          width: 28px !important;
          height: 28px !important;
        }
        .react-flow__controls button:hover {
          background: #F3F4F6 !important;
          fill: #111 !important;
        }
        .react-flow__attribution {
          display: none;
        }
        .react-flow__edge {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
});

Flow.displayName = 'Flow';

const SimulationWorkspace: React.FC = () => {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
};

export default SimulationWorkspace;
