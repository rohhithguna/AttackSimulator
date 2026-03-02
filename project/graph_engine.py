"""
graph_engine.py — Builds a directed NetworkX graph from parsed architecture data.
Each node carries attributes used by the attack engine and scoring module.
"""

import networkx as nx
from typing import Any


def build_graph(arch: dict) -> nx.DiGraph:
    """
    Build a directed graph representing the infrastructure.

    Node attributes:
        - open_ports       : list[int]
        - permission       : "low" | "medium" | "high"
        - asset_value      : float
        - public_facing    : bool
        - exposure_score   : float  (derived, 0.0–1.0)
        - privilege_weight : float  (derived, higher = easier to escalate from)

    Edge attributes:
        - weight : float (inverse of target asset_value, for path-finding)
    """
    G = nx.DiGraph()

    for server in arch["servers"]:
        ports = arch["open_ports"][server]
        perm = arch["permissions"][server]
        asset_val = arch["asset_value"][server]
        is_public = server in arch["public_facing"]

        exposure_score = _compute_exposure(is_public, ports)
        privilege_weight = _compute_privilege_weight(perm)

        G.add_node(
            server,
            open_ports=ports,
            permission=perm,
            asset_value=asset_val,
            public_facing=is_public,
            exposure_score=exposure_score,
            privilege_weight=privilege_weight,
        )

    for src, dst in arch["connections"]:
        # Lower weight = more attractive path (higher destination asset value)
        dst_asset = arch["asset_value"].get(dst, 1)
        edge_weight = 1.0 / (dst_asset + 0.001)
        G.add_edge(src, dst, weight=edge_weight)

    return G


def _compute_exposure(is_public: bool, ports: list[int]) -> float:
    """
    Exposure score in [0, 1].
    Public-facing starts at 0.6; each risky port adds weight.
    """
    score = 0.6 if is_public else 0.1
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
    Low privilege = easier to escalate (attacker can exploit it); high = harder to breach but juicier.
    Returns a risk multiplier perspective:
        low   → 0.8  (easy target, low internal value)
        medium→ 1.2
        high  → 1.5  (hard to get but damaging once compromised)
    """
    return {"low": 0.8, "medium": 1.2, "high": 1.5}.get(permission, 1.0)


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
