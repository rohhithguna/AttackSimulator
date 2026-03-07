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
import type { InfrastructureNodeType, InfrastructureNodeData } from '../Nodes/InfrastructureNode';
import { calculateNodeRiskCategory } from '../../utils/calculateNodeRisk';

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
    selectedNodeId,
    setSelectedNodeId,
    addNode,
    isSimulating,
    simulationError,
    pendingConnectionNodeId,
    setPendingConnection,
    addEdgeBetween,
    backendResult,
    autoArrange,
    focusModeEnabled,
    focusedAttackPath,
    attackTimelineStep,
    heatmapEnabled,
    attackPath,
    attackPlaybackStep,
    isPlaying,
    simulationJustFinished,
    startPlayback,
    clearSimulationJustFinished,
    reportTab,
    viewMode,
  } = useNodeStateStore();

  // Auto-play once when simulation finishes
  useEffect(() => {
    if (simulationJustFinished && attackPath.length > 0) {
      clearSimulationJustFinished();
      // Small delay to let the UI settle
      const t = setTimeout(() => {
        startPlayback();
      }, 800);
      return () => clearTimeout(t);
    }
  }, [simulationJustFinished, attackPath.length, clearSimulationJustFinished, startPlayback]);

  const riskStats = useMemo(() => {
    let high = 0;
    let critical = 0;
    if (heatmapEnabled) {
      nodes.forEach(n => {
        const risk = calculateNodeRiskCategory(n.data as any);
        if (risk === 'HIGH') high++;
        if (risk === 'CRITICAL') critical++;
      });
    }
    return { high, critical };
  }, [nodes, heatmapEnabled]);

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

  /* ── Keyboard Shortcuts ── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.key === 'a' || e.key === 'A') {
        autoArrange();
      } else if ((e.key === 'c' || e.key === 'C') && selectedNodeId) {
        setPendingConnection(selectedNodeId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [autoArrange, selectedNodeId, setPendingConnection]);

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
    style: { stroke: '#D1D5DB', strokeWidth: 1.5, transition: 'all 0.3s ease' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#D1D5DB' },
  }), []);

  const connectionLineStyle = useMemo(() => ({
    stroke: '#D1D5DB',
    strokeWidth: 1.5,
    strokeDasharray: '6 3',
    transition: 'all 0.3s ease'
  }), []);

  const renderedNodes = useMemo(() => {
    if (!focusModeEnabled || !focusedAttackPath) return nodes;

    return nodes.map((node) => {
      const isPathNode = focusedAttackPath.includes(node.id);

      let opacity = 0.3;
      if (isPathNode) {
        if (attackTimelineStep === null) {
          opacity = 1;
        } else {
          const pathIndex = focusedAttackPath.indexOf(node.id);
          opacity = pathIndex <= attackTimelineStep ? 1 : 0.3;
        }
      }

      return {
        ...node,
        style: {
          ...node.style,
          opacity,
          transition: 'opacity 0.3s ease',
        },
      };
    });
  }, [nodes, focusModeEnabled, focusedAttackPath, attackTimelineStep]);

  const renderedEdges = useMemo(() => {
    return edges.map((edge) => {
      let label: string | undefined = undefined;

      if (backendResult?.attack_timeline) {
        const tlStep = backendResult.attack_timeline.find((t: any) => t.node === edge.target);
        if (tlStep && tlStep.success_probability !== undefined) {
          label = `${Math.round(tlStep.success_probability * 100)}%`;
        }
      } else if (backendResult?.attack_steps) {
        const step = backendResult.attack_steps.find((s: any) => s.node === edge.target);
        if (step && (step as any).success_probability) {
          label = `${Math.round((step as any).success_probability * 100)}%`;
        }
      }

      // Playback-aware edge rendering
      if (attackPlaybackStep >= 0 && attackPath.length > 0) {
        const sourcePathIdx = attackPath.indexOf(edge.source);
        const targetPathIdx = attackPath.indexOf(edge.target);
        const isPlaybackEdge = sourcePathIdx !== -1 && targetPathIdx !== -1 && targetPathIdx === sourcePathIdx + 1;
        const isReachedEdge = isPlaybackEdge && targetPathIdx <= attackPlaybackStep;
        const isCurrentEdge = isPlaybackEdge && targetPathIdx === attackPlaybackStep;

        return {
          ...edge,
          label,
          labelBgStyle: { fill: '#fff', fillOpacity: 0.9, color: '#111' },
          labelStyle: { fill: '#111', fontWeight: 600, fontSize: 10 },
          data: {
            ...edge.data,
            playbackActive: isCurrentEdge,
          },
          style: {
            ...edge.style,
            stroke: isReachedEdge ? '#DC2626' : '#D1D5DB',
            strokeWidth: isReachedEdge ? 3 : 1.5,
            opacity: isPlaybackEdge ? (isReachedEdge ? 1 : 0.3) : 0.2,
            filter: isCurrentEdge ? 'drop-shadow(0 0 8px rgba(220,38,38,0.5))' : undefined,
            transition: 'all 0.3s ease',
          },
        };
      }

      if (!focusModeEnabled || !focusedAttackPath) {
        return {
          ...edge,
          label,
          labelBgStyle: { fill: '#fff', fillOpacity: 0.9, color: '#111' },
          labelStyle: { fill: '#111', fontWeight: 600, fontSize: 10 }
        };
      }

      const sourceIdx = focusedAttackPath.indexOf(edge.source);
      const targetIdx = focusedAttackPath.indexOf(edge.target);
      const isPathEdge = sourceIdx !== -1 && targetIdx !== -1 && targetIdx === sourceIdx + 1;

      let opacity = 0.2;
      let strokeWidth = 1.5;
      let stroke = '#D1D5DB';

      if (isPathEdge) {
        if (attackTimelineStep === null) {
          opacity = 1;
          strokeWidth = 3;
          stroke = '#111';
        } else {
          opacity = targetIdx <= attackTimelineStep ? 1 : 0.2;
          strokeWidth = targetIdx <= attackTimelineStep ? 3 : 1.5;
          stroke = targetIdx <= attackTimelineStep ? '#111' : '#D1D5DB';
        }
      }

      return {
        ...edge,
        label,
        labelBgStyle: { fill: '#fff', fillOpacity: 0.9, color: '#111' },
        labelStyle: { fill: '#111', fontWeight: 600, fontSize: 10 },
        style: {
          ...edge.style,
          stroke,
          opacity,
          strokeWidth,
          transition: 'all 0.3s ease',
        },
      };
    });
  }, [edges, focusModeEnabled, focusedAttackPath, attackTimelineStep, backendResult, attackPlaybackStep, attackPath]);

  return (
    <div
      ref={reactFlowWrapper}
      className="w-full h-full bg-white relative overflow-hidden"
      onMouseMove={onMouseMove}
    >
      <ReactFlow
        nodes={renderedNodes}
        edges={renderedEdges}
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
        {reportTab !== 'ai' && (
          <>
            <MiniMap
              className="!bg-white !border !border-[#E5E5E5] !right-4 !bottom-4 !rounded-lg overflow-hidden !shadow-sm"
              maskColor="rgba(255, 255, 255, 0.7)"
              nodeColor={(n: any) => {
                if (n.data.isEntry) return '#10B981';
                if (n.data.isTarget) return '#991B1B';
                if (n.data.compromised) return '#DC2626';
                if (n.data.highlighted) return '#DC2626';
                return '#E5E5E5';
              }}
              zoomable
              pannable
            />
          </>
        )}

        {/* Simulation Stats HUD */}
        {reportTab !== 'ai' && (
          <Panel position="top-right" style={{ right: '16px', margin: 0, top: '48px' }}>
            <div
              className={`px-4 py-3 min-w-48 transition-colors ${isSimulating ? 'border-red-200' : ''}`}
              style={{
                borderRadius: '18px',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(3px)',
                background: 'rgba(255,255,255,0.02)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                border: isSimulating ? '1px solid rgba(220,38,38,0.2)' : '1px solid rgba(255,255,255,0.35)',
              }}
            >
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
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-[#9CA3AF]">Entry Points</span>
                  <span className="text-[12px] font-semibold text-[#111] tabular-nums">
                    {nodes.filter((n: any) => n.data.publicExposure).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-[#9CA3AF]">Critical Assets</span>
                  <span className="text-[12px] font-semibold text-[#111] tabular-nums">
                    {nodes.filter((n: any) => (n.data as any).assetValue >= 8).length}
                  </span>
                </div>

                {heatmapEnabled && (
                  <div className="pt-2 mt-2 border-t border-[#E5E5E5] space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-[#9CA3AF]">High Risk Nodes</span>
                      <span className="text-[12px] font-semibold text-[#111] tabular-nums">
                        {riskStats.high}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-[#9CA3AF]">Critical Nodes</span>
                      <span className="text-[12px] font-semibold text-[#111] tabular-nums">
                        {riskStats.critical}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {edges.length < nodes.length - 1 && nodes.length > 1 && (
                <div className="mt-3 pt-2 border-t border-[#E5E5E5]">
                  <p className="text-[11px] font-medium text-[#111]">Network may be disconnected</p>
                </div>
              )}
            </div>
          </Panel>
        )}

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

      {/* Simulation Summary Banner restored specifically for Workspace tab */}
      {!isSimulating && backendResult?.primary_path && backendResult.primary_path.length > 0 && viewMode === 'workspace' && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-40 text-center animate-in fade-in slide-in-from-top-4 duration-500 pointer-events-none"
          style={{
            top: '52px',
            padding: '10px 18px',
            borderRadius: '18px',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(3px)',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.35)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            minWidth: '280px',
            maxWidth: '460px'
          }}
        >
          <p className="text-[13px] font-semibold text-[#111] mb-1">
            Attack path discovered from <span className="text-[#10B981] font-mono mx-1">{backendResult.primary_path[0]}</span> to <span className="text-[#991B1B] font-mono mx-1">{backendResult.primary_path[backendResult.primary_path.length - 1]}</span>
          </p>
          <div className="flex items-center justify-center gap-2 text-[11px] text-[#6B7280]">
            <span>{backendResult.primary_path.length}-step compromise chain</span>
            <span>·</span>
            <span>Estimated breach time: {backendResult.breach_time || 'N/A'}</span>
          </div>
        </div>
      )}

      {/* CSS Overrides for ReactFlow controls + Playback animations */}
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

        /* Playback Entry Node Pulse */
        .playback-entry-pulse {
          animation: entryPulse 1.5s ease-in-out infinite;
        }
        @keyframes entryPulse {
          0%, 100% {
            box-shadow: 0 0 8px rgba(220, 38, 38, 0.3), 0 0 20px rgba(220, 38, 38, 0.1);
          }
          50% {
            box-shadow: 0 0 16px rgba(220, 38, 38, 0.5), 0 0 32px rgba(220, 38, 38, 0.2);
          }
        }

        /* Playback Target Node Strong Pulse */
        .playback-target-pulse {
          animation: targetPulse 1s ease-in-out infinite;
        }
        @keyframes targetPulse {
          0%, 100% {
            box-shadow: 0 0 12px rgba(220, 38, 38, 0.4), 0 0 30px rgba(220, 38, 38, 0.15);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 24px rgba(220, 38, 38, 0.6), 0 0 48px rgba(220, 38, 38, 0.25);
            transform: scale(1.02);
          }
        }

        /* Playback Intermediate Node */
        .playback-intermediate {
          border-color: #DC2626 !important;
        }

        /* Playback Step Badge Bounce */
        .playback-step-badge {
          animation: stepBadgeBounce 0.4s ease-out;
        }
        @keyframes stepBadgeBounce {
          0% { transform: translateX(-50%) scale(0.5) translateY(-8px); opacity: 0; }
          60% { transform: translateX(-50%) scale(1.1) translateY(0); opacity: 1; }
          100% { transform: translateX(-50%) scale(1) translateY(0); opacity: 1; }
        }

        /* Edge flow animation */
        .playback-edge-flow {
          animation: edgeDashFlow 0.6s linear infinite;
        }
        @keyframes edgeDashFlow {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -20; }
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
