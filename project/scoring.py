"""
scoring.py — Risk scoring model for the attack simulation.

Formula:
    risk_score = exposure_weight * privilege_weight * asset_value_weight * attack_depth_weight

Severity mapping:
    0–4   → Low
    5–8   → Medium
    9–12  → High
    13+   → Critical
"""

import networkx as nx


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
SEVERITY_THRESHOLDS = [
    (13, "Critical"),
    (9,  "High"),
    (5,  "Medium"),
    (0,  "Low"),
]

SEVERITY_COLORS = {
    "Low"      : "#2ecc71",   # green
    "Medium"   : "#f39c12",   # orange
    "High"     : "#e74c3c",   # red
    "Critical" : "#8e44ad",   # purple
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def calculate_risk(G: nx.DiGraph, sim_result: dict) -> dict:
    """
    Given the graph and simulation result, compute:
        - raw_score       : float
        - risk_score      : float (rounded to 2dp)
        - severity        : str
        - component_scores: dict (breakdown for transparency)
    """
    path = sim_result.get("attack_path", [])

    if not path:
        return {
            "raw_score"       : 0.0,
            "risk_score"      : 0.0,
            "severity"        : "Low",
            "component_scores": {},
        }

    exposure_w    = _exposure_weight(G, path)
    privilege_w   = _privilege_weight(G, path)
    asset_val_w   = _asset_value_weight(G, path)
    depth_w       = _depth_weight(path)

    raw = exposure_w * privilege_w * asset_val_w * depth_w
    score = round(raw, 2)

    return {
        "raw_score"       : score,
        "risk_score"      : score,
        "severity"        : _severity(score),
        "component_scores": {
            "exposure_weight"    : round(exposure_w,  3),
            "privilege_weight"   : round(privilege_w, 3),
            "asset_value_weight" : round(asset_val_w, 3),
            "depth_weight"       : round(depth_w,     3),
        },
    }


def severity_color(severity: str) -> str:
    return SEVERITY_COLORS.get(severity, "#95a5a6")


# ---------------------------------------------------------------------------
# Weight helpers
# ---------------------------------------------------------------------------

def _exposure_weight(G: nx.DiGraph, path: list[str]) -> float:
    """
    Average exposure score across all nodes on the path.
    Scaled to 0–2.0 for meaningful multiplication.
    """
    scores = [G.nodes[n].get("exposure_score", 0.1) for n in path]
    avg    = sum(scores) / len(scores)
    return 1.0 + avg   # range ≈ 1.1 – 2.0


def _privilege_weight(G: nx.DiGraph, path: list[str]) -> float:
    """
    Maximum privilege weight encountered on path.
    High-privilege nodes in the blast radius = higher multiplier.
    """
    weights = [G.nodes[n].get("privilege_weight", 1.0) for n in path]
    return max(weights)   # 0.8 – 1.5


def _asset_value_weight(G: nx.DiGraph, path: list[str]) -> float:
    """
    Normalised peak asset value on path.
    Asset values are user-provided (e.g. 1–10).
    We normalise to 0.5–2.0 range.
    """
    values = [G.nodes[n].get("asset_value", 1) for n in path]
    peak   = max(values)
    return peak / 5.0   # e.g. value=10 → 2.0, value=5 → 1.0


def _depth_weight(path: list[str]) -> float:
    """
    Longer attack chains = higher risk (more exposure surface).
    1 hop → 1.0, each additional hop adds 0.3.
    Capped at 2.5.
    """
    depth = len(path)
    return min(1.0 + (depth - 1) * 0.3, 2.5)


def _severity(score: float) -> str:
    for threshold, label in SEVERITY_THRESHOLDS:
        if score >= threshold:
            return label
    return "Low"
