"""
graph_engine.py — Builds a directed NetworkX graph from parsed architecture data.
Each node carries attributes used by the attack engine and scoring module.
"""

import networkx as nx
from typing import Any
from core.config_loader import get_config


def build_graph(arch: dict) -> nx.DiGraph:
    """
    Build a directed graph representing the infrastructure.
    Enforces performance guards from config.yaml.
    """
    config = get_config()
    max_nodes = config.get("simulation", {}).get("max_nodes", 1000)
    max_edges = config.get("simulation", {}).get("max_edges", 5000)

    if len(arch["servers"]) > max_nodes:
        raise ValueError(f"Exceeded max nodes limit ({max_nodes})")
    if len(arch["connections"]) > max_edges:
        raise ValueError(f"Exceeded max edges limit ({max_edges})")

    G = nx.DiGraph()

    for server in arch["servers"]:
        ports = arch["open_ports"].get(server, [])
        perm = arch["permissions"].get(server, "medium")
        asset_val = arch["asset_value"].get(server, 1)
        is_public = server in arch["public_facing"]

        exposure_score = _compute_exposure(is_public, ports)
        privilege_weight = _compute_privilege_weight(perm)
        vulnerability_score = exposure_score * 0.8 + (0.2 if 22 in ports else 0)

        G.add_node(
            server,
            open_ports=ports,
            permission=perm,
            asset_value=asset_val,
            public_facing=is_public,
            exposure_score=exposure_score,
            privilege_weight=privilege_weight,
            vulnerability_score=vulnerability_score,
        )

    for src, dst in arch["connections"]:
        # Lower weight = more attractive path (higher destination asset value)
        dst_asset = arch["asset_value"].get(dst, 1)
        edge_weight = 1.0 / (dst_asset + 0.001)
        
        # friction: higher means harder to traverse
        # internal connections are generally lower friction than edge connections
        friction = 0.5 if src in arch["public_facing"] else 0.2
        
        G.add_edge(src, dst, weight=edge_weight, friction=friction)

    return G


def _compute_exposure(is_public: bool, ports: list[int]) -> float:
    """
    Exposure score in [0, 1].
    Public-facing starts at 0.6; each risky port adds weight.
    """
    config = get_config()
    risk_weights = config.get("risk_model", {})
    
    base_score = risk_weights.get("exposure_weight_max", 0.6) if is_public else risk_weights.get("exposure_weight_min", 0.1)
    score = base_score

    if 22 in ports:
        score += 0.2
    if 80 in ports or 443 in ports:
        score += 0.15
    if 3306 in ports or 5432 in ports or 27017 in ports:
        score += 0.25   # DB ports directly exposed
    return min(score, 1.0)


def _compute_privilege_weight(permission: str) -> float:
    """
    Privilege weight: how much risk the node's privilege level adds.
    """
    config = get_config()
    priv_weights = config.get("risk_model", {})
    
    weights = {
        "low": priv_weights.get("privilege_weight_low", 0.8),
        "medium": priv_weights.get("privilege_weight_medium", 1.2),
        "high": priv_weights.get("privilege_weight_high", 1.5)
    }
    return weights.get(permission, 1.0)


def get_entry_points(G: nx.DiGraph) -> list[str]:
    """Return nodes that are public-facing (initial attacker foothold candidates)."""
    return [n for n, d in G.nodes(data=True) if d.get("public_facing", False)]


def get_highest_value_node(G: nx.DiGraph) -> str:
    """Return the node with the highest asset_value (exfiltration target)."""
    return max(G.nodes(data=True), key=lambda x: x[1].get("asset_value", 0))[0]


def graph_summary(G: nx.DiGraph) -> dict:
    """Return a human-readable summary of the graph."""
    return {
        "nodes": list(G.nodes()),
        "edges": list(G.edges()),
        "entry_points": get_entry_points(G),
        "target": get_highest_value_node(G),
    }
