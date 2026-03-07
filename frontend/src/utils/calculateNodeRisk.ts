export function calculateNodeRiskCategory(nodeData: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const publicExposure = nodeData.publicExposure ? 5 : 0;

    // Try to use vulnerabilitiesList if available, fallback to numerical vulnerabilities count
    const vulnsLength = nodeData.vulnerabilitiesList
        ? nodeData.vulnerabilitiesList.length
        : (nodeData.vulnerabilities || 0);

    const assetValue = nodeData.assetValue || 0;
    const portsLength = nodeData.ports ? nodeData.ports.length : 0;

    const risk = publicExposure + (vulnsLength * 2) + assetValue + portsLength;

    if (risk <= 5) return 'LOW';
    if (risk <= 10) return 'MEDIUM';
    if (risk <= 15) return 'HIGH';
    return 'CRITICAL';
}
