
import { Edge } from '@xyflow/react';
import { InfrastructureNode } from '../nodeState';
import { Recommendation } from './recommendationEngine';
import { getInfrastructureAttackPaths } from './pathAnalysis';

export interface MitigationResult {
  riskBefore: number;
  riskAfter: number;
  riskReduction: number;
  pathDelta: number;
  newNodes: InfrastructureNode[];
  newEdges: Edge[];
}

/**
 * Simulates applying multiple mitigations to the current graph.
 */
export const simulateMitigation = (
  nodes: InfrastructureNode[],
  edges: Edge[],
  recommendations: Recommendation[],
  currentRiskScore: number
): MitigationResult => {
  let updatedNodes = JSON.parse(JSON.stringify(nodes)) as InfrastructureNode[];
  let updatedEdges = JSON.parse(JSON.stringify(edges)) as Edge[];

  const pathsBefore = getInfrastructureAttackPaths(nodes, edges);

  recommendations.forEach(recommendation => {
    switch (recommendation.type) {
      case 'PATCH_VULNERABILITY':
      case 'SERVICE_HARDENING': {
        const { nodeId, vulnerability } = recommendation.actionPayload;
        const node = updatedNodes.find(n => n.id === nodeId);
        if (node) {
          if (vulnerability) {
            node.data.vulnerabilitiesList = node.data.vulnerabilitiesList.filter(v => v !== vulnerability);
            node.data.vulnerabilities = node.data.vulnerabilitiesList.length;
          }

          // Structural changes to node ports
          const desc = recommendation.description.toLowerCase();
          if (desc.includes('database') || desc.includes('db')) {
            node.data.ports = node.data.ports?.filter(p => !['3306', '5432', '27017'].includes(p)) || [];
          } else if (desc.includes('ssh') || desc.includes('port 22')) {
            node.data.ports = node.data.ports?.filter(p => p !== '22') || [];
          } else if (desc.includes('web') || desc.includes('http')) {
            node.data.ports = node.data.ports?.filter(p => !['80', '443'].includes(p)) || [];
          } else if (desc.includes('restrict')) {
            node.data.ports = [];
          }

          if (desc.includes('public') || desc.includes('web')) {
            node.data.publicExposure = false;
          }

          node.data.compromised = false;

          // ── ATTACK PATH COLLAPSE ──────────────────────────────────
          // Remove ALL inbound edges to the patched node.
          // This simulates firewall-blocking: attackers can no longer
          // reach this node, so every attack path traversing it is
          // structurally eliminated from the graph.
          updatedEdges = updatedEdges.filter(
            edge => edge.target !== nodeId
          );
        }
        break;
      }
      case 'NETWORK_SEGMENTATION': {
        const { edgeId } = recommendation.actionPayload;

        // ── SEGMENTATION LOGIC ──────────────────────────────────────
        // Primary: remove by edgeId
        const edgeBefore = updatedEdges.length;
        updatedEdges = updatedEdges.filter(e => e.id !== edgeId);

        // Fallback: if edgeId didn't match, try source/target from
        // affectedNodes ([source, target])
        if (updatedEdges.length === edgeBefore && recommendation.affectedNodes?.length === 2) {
          const [source, target] = recommendation.affectedNodes;
          updatedEdges = updatedEdges.filter(
            edge => !(edge.source === source && edge.target === target)
          );
        }
        break;
      }
      case 'PRIVILEGE_RESTRICTION': {
        const { nodeId, newLevel } = recommendation.actionPayload;
        const node = updatedNodes.find(n => n.id === nodeId);
        if (node) {
          node.data.privilegeLevel = newLevel;
        }
        break;
      }
    }
  });

  const pathsAfter = getInfrastructureAttackPaths(updatedNodes, updatedEdges);
  const pathDelta = pathsAfter.length - pathsBefore.length;

  // Calculate new risk score based on path reduction and all mitigations combined
  let totalEstimatedReduction = 0;
  recommendations.forEach(r => totalEstimatedReduction += r.estimatedRiskReduction);
  totalEstimatedReduction = Math.min(totalEstimatedReduction, 95);

  const riskReductionFactor = pathsBefore.length > 0
    ? (pathsBefore.length - pathsAfter.length) / pathsBefore.length
    : totalEstimatedReduction / 100;

  const actualRiskReduction = Math.max(0.1, riskReductionFactor) * 100;
  const newRiskScore = recommendations.length > 0
    ? Math.max(0, currentRiskScore - (currentRiskScore * (actualRiskReduction / 100)))
    : currentRiskScore;

  return {
    riskBefore: currentRiskScore,
    riskAfter: Math.round(newRiskScore),
    riskReduction: Math.round(actualRiskReduction),
    pathDelta,
    newNodes: updatedNodes,
    newEdges: updatedEdges
  };
};

