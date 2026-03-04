
import { Edge } from '@xyflow/react';
import { InfrastructureNode, SimulationResults } from '../nodeState';
import { calculateChokePoints, NodeCentrality } from './chokePointAnalysis';
import { generateRecommendations, Recommendation } from './recommendationEngine';
import { simulateMitigation, MitigationResult } from './mitigationSimulator';

export interface DefenderAnalysisResults {
  recommendations: Recommendation[];
  chokePoints: NodeCentrality[];
}

export const runDefenderAnalysis = (
  nodes: InfrastructureNode[],
  edges: Edge[],
  simulationResults: SimulationResults | null,
  attackPaths: string[][]
): DefenderAnalysisResults => {
  if (!simulationResults || attackPaths.length === 0) {
    return { recommendations: [], chokePoints: [] };
  }

  const chokePoints = calculateChokePoints(nodes, attackPaths);
  const recommendations = generateRecommendations(nodes, edges, attackPaths);

  return {
    recommendations,
    chokePoints
  };
};

export { calculateChokePoints, generateRecommendations, simulateMitigation };
