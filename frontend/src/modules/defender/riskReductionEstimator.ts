import { InfrastructureNode } from '../nodeState';
import { Recommendation } from './recommendationEngine';

export const calculateNodePathFrequency = (nodeId: string, paths: string[][]): number => {
    if (!paths || paths.length === 0) return 0;
    const count = paths.filter(p => p.includes(nodeId)).length;
    return count / paths.length;
};

export const estimateExposure = (node: InfrastructureNode): number => {
    let base = node.data.publicExposure ? 0.6 : 0.1;
    const ports = node.data.ports || [];

    if (ports.includes('22')) base += 0.2;
    if (ports.includes('80') || ports.includes('443')) base += 0.15;
    if (ports.includes('3306') || ports.includes('5432') || ports.includes('27017')) base += 0.25;

    return Math.min(1.0, base);
};

export const estimateRiskReduction = (
    recommendation: Recommendation,
    paths: string[][],
    nodes: InfrastructureNode[]
): number => {
    let maxReduction = 0;

    for (const nodeId of recommendation.affectedNodes) {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) continue;

        const nodePathFrequency = calculateNodePathFrequency(nodeId, paths);
        const nodeExposureScore = estimateExposure(node);
        const nodeAssetValue = node.data.assetValue || 5;

        const riskReductionScore = nodePathFrequency * nodeExposureScore * nodeAssetValue;
        const riskReduction = Math.round(riskReductionScore * 100);

        if (riskReduction > maxReduction) {
            maxReduction = riskReduction;
        }
    }

    // Clamp result between 0 and 95
    return Math.max(0, Math.min(95, maxReduction));
};
