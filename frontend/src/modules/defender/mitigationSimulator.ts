
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
 * Simulates applying a mitigation to the current graph.
 */
export const simulateMitigation = (
  nodes: InfrastructureNode[],
  edges: Edge[],
  recommendation: Recommendation,
  currentRiskScore: number
): MitigationResult => {
  const newNodes = JSON.parse(JSON.stringify(nodes)) as InfrastructureNode[];
  const newEdges = JSON.parse(JSON.stringify(edges)) as Edge[];

  const pathsBefore = getInfrastructureAttackPaths(nodes, edges);

  switch (recommendation.type) {
    case 'PATCH_VULNERABILITY': {
      const { nodeId, vulnerability } = recommendation.actionPayload;
      const node = newNodes.find(n => n.id === nodeId);
      if (node) {
        node.data.vulnerabilitiesList = node.data.vulnerabilitiesList.filter(v => v !== vulnerability);
        node.data.vulnerabilities = node.data.vulnerabilitiesList.length;
        // Mark as compromised false only if it was this node being patched
        node.data.compromised = false;
      }
      break;
    }
    case 'NETWORK_SEGMENTATION': {
      const { edgeId } = recommendation.actionPayload;
      const edgeIndex = newEdges.findIndex(e => e.id === edgeId);
      if (edgeIndex !== -1) {
        newEdges.splice(edgeIndex, 1);
      }
      break;
    }
    case 'PRIVILEGE_RESTRICTION': {
      const { nodeId, newLevel } = recommendation.actionPayload;
      const node = newNodes.find(n => n.id === nodeId);
      if (node) {
        node.data.privilegeLevel = newLevel;
      }
      break;
    }
    case 'SERVICE_HARDENING': {
       // logic for service hardening
       break;
    }
  }

  const pathsAfter = getInfrastructureAttackPaths(newNodes, newEdges);
  const pathDelta = pathsAfter.length - pathsBefore.length;

  // Calculate new risk score based on path reduction
  const riskReductionFactor = pathsBefore.length > 0 
    ? (pathsBefore.length - pathsAfter.length) / pathsBefore.length 
    : recommendation.estimatedRiskReduction / 100;
  
  const actualRiskReduction = Math.max(0.1, riskReductionFactor) * 100;
  const newRiskScore = Math.max(0, currentRiskScore - (currentRiskScore * (actualRiskReduction / 100)));

  return {
    riskBefore: currentRiskScore,
    riskAfter: Math.round(newRiskScore),
    riskReduction: Math.round(actualRiskReduction),
    pathDelta,
    newNodes,
    newEdges
  };
};

