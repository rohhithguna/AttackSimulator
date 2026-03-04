
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
import { InfrastructureNodeData } from '../../components/Nodes/InfrastructureNode';
import { Recommendation, generateRecommendations, simulateMitigation } from '../defender/DefenderAnalysisEngine';
import { getInfrastructureAttackPaths } from '../defender/pathAnalysis';

export interface ExtendedInfrastructureNodeData extends InfrastructureNodeData {
  publicExposure: boolean;
  privilegeLevel: 'Low' | 'Medium' | 'High';
  vulnerabilitiesList: string[];
  dataCriticality: 'Low' | 'Medium' | 'High';
  highlighted?: boolean;
  compromised?: boolean;
}

export type InfrastructureNode = Node<ExtendedInfrastructureNodeData>;

export interface SimulationResults {
  riskScore: number;
  attackPaths: number;
  estimatedBreachTime: string;
  confidenceScore: number;
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
  
  // Backup for reverting mitigations
  originalNodes: InfrastructureNode[] | null;
  originalEdges: Edge[] | null;
  originalRiskScore: number | null;
  
  // Simulation State
  isSimulating: boolean;
  simulationResults: SimulationResults | null;
  attackPath: string[]; // List of node IDs in order
  timeline: TimelineStep[];
  
  // Defender State
  isMitigationActive: boolean;
  recommendations: Recommendation[];
  
  // Actions
  setNodes: (nodes: InfrastructureNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  
  setSelectedNodeId: (id: string | null) => void;
  updateNodeData: (id: string, data: Partial<ExtendedInfrastructureNodeData>) => void;
  
  // Simulation Actions
  runSimulation: () => void;
  resetSimulation: () => void;
  generateExample: () => void;
  resetCanvas: () => void;
  
  // Defender Actions
  applyMitigation: (recommendation: Recommendation) => void;
  revertMitigation: () => void;
}

const initialNodes: InfrastructureNode[] = [
  { 
    id: 'node-1', 
    type: 'infrastructure', 
    position: { x: 50, y: 150 }, 
    data: { 
      label: 'DMZ Firewall', 
      type: 'Firewall', 
      ip: '10.0.0.1', 
      ports: ['80', '443', '22'],
      vulnerabilities: 0,
      status: 'online',
      publicExposure: true,
      privilegeLevel: 'High',
      vulnerabilitiesList: [],
      dataCriticality: 'Low'
    } 
  },
  { 
    id: 'node-2', 
    type: 'infrastructure', 
    position: { x: 300, y: 50 }, 
    data: { 
      label: 'Public WebServer', 
      type: 'WebServer', 
      ip: '10.0.0.5', 
      ports: ['80', '443'],
      vulnerabilities: 2,
      status: 'online',
      publicExposure: true,
      privilegeLevel: 'Low',
      vulnerabilitiesList: ['CVE-2024-1234', 'CVE-2023-5678'],
      dataCriticality: 'Medium'
    } 
  },
  { 
    id: 'node-3', 
    type: 'infrastructure', 
    position: { x: 300, y: 250 }, 
    data: { 
      label: 'Application Server', 
      type: 'AppServer', 
      ip: '10.0.2.10', 
      ports: ['8080', '8443'],
      vulnerabilities: 1,
      status: 'online',
      publicExposure: false,
      privilegeLevel: 'Medium',
      vulnerabilitiesList: ['CVE-2024-9999'],
      dataCriticality: 'High'
    } 
  },
  { 
    id: 'node-4', 
    type: 'infrastructure', 
    position: { x: 550, y: 150 }, 
    data: { 
      label: 'Production DB', 
      type: 'Database', 
      ip: '10.0.5.100', 
      ports: ['5432'],
      vulnerabilities: 3,
      status: 'online',
      publicExposure: false,
      privilegeLevel: 'High',
      vulnerabilitiesList: ['CVE-2023-1111', 'CVE-2023-2222', 'CVE-2023-3333'],
      dataCriticality: 'High'
    } 
  },
];

const initialEdges: Edge[] = [
  { 
    id: 'edge-1-2', 
    source: 'node-1', 
    target: 'node-2', 
    type: 'network',
    data: { label: 'ALLOW' },
    animated: true,
  },
  { 
    id: 'edge-1-3', 
    source: 'node-1', 
    target: 'node-3', 
    type: 'network',
    data: { label: 'ALLOW' },
  },
  { 
    id: 'edge-2-3', 
    source: 'node-2', 
    target: 'node-3', 
    type: 'network',
    animated: true,
  },
  { 
    id: 'edge-3-4', 
    source: 'node-3', 
    target: 'node-4', 
    type: 'network',
    animated: true,
  },
];

export const useNodeStateStore = create<NodeState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  selectedNodeId: null,
  
  originalNodes: null,
  originalEdges: null,
  originalRiskScore: null,
  
  isSimulating: false,
  simulationResults: null,
  attackPath: [],
  timeline: [],
  
  isMitigationActive: false,
  recommendations: [],

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as InfrastructureNode[],
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
  
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  
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

  runSimulation: () => {
    if (get().isSimulating) return;
    
    // Clear previous results
    set({ 
      isSimulating: true, 
      attackPath: [], 
      timeline: [], 
      simulationResults: null,
      nodes: get().nodes.map(n => ({ ...n, data: { ...n.data, highlighted: false, compromised: false } }))
    });

    const allPaths = getInfrastructureAttackPaths(get().nodes, get().edges);
    const pathIds = allPaths.length > 0 ? allPaths[0] : ['node-1', 'node-2', 'node-3', 'node-4'];

    const timeline: TimelineStep[] = [
      { id: '1', type: 'Initial Access', nodeLabel: 'DMZ Firewall', timestamp: '0s', details: 'Exploited open SSH port via brute force.' },
      { id: '2', type: 'Lateral Movement', nodeLabel: 'Public WebServer', timestamp: '12s', details: 'Pivoted using compromised credentials found on Firewall.' },
      { id: '3', type: 'Privilege Escalation', nodeLabel: 'Application Server', timestamp: '45s', details: 'Exploited CVE-2024-9999 to gain admin rights.' },
      { id: '4', type: 'Target Compromise', nodeLabel: 'Production DB', timestamp: '1m 20s', details: 'Exfiltrated sensitive customer data via SQL injection.' },
    ];

    let currentPath: string[] = [];
    
    pathIds.forEach((nodeId, index) => {
      setTimeout(() => {
        currentPath = [...currentPath, nodeId];
        
        set({
          attackPath: currentPath,
          nodes: get().nodes.map(node => {
            const isLatest = nodeId === node.id;
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
              ? { stroke: '#fff', strokeWidth: 3, filter: 'drop-shadow(0 0 8px #fff)' } 
              : edge.style
          }))
        });

        if (index === pathIds.length - 1) {
          const results = {
            riskScore: 88,
            attackPaths: allPaths.length || 1,
            estimatedBreachTime: '1m 20s',
            confidenceScore: 94
          };
          
          const recs = generateRecommendations(get().nodes, get().edges, allPaths.length > 0 ? allPaths : [pathIds]);
          
          set({
            isSimulating: false,
            timeline,
            simulationResults: results,
            recommendations: recs
          });
        }
      }, (index + 1) * 800);
    });
  },

  resetSimulation: () => {
    set({
      isSimulating: false,
      simulationResults: null,
      attackPath: [],
      timeline: [],
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
