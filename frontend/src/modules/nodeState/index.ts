
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
  // New properties for attack path visualization
  isEntry?: boolean;
  isTarget?: boolean;
  attackStep?: number;
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
  nodeId?: string;
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
  simulationDirty: boolean;

  // Playback State
  attackPlaybackStep: number;
  isPlaying: boolean;
  playbackTimerId: ReturnType<typeof setInterval> | null;
  simulationJustFinished: boolean;
  _animationTimeouts?: NodeJS.Timeout[];

  // UI state
  hoveredTimelineNodeId: string | null;

  activeMitigations: Recommendation[];
  recommendations: Recommendation[];

  // Focus Mode State
  focusedAttackPath: string[] | null;
  focusModeEnabled: boolean;
  attackTimelineStep: number | null;

  // View Mode State
  viewMode: 'workspace' | 'report';
  reportTab: 'metrics' | 'paths' | 'timeline' | 'defender' | 'ai';

  // Heatmap State
  heatmapEnabled: boolean;

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
  removeMitigation: (recommendation: Recommendation) => void;
  clearMitigations: () => void;

  setHoveredTimelineNodeId: (id: string | null) => void;
  loadDemoArchitecture: () => void;
  loadDemoScenario: (name: string) => void;

  setFocusedAttackPath: (path: string[]) => void;
  toggleFocusMode: () => void;
  clearFocusedPath: () => void;
  animateAttackPath: (path: string[]) => void;

  toggleHeatmap: () => void;

  // Playback Actions
  startPlayback: () => void;
  pausePlayback: () => void;
  replayPlayback: () => void;
  clearSimulationJustFinished: () => void;

  // View Mode Actions
  setWorkspaceView: () => void;
  setReportView: () => void;
  setReportTab: (tab: 'metrics' | 'paths' | 'timeline' | 'defender' | 'ai') => void;
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

/* ── Predefined Demo Scenarios ────────────────────────────── */

interface DemoScenario {
  name: string;
  description: string;
  nodes: InfrastructureNode[];
  edges: Edge[];
}

