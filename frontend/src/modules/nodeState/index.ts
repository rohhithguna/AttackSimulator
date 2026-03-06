
import { create } from 'zustand';
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import Dagre from '@dagrejs/dagre';
import { InfrastructureNodeData } from '../../components/Nodes/InfrastructureNode';
import { type Recommendation } from '../defender/recommendationEngine';
import { generateRecommendations, simulateMitigation } from '../defender/DefenderAnalysisEngine';
import { getInfrastructureAttackPaths } from '../defender/pathAnalysis';
import { exportGraphToSimulationJSON, buildNameToIdMap } from '../graphEngine';
import type { SimulationResult } from '../../lib/types';

export interface ExtendedInfrastructureNodeData extends InfrastructureNodeData {
  publicExposure: boolean;
  privilegeLevel: 'Low' | 'Medium' | 'High';
  vulnerabilitiesList: string[];
  dataCriticality: 'Low' | 'Medium' | 'High';
  assetValue?: number;
  highlighted?: boolean;
  compromised?: boolean;
  [key: string]: unknown;
}

export type InfrastructureNode = Node<ExtendedInfrastructureNodeData>;

export interface SimulationResults {
  riskScore: number;
  attackPaths: number;
  estimatedBreachTime: string;
  confidenceScore: number;
  severity?: string;
  exploitProbability?: number;
  monteCarloRate?: number;
}

export interface TimelineStep {
  id: string;
  type: 'Initial Access' | 'Lateral Movement' | 'Privilege Escalation' | 'Target Compromise';
  nodeLabel: string;
  timestamp: string;
  details: string;
}

interface NodeState {
  nodes: InfrastructureNode[];
  edges: Edge[];
  selectedNodeId: string | null;

  // Click-to-connect state
  pendingConnectionNodeId: string | null;

  // Backup for reverting mitigations
  originalNodes: InfrastructureNode[] | null;
  originalEdges: Edge[] | null;
  originalRiskScore: number | null;

  // Simulation State
  isSimulating: boolean;
  simulationResults: SimulationResults | null;
  backendResult: SimulationResult | null;
  attackPath: string[]; // List of node IDs in order
  timeline: TimelineStep[];
  simulationError: string | null;

  // Defender State
  isMitigationActive: boolean;
  recommendations: Recommendation[];

  // Actions
  setNodes: (nodes: InfrastructureNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: InfrastructureNode) => void;

  setSelectedNodeId: (id: string | null) => void;
  updateNodeData: (id: string, data: Partial<ExtendedInfrastructureNodeData>) => void;

  // Click-to-connect actions
  setPendingConnection: (id: string | null) => void;
  addEdgeBetween: (sourceId: string, targetId: string) => void;

  // Simulation Actions
  runSimulation: () => void;
  resetSimulation: () => void;
  generateExample: () => void;
  resetCanvas: () => void;

  // Layout Actions
  autoArrange: () => void;

  // Defender Actions
  applyMitigation: (recommendation: Recommendation) => void;
  revertMitigation: () => void;
}

const initialNodes: InfrastructureNode[] = [
  {
    id: 'node-1',
    type: 'infrastructure',
    position: { x: 100, y: 200 },
    data: {
      label: 'web',
      type: 'WebServer',
      ip: '10.0.0.5',
      ports: ['80', '443', '22'],
      vulnerabilities: 2,
      status: 'online',
      publicExposure: true,
      privilegeLevel: 'Low',
      vulnerabilitiesList: ['CVE-2024-1234', 'CVE-2023-5678'],
      dataCriticality: 'Low',
      assetValue: 3
    }
  },
  {
    id: 'node-2',
    type: 'infrastructure',
    position: { x: 380, y: 100 },
    data: {
      label: 'app',
      type: 'AppServer',
      ip: '10.0.2.10',
      ports: ['8080', '22'],
      vulnerabilities: 1,
      status: 'online',
      publicExposure: false,
      privilegeLevel: 'Medium',
      vulnerabilitiesList: ['CVE-2024-9999'],
      dataCriticality: 'Medium',
      assetValue: 5
    }
  },
  {
    id: 'node-3',
    type: 'infrastructure',
    position: { x: 380, y: 320 },
    data: {
      label: 'db',
      type: 'Database',
      ip: '10.0.5.100',
      ports: ['3306'],
      vulnerabilities: 3,
      status: 'online',
      publicExposure: false,
      privilegeLevel: 'High',
      vulnerabilitiesList: ['CVE-2023-1111', 'CVE-2023-2222', 'CVE-2023-3333'],
      dataCriticality: 'High',
      assetValue: 8
    }
  },
  {
    id: 'node-4',
    type: 'infrastructure',
    position: { x: 660, y: 200 },
    data: {
      label: 'storage',
      type: 'Storage',
      ip: '10.0.6.50',
      ports: ['22'],
      vulnerabilities: 0,
      status: 'online',
      publicExposure: false,
      privilegeLevel: 'High',
      vulnerabilitiesList: [],
      dataCriticality: 'High',
      assetValue: 9
    }
  },
  {
    id: 'node-5',
    type: 'infrastructure',
    position: { x: 940, y: 200 },
    data: {
      label: 'backup',
      type: 'Storage',
      ip: '10.0.7.100',
      ports: [],
      vulnerabilities: 0,
      status: 'online',
      publicExposure: false,
      privilegeLevel: 'High',
      vulnerabilitiesList: [],
      dataCriticality: 'High',
      assetValue: 10
    }
  },
];

