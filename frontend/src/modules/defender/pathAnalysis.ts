
import { Edge } from '@xyflow/react';
import { InfrastructureNode } from '../nodeState';

/**
 * Finds all simple paths from source nodes to a target node in a directed graph.
 */
export const findAllPaths = (
  nodes: InfrastructureNode[],
  edges: Edge[],
  sourceIds: string[],
  targetId: string,
  maxDepth: number = 5
): string[][] => {
  const paths: string[][] = [];

  const dfs = (currentNodeId: string, targetId: string, currentPath: string[], visited: Set<string>, depth: number) => {
    if (depth > maxDepth) return;
    if (currentNodeId === targetId) {
      paths.push([...currentPath]);
      return;
    }

    visited.add(currentNodeId);

    const outgoingEdges = edges.filter(e => e.source === currentNodeId);
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        currentPath.push(edge.target);
        dfs(edge.target, targetId, currentPath, visited, depth + 1);
        currentPath.pop();
      }
    }

    visited.delete(currentNodeId);
  };

  sourceIds.forEach(sourceId => {
    dfs(sourceId, targetId, [sourceId], new Set(), 0);
  });

  return paths;
};

/**
 * Gets all attack paths in the current infrastructure.
 * Sources are nodes with publicExposure = true.
 * Targets are nodes with high dataCriticality.
 */
export const getInfrastructureAttackPaths = (
  nodes: InfrastructureNode[],
  edges: Edge[]
): string[][] => {
  const publicNodes = nodes.filter(n => n.data.publicExposure).map(n => n.id);
  const criticalNodes = nodes.filter(n => n.data.dataCriticality === 'High').map(n => n.id);
  
  let allPaths: string[][] = [];
  criticalNodes.forEach(targetId => {
    const paths = findAllPaths(nodes, edges, publicNodes, targetId);
    allPaths = [...allPaths, ...paths];
  });

  // Deduplicate paths
  return Array.from(new Set(allPaths.map(p => JSON.stringify(p)))).map(p => JSON.parse(p));
};