export const DEMO_SCENARIOS: Record<string, DemoScenario> = {
  'Public Web Breach': {
    name: 'Public Web Breach',
    description: 'Basic attack path: Internet → Web Server → App Server → Database',
    nodes: [
      {
        id: 'demo-inet', type: 'infrastructure', position: { x: 50, y: 200 },
        data: {
          label: 'internet', type: 'WebServer', ip: '0.0.0.0', ports: ['80', '443'],
          vulnerabilities: 0, status: 'online', publicExposure: true, privilegeLevel: 'Low',
          vulnerabilitiesList: [], dataCriticality: 'Low', assetValue: 1,
        },
      },
      {
        id: 'demo-web', type: 'infrastructure', position: { x: 300, y: 200 },
        data: {
          label: 'web', type: 'WebServer', ip: '10.0.1.10', ports: ['80', '443', '22'],
          vulnerabilities: 2, status: 'online', publicExposure: true, privilegeLevel: 'Low',
          vulnerabilitiesList: ['CVE-2024-1234', 'CVE-2024-5678'], dataCriticality: 'Low', assetValue: 3,
        },
      },
      {
        id: 'demo-app', type: 'infrastructure', position: { x: 550, y: 200 },
        data: {
          label: 'app', type: 'AppServer', ip: '10.0.2.20', ports: ['8080', '22'],
          vulnerabilities: 1, status: 'online', publicExposure: false, privilegeLevel: 'Medium',
          vulnerabilitiesList: ['CVE-2024-9999'], dataCriticality: 'Medium', assetValue: 5,
        },
      },
      {
        id: 'demo-db', type: 'infrastructure', position: { x: 800, y: 200 },
        data: {
          label: 'db', type: 'Database', ip: '10.0.5.100', ports: ['3306'],
          vulnerabilities: 2, status: 'online', publicExposure: false, privilegeLevel: 'High',
          vulnerabilitiesList: ['CVE-2023-1111', 'CVE-2023-2222'], dataCriticality: 'High', assetValue: 9,
        },
      },
    ],
    edges: [
      { id: 'demo-e1', source: 'demo-inet', target: 'demo-web', type: 'network' },
      { id: 'demo-e2', source: 'demo-web', target: 'demo-app', type: 'network' },
      { id: 'demo-e3', source: 'demo-app', target: 'demo-db', type: 'network' },
    ],
  },

  'Zero-Trust Segmented Network': {
    name: 'Zero-Trust Segmented Network',
    description: 'Segmentation prevents lateral movement: Internet → Web only; App → DB isolated',
    nodes: [
      {
        id: 'demo-inet', type: 'infrastructure', position: { x: 50, y: 150 },
        data: {
          label: 'internet', type: 'WebServer', ip: '0.0.0.0', ports: ['80', '443'],
          vulnerabilities: 0, status: 'online', publicExposure: true, privilegeLevel: 'Low',
          vulnerabilitiesList: [], dataCriticality: 'Low', assetValue: 1,
        },
      },
      {
        id: 'demo-web', type: 'infrastructure', position: { x: 300, y: 150 },
        data: {
          label: 'web', type: 'WebServer', ip: '10.0.1.10', ports: ['80', '443'],
          vulnerabilities: 1, status: 'online', publicExposure: true, privilegeLevel: 'Low',
          vulnerabilitiesList: ['CVE-2024-1234'], dataCriticality: 'Low', assetValue: 3,
        },
      },
      {
        id: 'demo-app', type: 'infrastructure', position: { x: 300, y: 350 },
        data: {
          label: 'app', type: 'AppServer', ip: '10.0.2.20', ports: ['8080'],
          vulnerabilities: 0, status: 'online', publicExposure: false, privilegeLevel: 'Medium',
          vulnerabilitiesList: [], dataCriticality: 'Medium', assetValue: 5,
        },
      },
      {
        id: 'demo-db', type: 'infrastructure', position: { x: 550, y: 350 },
        data: {
          label: 'db', type: 'Database', ip: '10.0.5.100', ports: ['5432'],
          vulnerabilities: 0, status: 'online', publicExposure: false, privilegeLevel: 'High',
          vulnerabilitiesList: [], dataCriticality: 'High', assetValue: 9,
        },
      },
    ],
    edges: [
      { id: 'demo-e1', source: 'demo-inet', target: 'demo-web', type: 'network' },
      { id: 'demo-e2', source: 'demo-app', target: 'demo-db', type: 'network' },
    ],
  },

  'Dual Entry Intrusion': {
    name: 'Dual Entry Intrusion',
    description: 'Two attacker entry points: Internet + VPN Gateway',
    nodes: [
      {
        id: 'demo-inet', type: 'infrastructure', position: { x: 50, y: 120 },
        data: {
          label: 'internet', type: 'WebServer', ip: '0.0.0.0', ports: ['80', '443'],
          vulnerabilities: 0, status: 'online', publicExposure: true, privilegeLevel: 'Low',
          vulnerabilitiesList: [], dataCriticality: 'Low', assetValue: 1,
        },
      },
      {
        id: 'demo-web', type: 'infrastructure', position: { x: 300, y: 120 },
        data: {
          label: 'web', type: 'WebServer', ip: '10.0.1.10', ports: ['80', '443', '22'],
          vulnerabilities: 2, status: 'online', publicExposure: true, privilegeLevel: 'Low',
          vulnerabilitiesList: ['CVE-2024-1234', 'CVE-2024-5678'], dataCriticality: 'Low', assetValue: 3,
        },
      },
      {
        id: 'demo-app', type: 'infrastructure', position: { x: 550, y: 120 },
        data: {
          label: 'app', type: 'AppServer', ip: '10.0.2.20', ports: ['8080', '22'],
          vulnerabilities: 1, status: 'online', publicExposure: false, privilegeLevel: 'Medium',
          vulnerabilitiesList: ['CVE-2024-9999'], dataCriticality: 'Medium', assetValue: 5,
        },
      },
      {
        id: 'demo-db', type: 'infrastructure', position: { x: 800, y: 200 },
        data: {
          label: 'db', type: 'Database', ip: '10.0.5.100', ports: ['3306'],
          vulnerabilities: 2, status: 'online', publicExposure: false, privilegeLevel: 'High',
          vulnerabilitiesList: ['CVE-2023-1111', 'CVE-2023-2222'], dataCriticality: 'High', assetValue: 9,
        },
      },
      {
        id: 'demo-vpn', type: 'infrastructure', position: { x: 50, y: 320 },
        data: {
          label: 'vpn_gateway', type: 'WebServer', ip: '10.0.0.1', ports: ['443', '1194'],
          vulnerabilities: 1, status: 'online', publicExposure: true, privilegeLevel: 'Medium',
          vulnerabilitiesList: ['CVE-2024-7777'], dataCriticality: 'Medium', assetValue: 4,
        },
      },
      {
        id: 'demo-storage', type: 'infrastructure', position: { x: 300, y: 320 },
        data: {
          label: 'storage', type: 'Storage', ip: '10.0.6.50', ports: ['22', '445'],
          vulnerabilities: 1, status: 'online', publicExposure: false, privilegeLevel: 'High',
          vulnerabilitiesList: ['CVE-2024-8888'], dataCriticality: 'High', assetValue: 8,
        },
      },
    ],
    edges: [
      { id: 'demo-e1', source: 'demo-inet', target: 'demo-web', type: 'network' },
      { id: 'demo-e2', source: 'demo-web', target: 'demo-app', type: 'network' },
      { id: 'demo-e3', source: 'demo-app', target: 'demo-db', type: 'network' },
      { id: 'demo-e4', source: 'demo-vpn', target: 'demo-storage', type: 'network' },
    ],
  },

  'Exposed Database Crisis': {
    name: 'Exposed Database Crisis',
    description: 'Database directly exposed to Internet — critical misconfiguration',
    nodes: [
      {
        id: 'demo-inet', type: 'infrastructure', position: { x: 50, y: 200 },
        data: {
          label: 'internet', type: 'WebServer', ip: '0.0.0.0', ports: ['80', '443'],
          vulnerabilities: 0, status: 'online', publicExposure: true, privilegeLevel: 'Low',
          vulnerabilitiesList: [], dataCriticality: 'Low', assetValue: 1,
        },
      },
      {
        id: 'demo-web', type: 'infrastructure', position: { x: 300, y: 100 },
        data: {
          label: 'web', type: 'WebServer', ip: '10.0.1.10', ports: ['80', '443', '22'],
          vulnerabilities: 1, status: 'online', publicExposure: true, privilegeLevel: 'Low',
          vulnerabilitiesList: ['CVE-2024-1234'], dataCriticality: 'Low', assetValue: 3,
        },
      },
      {
        id: 'demo-app', type: 'infrastructure', position: { x: 550, y: 100 },
        data: {
          label: 'app', type: 'AppServer', ip: '10.0.2.20', ports: ['8080'],
          vulnerabilities: 1, status: 'online', publicExposure: false, privilegeLevel: 'Medium',
          vulnerabilitiesList: ['CVE-2024-9999'], dataCriticality: 'Medium', assetValue: 5,
        },
      },
      {
        id: 'demo-db', type: 'infrastructure', position: { x: 550, y: 320 },
        data: {
          label: 'db', type: 'Database', ip: '10.0.5.100', ports: ['3306', '5432'],
          vulnerabilities: 3, status: 'online', publicExposure: true, privilegeLevel: 'High',
          vulnerabilitiesList: ['CVE-2023-1111', 'CVE-2023-2222', 'CVE-2023-3333'], dataCriticality: 'High', assetValue: 10,
        },
      },
    ],
    edges: [
      { id: 'demo-e1', source: 'demo-inet', target: 'demo-web', type: 'network' },
      { id: 'demo-e2', source: 'demo-web', target: 'demo-app', type: 'network' },
      { id: 'demo-e3', source: 'demo-app', target: 'demo-db', type: 'network' },
      { id: 'demo-e4', source: 'demo-inet', target: 'demo-db', type: 'network' },
    ],
  },

  'Cloud Microservice Compromise': {
    name: 'Cloud Microservice Compromise',
    description: 'Modern cloud path: Internet → LB → API Gateway → Microservice → Database',
    nodes: [
      {
        id: 'demo-inet', type: 'infrastructure', position: { x: 50, y: 200 },
        data: {
          label: 'internet', type: 'WebServer', ip: '0.0.0.0', ports: ['80', '443'],
          vulnerabilities: 0, status: 'online', publicExposure: true, privilegeLevel: 'Low',
          vulnerabilitiesList: [], dataCriticality: 'Low', assetValue: 1,
        },
      },
      {
        id: 'demo-lb', type: 'infrastructure', position: { x: 250, y: 200 },
        data: {
          label: 'load_balancer', type: 'WebServer', ip: '10.0.0.5', ports: ['80', '443'],
          vulnerabilities: 0, status: 'online', publicExposure: true, privilegeLevel: 'Low',
          vulnerabilitiesList: [], dataCriticality: 'Low', assetValue: 2,
        },
      },
      {
        id: 'demo-apigw', type: 'infrastructure', position: { x: 450, y: 200 },
        data: {
          label: 'api_gateway', type: 'AppServer', ip: '10.0.1.10', ports: ['443', '8443'],
          vulnerabilities: 1, status: 'online', publicExposure: false, privilegeLevel: 'Medium',
          vulnerabilitiesList: ['CVE-2024-4444'], dataCriticality: 'Medium', assetValue: 4,
        },
      },
      {
        id: 'demo-svc', type: 'infrastructure', position: { x: 650, y: 200 },
        data: {
          label: 'microservice', type: 'AppServer', ip: '10.0.2.30', ports: ['8080', '9090'],
          vulnerabilities: 2, status: 'online', publicExposure: false, privilegeLevel: 'Medium',
          vulnerabilitiesList: ['CVE-2024-5555', 'CVE-2024-6666'], dataCriticality: 'Medium', assetValue: 6,
        },
      },
      {
        id: 'demo-db', type: 'infrastructure', position: { x: 850, y: 200 },
        data: {
          label: 'db', type: 'Database', ip: '10.0.5.100', ports: ['5432'],
          vulnerabilities: 1, status: 'online', publicExposure: false, privilegeLevel: 'High',
          vulnerabilitiesList: ['CVE-2023-1111'], dataCriticality: 'High', assetValue: 9,
        },
      },
    ],
    edges: [
      { id: 'demo-e1', source: 'demo-inet', target: 'demo-lb', type: 'network' },
      { id: 'demo-e2', source: 'demo-lb', target: 'demo-apigw', type: 'network' },
      { id: 'demo-e3', source: 'demo-apigw', target: 'demo-svc', type: 'network' },
      { id: 'demo-e4', source: 'demo-svc', target: 'demo-db', type: 'network' },
    ],
  },

  'Insider Workstation Breach': {
    name: 'Insider Workstation Breach',
    description: 'Insider threat: Workstation → App Server → Database → SIEM',
    nodes: [
      {
        id: 'demo-ws', type: 'infrastructure', position: { x: 50, y: 200 },
        data: {
          label: 'workstation', type: 'Workstation', ip: '10.0.10.5', ports: ['3389', '445'],
          vulnerabilities: 1, status: 'online', publicExposure: true, privilegeLevel: 'Low',
          vulnerabilitiesList: ['CVE-2024-2001'], dataCriticality: 'Low', assetValue: 2,
        },
      },
      {
        id: 'demo-app', type: 'infrastructure', position: { x: 300, y: 200 },
        data: {
          label: 'app', type: 'AppServer', ip: '10.0.2.20', ports: ['8080', '22'],
          vulnerabilities: 1, status: 'online', publicExposure: false, privilegeLevel: 'Medium',
          vulnerabilitiesList: ['CVE-2024-9999'], dataCriticality: 'Medium', assetValue: 5,
        },
      },
      {
        id: 'demo-db', type: 'infrastructure', position: { x: 550, y: 200 },
        data: {
          label: 'db', type: 'Database', ip: '10.0.5.100', ports: ['3306'],
          vulnerabilities: 2, status: 'online', publicExposure: false, privilegeLevel: 'High',
          vulnerabilitiesList: ['CVE-2023-1111', 'CVE-2023-2222'], dataCriticality: 'High', assetValue: 9,
        },
      },
      {
        id: 'demo-siem', type: 'infrastructure', position: { x: 800, y: 200 },
        data: {
          label: 'siem', type: 'SIEM', ip: '10.0.8.10', ports: ['514'],
          vulnerabilities: 0, status: 'online', publicExposure: false, privilegeLevel: 'High',
          vulnerabilitiesList: [], dataCriticality: 'High', assetValue: 8,
        },
      },
    ],
    edges: [
      { id: 'demo-e1', source: 'demo-ws', target: 'demo-app', type: 'network' },
      { id: 'demo-e2', source: 'demo-app', target: 'demo-db', type: 'network' },
      { id: 'demo-e3', source: 'demo-db', target: 'demo-siem', type: 'network' },
    ],
  },

  'VPN Lateral Movement': {
    name: 'VPN Lateral Movement',
    description: 'VPN entry with lateral movement: VPN → App → DB → Storage',
    nodes: [
      {
        id: 'demo-vpn', type: 'infrastructure', position: { x: 50, y: 200 },
        data: {
          label: 'vpn_gateway', type: 'VPN', ip: '10.0.0.1', ports: ['443', '1194'],
          vulnerabilities: 1, status: 'online', publicExposure: true, privilegeLevel: 'Medium',
          vulnerabilitiesList: ['CVE-2024-7777'], dataCriticality: 'Medium', assetValue: 4,
        },
      },
      {
        id: 'demo-app', type: 'infrastructure', position: { x: 300, y: 200 },
        data: {
          label: 'app', type: 'AppServer', ip: '10.0.2.20', ports: ['8080', '22'],
          vulnerabilities: 1, status: 'online', publicExposure: false, privilegeLevel: 'Medium',
          vulnerabilitiesList: ['CVE-2024-9999'], dataCriticality: 'Medium', assetValue: 5,
        },
      },
      {
        id: 'demo-db', type: 'infrastructure', position: { x: 550, y: 200 },
        data: {
          label: 'db', type: 'Database', ip: '10.0.5.100', ports: ['5432'],
          vulnerabilities: 1, status: 'online', publicExposure: false, privilegeLevel: 'High',
          vulnerabilitiesList: ['CVE-2023-1111'], dataCriticality: 'High', assetValue: 9,
        },
      },
      {
        id: 'demo-storage', type: 'infrastructure', position: { x: 800, y: 200 },
        data: {
          label: 'storage', type: 'Storage', ip: '10.0.6.50', ports: ['22', '445'],
          vulnerabilities: 0, status: 'online', publicExposure: false, privilegeLevel: 'High',
          vulnerabilitiesList: [], dataCriticality: 'High', assetValue: 8,
        },
      },
    ],
    edges: [
      { id: 'demo-e1', source: 'demo-vpn', target: 'demo-app', type: 'network' },
      { id: 'demo-e2', source: 'demo-app', target: 'demo-db', type: 'network' },
      { id: 'demo-e3', source: 'demo-db', target: 'demo-storage', type: 'network' },
    ],
  },

  'Load Balanced Web Infrastructure': {
    name: 'Load Balanced Web Infrastructure',
    description: 'Internet → Load Balancer → Web → App → Database',
    nodes: [
      {
        id: 'demo-inet', type: 'infrastructure', position: { x: 50, y: 200 },
        data: {
          label: 'internet', type: 'WebServer', ip: '0.0.0.0', ports: ['80', '443'],
          vulnerabilities: 0, status: 'online', publicExposure: true, privilegeLevel: 'Low',
          vulnerabilitiesList: [], dataCriticality: 'Low', assetValue: 1,
        },
      },
      {
        id: 'demo-lb', type: 'infrastructure', position: { x: 250, y: 200 },
        data: {
          label: 'load_balancer', type: 'LoadBalancer', ip: '10.0.0.5', ports: ['80', '443'],
          vulnerabilities: 0, status: 'online', publicExposure: true, privilegeLevel: 'Low',
          vulnerabilitiesList: [], dataCriticality: 'Low', assetValue: 2,
        },
      },
      {
        id: 'demo-web', type: 'infrastructure', position: { x: 450, y: 200 },
        data: {
          label: 'web', type: 'WebServer', ip: '10.0.1.10', ports: ['80', '443', '22'],
          vulnerabilities: 2, status: 'online', publicExposure: false, privilegeLevel: 'Low',
          vulnerabilitiesList: ['CVE-2024-1234', 'CVE-2024-5678'], dataCriticality: 'Low', assetValue: 3,
        },
      },
      {
        id: 'demo-app', type: 'infrastructure', position: { x: 650, y: 200 },
        data: {
          label: 'app', type: 'AppServer', ip: '10.0.2.20', ports: ['8080'],
          vulnerabilities: 1, status: 'online', publicExposure: false, privilegeLevel: 'Medium',
          vulnerabilitiesList: ['CVE-2024-9999'], dataCriticality: 'Medium', assetValue: 5,
        },
      },
      {
        id: 'demo-db', type: 'infrastructure', position: { x: 850, y: 200 },
        data: {
          label: 'db', type: 'Database', ip: '10.0.5.100', ports: ['3306'],
          vulnerabilities: 1, status: 'online', publicExposure: false, privilegeLevel: 'High',
          vulnerabilitiesList: ['CVE-2023-1111'], dataCriticality: 'High', assetValue: 9,
        },
      },
    ],
    edges: [
      { id: 'demo-e1', source: 'demo-inet', target: 'demo-lb', type: 'network' },
      { id: 'demo-e2', source: 'demo-lb', target: 'demo-web', type: 'network' },
      { id: 'demo-e3', source: 'demo-web', target: 'demo-app', type: 'network' },
      { id: 'demo-e4', source: 'demo-app', target: 'demo-db', type: 'network' },
    ],
  },

  'IoT Network Pivot': {
    name: 'IoT Network Pivot',
    description: 'IoT device as entry: IoT → Router → App Server → Database',
    nodes: [
      {
        id: 'demo-iot', type: 'infrastructure', position: { x: 50, y: 200 },
        data: {
          label: 'iot_device', type: 'IoTDevice', ip: '10.0.20.5', ports: ['1883', '80'],
          vulnerabilities: 2, status: 'online', publicExposure: true, privilegeLevel: 'Low',
          vulnerabilitiesList: ['CVE-2024-3001', 'CVE-2024-3002'], dataCriticality: 'Low', assetValue: 1,
        },
      },
      {
        id: 'demo-router', type: 'infrastructure', position: { x: 300, y: 200 },
        data: {
          label: 'router', type: 'Router', ip: '10.0.0.1', ports: ['23', '80'],
          vulnerabilities: 1, status: 'online', publicExposure: false, privilegeLevel: 'Medium',
          vulnerabilitiesList: ['CVE-2024-4001'], dataCriticality: 'Medium', assetValue: 4,
        },
      },
      {
        id: 'demo-app', type: 'infrastructure', position: { x: 550, y: 200 },
        data: {
          label: 'app', type: 'AppServer', ip: '10.0.2.20', ports: ['8080', '22'],
          vulnerabilities: 1, status: 'online', publicExposure: false, privilegeLevel: 'Medium',
          vulnerabilitiesList: ['CVE-2024-9999'], dataCriticality: 'Medium', assetValue: 5,
        },
      },
      {
        id: 'demo-db', type: 'infrastructure', position: { x: 800, y: 200 },
        data: {
          label: 'db', type: 'Database', ip: '10.0.5.100', ports: ['3306'],
          vulnerabilities: 1, status: 'online', publicExposure: false, privilegeLevel: 'High',
          vulnerabilitiesList: ['CVE-2023-1111'], dataCriticality: 'High', assetValue: 9,
        },
      },
    ],
    edges: [
      { id: 'demo-e1', source: 'demo-iot', target: 'demo-router', type: 'network' },
      { id: 'demo-e2', source: 'demo-router', target: 'demo-app', type: 'network' },
      { id: 'demo-e3', source: 'demo-app', target: 'demo-db', type: 'network' },
    ],
  },

  'Monitoring Bypass Attack': {
    name: 'Monitoring Bypass Attack',
    description: 'Attack path with monitoring: Web → App → DB → SIEM, App → IDS',
    nodes: [
      {
        id: 'demo-web', type: 'infrastructure', position: { x: 50, y: 200 },
        data: {
          label: 'web', type: 'WebServer', ip: '10.0.1.10', ports: ['80', '443', '22'],
          vulnerabilities: 2, status: 'online', publicExposure: true, privilegeLevel: 'Low',
          vulnerabilitiesList: ['CVE-2024-1234', 'CVE-2024-5678'], dataCriticality: 'Low', assetValue: 3,
        },
      },
      {
        id: 'demo-app', type: 'infrastructure', position: { x: 300, y: 150 },
        data: {
          label: 'app', type: 'AppServer', ip: '10.0.2.20', ports: ['8080', '22'],
          vulnerabilities: 1, status: 'online', publicExposure: false, privilegeLevel: 'Medium',
          vulnerabilitiesList: ['CVE-2024-9999'], dataCriticality: 'Medium', assetValue: 5,
        },
      },
      {
        id: 'demo-db', type: 'infrastructure', position: { x: 550, y: 150 },
        data: {
          label: 'db', type: 'Database', ip: '10.0.5.100', ports: ['3306'],
          vulnerabilities: 2, status: 'online', publicExposure: false, privilegeLevel: 'High',
          vulnerabilitiesList: ['CVE-2023-1111', 'CVE-2023-2222'], dataCriticality: 'High', assetValue: 9,
        },
      },
      {
        id: 'demo-ids', type: 'infrastructure', position: { x: 300, y: 350 },
        data: {
          label: 'ids_ips', type: 'IDS', ip: '10.0.9.10', ports: [],
          vulnerabilities: 0, status: 'online', publicExposure: false, privilegeLevel: 'High',
          vulnerabilitiesList: [], dataCriticality: 'High', assetValue: 6,
        },
      },
      {
        id: 'demo-siem', type: 'infrastructure', position: { x: 800, y: 150 },
        data: {
          label: 'siem', type: 'SIEM', ip: '10.0.8.10', ports: ['514'],
          vulnerabilities: 0, status: 'online', publicExposure: false, privilegeLevel: 'High',
          vulnerabilitiesList: [], dataCriticality: 'High', assetValue: 8,
        },
      },
    ],
    edges: [
      { id: 'demo-e1', source: 'demo-web', target: 'demo-app', type: 'network' },
      { id: 'demo-e2', source: 'demo-app', target: 'demo-db', type: 'network' },
      { id: 'demo-e3', source: 'demo-db', target: 'demo-siem', type: 'network' },
      { id: 'demo-e4', source: 'demo-app', target: 'demo-ids', type: 'network' },
    ],
  },
};

