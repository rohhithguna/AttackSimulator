/**
 * graphEngine — Serializes the visual React Flow graph into the JSON schema
 * expected by the backend simulation API.
 */

import { Edge } from '@xyflow/react';
import { InfrastructureNode } from '../nodeState';

/**
 * Maps InfrastructureNodeType visual labels to backend server name strings.
 */
const typeToServerName = (label: string): string => {
    return label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
};

/**
 * Maps privilege level UI values to backend permission values.
 */
const privilegeToPermission = (level: string): 'low' | 'medium' | 'high' => {
    switch (level) {
        case 'High': return 'high';
        case 'Medium': return 'medium';
        default: return 'low';
    }
};

/**
 * Maps data criticality to a numeric asset value (1-10).
 */
const criticalityToAssetValue = (
    criticality: string,
    privilegeLevel: string,
    customValue?: number
): number => {
    if (customValue !== undefined && customValue >= 1 && customValue <= 10) {
        return customValue;
    }
    const critBase = criticality === 'High' ? 8 : criticality === 'Medium' ? 5 : 2;
    const privBonus = privilegeLevel === 'High' ? 2 : privilegeLevel === 'Medium' ? 1 : 0;
    return Math.min(critBase + privBonus, 10);
};

/**
 * Parses port strings ("80", "443") into port numbers.
 */
const parsePorts = (ports?: string[]): number[] => {
    if (!ports) return [];
    return ports
        .map(p => parseInt(p.trim(), 10))
        .filter(p => !isNaN(p) && p > 0 && p <= 65535);
};

export interface SimulationInputJSON {
    servers: string[];
    connections: [string, string][];
    open_ports: Record<string, number[]>;
    permissions: Record<string, string>;
    asset_value: Record<string, number>;
    public_facing: string[];
}

/**
 * Converts the visual React Flow graph (nodes + edges) into the JSON schema
 * expected by the backend /api/simulate endpoint.
 *
 * Each node's `data.label` becomes the server name (lowercased, sanitized).
 * Edges become connections. Node properties map to ports, permissions, etc.
 */
export function exportGraphToSimulationJSON(
    nodes: InfrastructureNode[],
    edges: Edge[]
): SimulationInputJSON {
    // Build a map from node ID → server name (sanitized label)
    const idToName: Record<string, string> = {};
    const nameCount: Record<string, number> = {};

    // First pass: assign unique names
    for (const node of nodes) {
        let baseName = typeToServerName(node.data.label);
        if (!baseName) baseName = 'node';

        if (nameCount[baseName] !== undefined) {
            nameCount[baseName]++;
            baseName = `${baseName}_${nameCount[baseName]}`;
        } else {
            nameCount[baseName] = 0;
        }

        idToName[node.id] = baseName;
    }

    const servers: string[] = [];
    const open_ports: Record<string, number[]> = {};
    const permissions: Record<string, string> = {};
    const asset_value: Record<string, number> = {};
    const public_facing: string[] = [];

    for (const node of nodes) {
        const name = idToName[node.id];
        const d = node.data;

        servers.push(name);
        open_ports[name] = parsePorts(d.ports);
        permissions[name] = privilegeToPermission(d.privilegeLevel);
        asset_value[name] = criticalityToAssetValue(
            d.dataCriticality,
            d.privilegeLevel,
            (d as any).assetValue
        );

        if (d.publicExposure) {
            public_facing.push(name);
        }
    }

    // Build connections from edges (source → target)
    const connections: [string, string][] = [];
    for (const edge of edges) {
        const src = idToName[edge.source];
        const tgt = idToName[edge.target];
        if (src && tgt) {
            connections.push([src, tgt]);
        }
    }

    return {
        servers,
        connections,
        open_ports,
        permissions,
        asset_value,
        public_facing,
    };
}

/**
 * Reverse maps a backend server name back to a node ID.
 */
export function buildNameToIdMap(
    nodes: InfrastructureNode[]
): Record<string, string> {
    const idToName: Record<string, string> = {};
    const nameCount: Record<string, number> = {};

    for (const node of nodes) {
        let baseName = typeToServerName(node.data.label);
        if (!baseName) baseName = 'node';

        if (nameCount[baseName] !== undefined) {
            nameCount[baseName]++;
            baseName = `${baseName}_${nameCount[baseName]}`;
        } else {
            nameCount[baseName] = 0;
        }

        idToName[node.id] = baseName;
    }

    // Reverse: name → id
    const nameToId: Record<string, string> = {};
    for (const [id, name] of Object.entries(idToName)) {
        nameToId[name] = id;
    }
    return nameToId;
}
