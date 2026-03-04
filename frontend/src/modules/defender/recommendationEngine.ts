
import { Edge } from '@xyflow/react';
import { InfrastructureNode } from '../nodeState';

export type RecommendationType = 
  | 'PATCH_VULNERABILITY'
  | 'NETWORK_SEGMENTATION'
  | 'PRIVILEGE_RESTRICTION'
  | 'SERVICE_HARDENING'
  | 'ACCESS_CONTROL_FIX';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  description: string;
  affectedNodes: string[];
  affectedEdges?: string[];
  estimatedRiskReduction: number; // 0 to 100
  actionPayload: any;
}

/**
 * Generates recommendations based on the current graph and attack paths.
 */
export const generateRecommendations = (
  nodes: InfrastructureNode[],
  edges: Edge[],
  attackPaths: string[][]
): Recommendation[] => {
  const recommendations: Recommendation[] = [];
  const nodeFrequencies: Record<string, number> = {};

  attackPaths.forEach(path => {
    path.forEach(nodeId => {
      nodeFrequencies[nodeId] = (nodeFrequencies[nodeId] || 0) + 1;
    });
  });

  const pathCount = attackPaths.length;

  nodes.forEach(node => {
    const freq = nodeFrequencies[node.id] || 0;
    if (freq === 0) return;

    // Recommendation for vulnerabilities
    if (node.data.vulnerabilitiesList.length > 0) {
      node.data.vulnerabilitiesList.forEach((vuln, index) => {
        recommendations.push({
          id: `patch_${node.id}_${index}`,
          type: 'PATCH_VULNERABILITY',
          description: `Patch ${node.data.label} ${vuln}`,
          affectedNodes: [node.id],
          estimatedRiskReduction: Math.round((freq / pathCount) * 40 + (index === 0 ? 20 : 10)),
          actionPayload: { nodeId: node.id, vulnerability: vuln }
        });
      });
    }

    // Recommendation for high privilege
    if (node.data.privilegeLevel !== 'Low') {
       recommendations.push({
          id: `priv_${node.id}`,
          type: 'PRIVILEGE_RESTRICTION',
          description: `Restrict privileges on ${node.data.label}`,
          affectedNodes: [node.id],
          estimatedRiskReduction: Math.round((freq / pathCount) * 25),
          actionPayload: { nodeId: node.id, newLevel: 'Low' }
       });
    }

    // Recommendation for segmentation
    // Find edges where this node is source/target in attack paths
    edges.forEach(edge => {
      if (edge.source === node.id || edge.target === node.id) {
         // Check if this edge is likely part of an attack path
         const sourceInPath = nodeFrequencies[edge.source] > 0;
         const targetInPath = nodeFrequencies[edge.target] > 0;
         
         if (sourceInPath && targetInPath) {
           recommendations.push({
             id: `seg_${edge.id}`,
             type: 'NETWORK_SEGMENTATION',
             description: `Isolate ${node.id === edge.source ? 'target' : 'source'} from ${node.data.label}`,
             affectedNodes: [edge.source, edge.target],
             affectedEdges: [edge.id],
             estimatedRiskReduction: Math.round((Math.min(nodeFrequencies[edge.source], nodeFrequencies[edge.target]) / pathCount) * 50),
             actionPayload: { edgeId: edge.id }
           });
         }
      }
    });
  });

  // Deduplicate and sort by risk reduction
  const uniqueRecs = recommendations.filter((v, i, a) => a.findIndex(t => t.description === v.description) === i);
  return uniqueRecs.sort((a, b) => b.estimatedRiskReduction - a.estimatedRiskReduction).slice(0, 5);
};
