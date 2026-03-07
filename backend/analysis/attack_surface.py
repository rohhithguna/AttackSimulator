"""
attack_surface.py — Analyzes exposed infrastructure services.
Returns public nodes, high-risk ports, and top exposed nodes.
Does NOT modify attack simulation algorithms.
"""

import networkx as nx
from typing import Any

# Ports considered high-risk when publicly exposed
HIGH_RISK_PORT_DEFINITIONS: dict[int, str] = {
    22:    "SSH",
    23:    "Telnet",
    80:    "HTTP",
    443:   "HTTPS",
    445:   "SMB",
    1433:  "MSSQL",
    3306:  "MySQL",
    3389:  "RDP",
    5432:  "PostgreSQL",
    6379:  "Redis",
    8080:  "HTTP-Alt",
    8443:  "HTTPS-Alt",
    9200:  "Elasticsearch",
    27017: "MongoDB",
}


def analyze_attack_surface(G: nx.DiGraph) -> dict[str, Any]:
    """
    Analyze the attack surface of the infrastructure graph.

    Returns:
        {
            "public_nodes": [...],
            "high_risk_ports": [...],
            "top_exposed_nodes": [...]
        }
    """

    public_nodes: list[dict[str, Any]] = []
    high_risk_port_findings: list[dict[str, Any]] = []
    exposure_scores: list[tuple[str, float, dict]] = []

    seen_port_entries: set[str] = set()  # deduplicate port findings

    for node_id, data in G.nodes(data=True):
        is_public = data.get("public_facing", False)
        open_ports = data.get("open_ports", [])
        asset_value = data.get("asset_value", 1)
        exposure = data.get("exposure_score", 0.0)

        # --- Public Nodes ---
        if is_public:
            public_nodes.append({
                "node": node_id,
                "open_ports": open_ports,
                "asset_value": asset_value,
                "exposure_score": round(exposure, 3),
            })

        # --- High-Risk Ports ---
        for port in open_ports:
            port_int = int(port) if not isinstance(port, int) else port
            if port_int in HIGH_RISK_PORT_DEFINITIONS:
                dedup_key = f"{node_id}:{port_int}"
                if dedup_key in seen_port_entries:
                    continue
                seen_port_entries.add(dedup_key)

                high_risk_port_findings.append({
                    "node": node_id,
                    "port": port_int,
                    "service": HIGH_RISK_PORT_DEFINITIONS[port_int],
                    "public": is_public,
                    "risk_note": _port_risk_note(port_int, is_public),
                })

        # --- Exposure ranking (all nodes, not just public) ---
        # Composite: exposure_score weighted by asset_value and connectivity
        in_degree = G.in_degree(node_id)
        out_degree = G.out_degree(node_id)
        connectivity_factor = 1.0 + 0.1 * (in_degree + out_degree)

        composite = exposure * asset_value * connectivity_factor
        exposure_scores.append((node_id, composite, {
            "exposure_score": round(exposure, 3),
            "asset_value": asset_value,
            "open_ports": open_ports,
            "public": is_public,
            "in_degree": in_degree,
            "out_degree": out_degree,
        }))

    # Sort and take top 5 exposed nodes
    exposure_scores.sort(key=lambda x: x[1], reverse=True)
    top_exposed_nodes = [
        {
            "node": node_id,
            "composite_score": round(score, 3),
            **details,
        }
        for node_id, score, details in exposure_scores[:5]
    ]

    # Sort high-risk ports: public-facing first, then by port number
    high_risk_port_findings.sort(key=lambda x: (not x["public"], x["port"]))

    return {
        "public_nodes": public_nodes,
        "high_risk_ports": high_risk_port_findings,
        "top_exposed_nodes": top_exposed_nodes,
    }


def _port_risk_note(port: int, is_public: bool) -> str:
    """Return a brief human-readable risk note for a port/exposure combination."""
    prefix = "Externally exposed" if is_public else "Internally accessible"

    notes: dict[int, str] = {
        22:    f"{prefix} SSH — brute-force & credential stuffing risk",
        23:    f"{prefix} Telnet — cleartext protocol, critical",
        80:    f"{prefix} HTTP — unencrypted web traffic",
        443:   f"{prefix} HTTPS — web attack surface",
        445:   f"{prefix} SMB — lateral movement & ransomware vector",
        1433:  f"{prefix} MSSQL — database exfiltration risk",
        3306:  f"{prefix} MySQL — database exfiltration risk",
        3389:  f"{prefix} RDP — remote takeover risk",
        5432:  f"{prefix} PostgreSQL — database exfiltration risk",
        6379:  f"{prefix} Redis — unauthenticated access risk",
        8080:  f"{prefix} HTTP-Alt — possible admin/dev interface",
        8443:  f"{prefix} HTTPS-Alt — possible admin/dev interface",
        9200:  f"{prefix} Elasticsearch — data leak risk",
        27017: f"{prefix} MongoDB — NoSQL injection & data leak risk",
    }
    return notes.get(port, f"{prefix} port {port}")
