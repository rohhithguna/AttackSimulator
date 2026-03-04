
import { Edge } from '@xyflow/react';
import { InfrastructureNode } from '../nodeState';

export interface NodeCentrality {
  nodeId: string;
  count: number;
  score: number; // 0 to 1
}

/**
 * Identifies nodes that appear most frequently across all attack paths.
 * These are "choke points" where a single fix can break multiple paths.
 */
export const calculateChokePoints = (
  nodes: InfrastructureNode[],
  attackPaths: string[][]
): NodeCentrality[] => {
  const nodeFrequencies: Record<string, number> = {};

  attackPaths.forEach(path => {
    path.forEach(nodeId => {
      nodeFrequencies[nodeId] = (nodeFrequencies[nodeId] || 0) + 1;
    });
  });

  const maxFrequency = Math.max(...Object.values(nodeFrequencies), 0);
  
  return nodes.map(node => {
    const count = nodeFrequencies[node.id] || 0;
    return {
      nodeId: node.id,
      count,
      score: maxFrequency > 0 ? count / maxFrequency : 0
    };
  }).sort((a, b) => b.count - a.count);
};