export const DEMO_SCENARIO_NAMES = Object.keys(DEMO_SCENARIOS);

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
  simulationDirty: false,

  attackPlaybackStep: -1,
  isPlaying: false,
  playbackTimerId: null,
  simulationJustFinished: false,
  hoveredTimelineNodeId: null,

  activeMitigations: [],
  recommendations: [],

  focusedAttackPath: null,
  focusModeEnabled: false,
  attackTimelineStep: null,

  viewMode: 'workspace',
  reportTab: 'metrics',

  heatmapEnabled: false,

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

  setFocusedAttackPath: (path) => set({ focusedAttackPath: path, focusModeEnabled: true, attackTimelineStep: null }),
  toggleFocusMode: () => set((state) => {
    if (!state.focusModeEnabled && state.focusedAttackPath === null && state.backendResult?.paths?.length) {
      // Auto-select top path if enabling focus mode without one
      return { focusModeEnabled: true, focusedAttackPath: state.backendResult.paths[0] };
    }
    return { focusModeEnabled: !state.focusModeEnabled };
  }),
  clearFocusedPath: () => set({ focusedAttackPath: null, focusModeEnabled: false, attackTimelineStep: null }),
  animateAttackPath: (path) => {
    set({ focusedAttackPath: path, focusModeEnabled: true, attackTimelineStep: 0 });
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= path.length) {
        clearInterval(interval);
      } else {
        useNodeStateStore.setState({ attackTimelineStep: step });
      }
    }, 600);
  },

  toggleHeatmap: () => set((state) => ({ heatmapEnabled: !state.heatmapEnabled })),

  startPlayback: () => {
    const { attackPath, isPlaying, playbackTimerId, attackPlaybackStep } = get();
    if (attackPath.length === 0 || isPlaying) return;

    // If already at the end, start from beginning
    const startStep = attackPlaybackStep >= attackPath.length - 1 ? 0 : attackPlaybackStep + 1;
    set({ attackPlaybackStep: startStep === 0 ? 0 : attackPlaybackStep, isPlaying: true });

    let step = startStep;
    if (startStep === 0) {
      set({ attackPlaybackStep: 0 });
      step = 1;
    }

    const timer = setInterval(() => {
      const { attackPath: currentPath } = get();
      if (step >= currentPath.length) {
        clearInterval(timer);
        useNodeStateStore.setState({ isPlaying: false, playbackTimerId: null });
        return;
      }
      useNodeStateStore.setState({ attackPlaybackStep: step });
      step++;
    }, 600);

    set({ playbackTimerId: timer });
  },

  pausePlayback: () => {
    const { playbackTimerId } = get();
    if (playbackTimerId) {
      clearInterval(playbackTimerId);
    }
    set({ isPlaying: false, playbackTimerId: null });
  },

  replayPlayback: () => {
    const { playbackTimerId } = get();
    if (playbackTimerId) {
      clearInterval(playbackTimerId);
    }
    set({ attackPlaybackStep: -1, isPlaying: false, playbackTimerId: null });
    // Start fresh after a small delay
    setTimeout(() => {
      get().startPlayback();
    }, 50);
  },

  clearSimulationJustFinished: () => set({ simulationJustFinished: false }),

  setWorkspaceView: () => set({ viewMode: 'workspace' }),
  setReportView: () => set({ viewMode: 'report' }),
  setReportTab: (tab) => set({ reportTab: tab }),

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

  setHoveredTimelineNodeId: (id) => set({ hoveredTimelineNodeId: id }),

  runSimulation: async () => {
    if (get().isSimulating) return;

    const { nodes, edges } = get();

    if (nodes.length < 2) {
      set({ simulationError: 'Add at least 2 nodes to run a simulation.' });
      return;
    }

    if (edges.length === 0) {
      set({ simulationError: 'Add at least 1 connection between nodes to run a simulation.' });
      return;
    }

    const hasPublicFacing = nodes.some(n => n.data.publicExposure === true);
    if (!hasPublicFacing) {
      set({ simulationError: 'At least one node must be public-facing to simulate an attack entry point.' });
      return;
    }

    // Clear previous results and reset visual state
    set({
      isSimulating: true,
      attackPath: [],
      timeline: [],
      simulationResults: null,
      backendResult: null,
      simulationDirty: false,
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

      // Instead of ignoring HTTP status codes, check ok first
      if (!res.ok) {
        let errorMsg = `Server error: ${res.status}`;
        try {
          const errData = await res.json();
          if (errData.error) errorMsg = errData.error;
        } catch (_) { }
        set({ isSimulating: false, simulationError: errorMsg });
        return;
      }

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
        nodeId: step.node ? nameToId[step.node] : undefined,
        timestamp: result.breach_time_data?.breakdown?.[i]
          ? `${result.breach_time_data.breakdown[i].adjusted_minutes}m`
          : `${(i + 1) * 15}m`,
        details: step.vulns?.length > 0
          ? `Exploited ${step.vulns.join(', ')} via ${step.step_type}`
          : `${step.step_type} on ${step.node} (${step.permission} privilege)`,
      }));

      // Tracking timeouts to clear them if simulation resets
      const animationTimeouts: NodeJS.Timeout[] = [];

      // Animate attack path overlay
      let currentPath: string[] = [];
      attackPathIds.forEach((nodeId, index) => {
        const t = setTimeout(() => {
          currentPath = [...currentPath, nodeId];

          set({
            attackPath: currentPath,
            nodes: get().nodes.map(node => {
              const inPath = currentPath.includes(node.id);
              const stepIndex = currentPath.indexOf(node.id);
              return {
                ...node,
                data: {
                  ...node.data,
                  highlighted: inPath,
                  compromised: inPath,
                  isEntry: inPath && node.id === attackPathIds[0],
                  isTarget: inPath && node.id === attackPathIds[attackPathIds.length - 1],
                  attackStep: inPath ? stepIndex + 1 : undefined,
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
              simulationJustFinished: true,
            });

            const rt = setTimeout(() => {
              if (get().viewMode !== 'report') {
                set({ viewMode: 'report', reportTab: 'metrics' });
              }
            }, 5000);
            get()._animationTimeouts?.push(rt);
          }
        }, (index + 1) * 600);
        animationTimeouts.push(t);
      });

      // Save to store so resetSimulation can access them
      set({ _animationTimeouts: animationTimeouts });

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

        const defaultPathTimeout = setTimeout(() => {
          if (get().viewMode !== 'report') {
            set({ viewMode: 'report', reportTab: 'metrics' });
          }
        }, 5000);
        set({ _animationTimeouts: [defaultPathTimeout] });
      }

    } catch (err: any) {
      set({
        isSimulating: false,
        simulationError: err.message || 'Simulation failed. Check if the backend is running.',
      });
    }
  },

  resetSimulation: () => {
    const { playbackTimerId, _animationTimeouts } = get();
    if (playbackTimerId) clearInterval(playbackTimerId);
    if (_animationTimeouts) {
      _animationTimeouts.forEach(t => clearTimeout(t));
    }
    set({
      isSimulating: false,
      simulationResults: null,
      backendResult: null,
      attackPath: [],
      timeline: [],
      simulationError: null,
      attackPlaybackStep: -1,
      isPlaying: false,
      playbackTimerId: null,
      simulationJustFinished: false,
      nodes: get().nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          highlighted: false,
          compromised: false,
          isEntry: false,
          isTarget: false,
          attackStep: undefined,
        }
      })),
      edges: get().edges.map(edge => ({
        ...edge,
        animated: false,
        style: undefined
      })),
      activeMitigations: [],
      recommendations: [],
      originalNodes: null,
      originalEdges: null,
      originalRiskScore: null,
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
    nodes.forEach((node) => g.setNode(node.id, { width: 220, height: 120 }));
    edges.forEach((edge) => g.setEdge(edge.source, edge.target));
    Dagre.layout(g);
    set({
      nodes: nodes.map((node) => {
        const pos = g.node(node.id);
        return { ...node, position: { x: pos.x - 110, y: pos.y - 60 } };
      }),
    });
  },

  loadDemoArchitecture: () => {
    set({ nodes: initialNodes, edges: initialEdges });
    get().resetSimulation();
    get().autoArrange();
  },

  loadDemoScenario: (name: string) => {
    const scenario = DEMO_SCENARIOS[name];
    if (!scenario) {
      console.warn(`[loadDemoScenario] Unknown scenario: "${name}". Available: ${DEMO_SCENARIO_NAMES.join(', ')}`);
      return;
    }

    // Deep-clone to avoid mutating the definitions
    const scenarioNodes = JSON.parse(JSON.stringify(scenario.nodes)) as InfrastructureNode[];
    const scenarioEdges = JSON.parse(JSON.stringify(scenario.edges)) as Edge[];

    // Reset graph and simulation state, then load scenario
    set({
      nodes: scenarioNodes,
      edges: scenarioEdges,
      selectedNodeId: null,
    });
    get().resetSimulation();
    get().autoArrange();
  },

  resetCanvas: () => {
    set({ nodes: [], edges: [], selectedNodeId: null });
    get().resetSimulation();
  },

  applyMitigation: (recommendation) => {
    if (!get().simulationResults) return;

    // Backup current state if not already active
    if (get().activeMitigations.length === 0) {
      set({
        originalNodes: JSON.parse(JSON.stringify(get().nodes)),
        originalEdges: JSON.parse(JSON.stringify(get().edges)),
        originalRiskScore: get().simulationResults?.riskScore || 0,
      });
    }

    // Check if already applied
    if (get().activeMitigations.some(m => m.id === recommendation.id)) return;

    const newMitigations = [...get().activeMitigations, recommendation];

    const result = simulateMitigation(
      get().originalNodes || get().nodes,
      get().originalEdges || get().edges,
      newMitigations,
      get().originalRiskScore || get().simulationResults?.riskScore || 0
    );

    set({
      nodes: result.newNodes,
      edges: result.newEdges,
      activeMitigations: newMitigations,
      simulationResults: null,
      backendResult: null,
      attackPath: [],
      simulationDirty: true,
    });
  },

  removeMitigation: (recommendation) => {
    if (get().activeMitigations.length === 0 || !get().originalNodes || !get().originalEdges) return;

    const newMitigations = get().activeMitigations.filter(m => m.id !== recommendation.id);

    if (newMitigations.length === 0) {
      get().clearMitigations();
      return;
    }

    const result = simulateMitigation(
      get().originalNodes!,
      get().originalEdges!,
      newMitigations,
      get().originalRiskScore || get().simulationResults?.riskScore || 0
    );

    set({
      nodes: result.newNodes,
      edges: result.newEdges,
      activeMitigations: newMitigations,
      simulationResults: null,
      backendResult: null,
      attackPath: [],
      simulationDirty: true,
    });
  },

  clearMitigations: () => {
    if (get().activeMitigations.length === 0 || !get().originalNodes || !get().originalEdges) return;

    set({
      nodes: get().originalNodes!,
      edges: get().originalEdges!,
      activeMitigations: [],
      simulationResults: null,
      backendResult: null,
      attackPath: [],
      originalNodes: null,
      originalEdges: null,
      originalRiskScore: null,
      simulationDirty: true,
    });
  }
}));

export const useNodeStore = useNodeStateStore;