const initialEdges: Edge[] = [
  { id: 'edge-1-2', source: 'node-1', target: 'node-2', type: 'network' },
  { id: 'edge-2-3', source: 'node-2', target: 'node-3', type: 'network' },
  { id: 'edge-3-4', source: 'node-3', target: 'node-4', type: 'network' },
  { id: 'edge-4-5', source: 'node-4', target: 'node-5', type: 'network' },
  { id: 'edge-2-4', source: 'node-2', target: 'node-4', type: 'network' },
];

export const useNodeStateStore = create<NodeState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  selectedNodeId: null,

  pendingConnectionNodeId: null,

  originalNodes: null,
  originalEdges: null,
  originalRiskScore: null,

  isSimulating: false,
  simulationResults: null,
  backendResult: null,
  attackPath: [],
  timeline: [],
  simulationError: null,

  isMitigationActive: false,
  recommendations: [],

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes as any) as unknown as InfrastructureNode[],
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    set({
      edges: addEdge({ ...connection, type: 'network' }, get().edges),
    });
  },

  addNode: (node) => {
    set({ nodes: [...get().nodes, node] });
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  setPendingConnection: (id) => set({ pendingConnectionNodeId: id }),

  addEdgeBetween: (sourceId, targetId) => {
    // Validate: no self-loop
    if (sourceId === targetId) return;
    // Validate: no duplicate edge
    const exists = get().edges.some(
      (e) => (e.source === sourceId && e.target === targetId) ||
        (e.source === targetId && e.target === sourceId)
    );
    if (exists) return;
    const newEdge: Edge = {
      id: `edge-${sourceId}-${targetId}-${Date.now()}`,
      source: sourceId,
      target: targetId,
      type: 'network',
    };
    set({ edges: [...get().edges, newEdge] });
  },

  updateNodeData: (id, data) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: { ...node.data, ...data },
          };
        }
        return node;
      }),
    });
  },

  runSimulation: async () => {
    if (get().isSimulating) return;

    const { nodes, edges } = get();

    if (nodes.length < 2) {
      set({ simulationError: 'Add at least 2 nodes to run a simulation.' });
      return;
    }

    // Clear previous results and reset visual state
    set({
      isSimulating: true,
      attackPath: [],
      timeline: [],
      simulationResults: null,
      backendResult: null,
      simulationError: null,
      nodes: nodes.map(n => ({ ...n, data: { ...n.data, highlighted: false, compromised: false } })),
      edges: edges.map(e => ({ ...e, animated: false, style: undefined })),
    });

    try {
      // Serialize graph to backend JSON format
      const architecture = exportGraphToSimulationJSON(get().nodes, get().edges);
      const nameToId = buildNameToIdMap(get().nodes);

      // Call backend API
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          architecture,
          attacker_skill: 1.0,
        }),
      });

      const data = await res.json();

      if (data.error) {
        set({ isSimulating: false, simulationError: data.error });
        return;
      }

      const result = data as SimulationResult;

      // Map backend attack path (server names) to node IDs
      const attackPathIds = (result.primary_path || result.attack_path || [])
        .map((name: string) => nameToId[name])
        .filter(Boolean) as string[];

      // Build timeline from backend attack_steps
      const timeline: TimelineStep[] = (result.attack_steps || []).map((step: any, i: number) => ({
        id: String(i + 1),
        type: i === 0 ? 'Initial Access' as const
          : step.step_type === 'Privilege Escalation' ? 'Privilege Escalation' as const
            : i === (result.attack_steps || []).length - 1 ? 'Target Compromise' as const
              : 'Lateral Movement' as const,
        nodeLabel: step.node || `Step ${i + 1}`,
        timestamp: result.breach_time_data?.breakdown?.[i]
          ? `${result.breach_time_data.breakdown[i].adjusted_minutes}m`
          : `${(i + 1) * 15}m`,
        details: step.vulns?.length > 0
          ? `Exploited ${step.vulns.join(', ')} via ${step.step_type}`
          : `${step.step_type} on ${step.node} (${step.permission} privilege)`,
      }));

      // Animate attack path overlay
      let currentPath: string[] = [];
      attackPathIds.forEach((nodeId, index) => {
        setTimeout(() => {
          currentPath = [...currentPath, nodeId];

          set({
            attackPath: currentPath,
            nodes: get().nodes.map(node => {
              const inPath = currentPath.includes(node.id);
              return {
                ...node,
                data: {
                  ...node.data,
                  highlighted: inPath,
                  compromised: inPath,
                }
              };
            }),
            edges: get().edges.map(edge => ({
              ...edge,
              animated: currentPath.includes(edge.source) && currentPath.includes(edge.target),
              style: currentPath.includes(edge.source) && currentPath.includes(edge.target)
                ? { stroke: '#ef4444', strokeWidth: 3, filter: 'drop-shadow(0 0 8px #ef4444)' }
                : undefined
            }))
          });

          // After last node: set final results
          if (index === attackPathIds.length - 1) {
            const simulationResults: SimulationResults = {
              riskScore: Math.round((result.risk_score || 0) * 10),
              attackPaths: result.paths?.length || 1,
              estimatedBreachTime: result.breach_time || 'N/A',
              confidenceScore: result.confidence_score || 0,
              severity: result.severity,
              exploitProbability: result.exploit_probability,
              monteCarloRate: result.monte_carlo_results?.breach_success_rate,
            };

            const allPaths = getInfrastructureAttackPaths(get().nodes, get().edges);
            const recs = generateRecommendations(get().nodes, get().edges, allPaths.length > 0 ? allPaths : [attackPathIds]);

            set({
              isSimulating: false,
              timeline,
              simulationResults,
              backendResult: result,
              recommendations: recs,
            });
          }
        }, (index + 1) * 600);
      });

      // If no attack path found, still set results
      if (attackPathIds.length === 0) {
        set({
          isSimulating: false,
          simulationResults: {
            riskScore: Math.round((result.risk_score || 0) * 10),
            attackPaths: 0,
            estimatedBreachTime: result.breach_time || 'N/A',
            confidenceScore: result.confidence_score || 0,
            severity: result.severity,
          },
          backendResult: result,
        });
      }

    } catch (err: any) {
      set({
        isSimulating: false,
        simulationError: err.message || 'Simulation failed. Check if the backend is running.',
      });
    }
  },

  resetSimulation: () => {
    set({
      isSimulating: false,
      simulationResults: null,
      backendResult: null,
      attackPath: [],
      timeline: [],
      simulationError: null,
      nodes: get().nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          highlighted: false,
          compromised: false,
        }
      })),
      edges: get().edges.map(edge => ({
        ...edge,
        animated: false,
        style: undefined
      })),
      isMitigationActive: false,
      recommendations: []
    });
  },

  generateExample: () => {
    set({ nodes: initialNodes, edges: initialEdges });
    get().resetSimulation();
  },

  autoArrange: () => {
    const { nodes, edges } = get();
    if (nodes.length === 0) return;
    const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 120 });
    nodes.forEach((node) => g.setNode(node.id, { width: 200, height: 100 }));
    edges.forEach((edge) => g.setEdge(edge.source, edge.target));
    Dagre.layout(g);
    set({
      nodes: nodes.map((node) => {
        const pos = g.node(node.id);
        return { ...node, position: { x: pos.x - 100, y: pos.y - 50 } };
      }),
    });
  },

  resetCanvas: () => {
    set({ nodes: [], edges: [], selectedNodeId: null });
    get().resetSimulation();
  },

  applyMitigation: (recommendation) => {
    if (!get().simulationResults) return;

    // Backup current state if not already active
    if (!get().isMitigationActive) {
      set({
        originalNodes: JSON.parse(JSON.stringify(get().nodes)),
        originalEdges: JSON.parse(JSON.stringify(get().edges)),
        originalRiskScore: get().simulationResults?.riskScore || 0,
      });
    }

    const result = simulateMitigation(
      get().nodes,
      get().edges,
      recommendation,
      get().simulationResults?.riskScore || 0
    );

    set({
      nodes: result.newNodes,
      edges: result.newEdges,
      isMitigationActive: true,
      simulationResults: {
        ...get().simulationResults!,
        riskScore: result.riskAfter
      }
    });
  },

  revertMitigation: () => {
    if (!get().isMitigationActive || !get().originalNodes || !get().originalEdges) return;

    set({
      nodes: get().originalNodes!,
      edges: get().originalEdges!,
      isMitigationActive: false,
      simulationResults: {
        ...get().simulationResults!,
        riskScore: get().originalRiskScore || 0
      },
      originalNodes: null,
      originalEdges: null,
      originalRiskScore: null
    });
  }
}));

export const useNodeStore = useNodeStateStore;
