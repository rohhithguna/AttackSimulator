"""
scoring.py — Risk scoring model for the attack simulation.

Formula (Stage 2):
    risk_score = exposure_weight * privilege_weight * asset_value_weight * attack_depth_weight

Advanced Formula (Stage 3):
    advanced_risk = (structural_risk × exploit_probability × impact_multiplier) ÷ log(time_to_breach + 1)
"""

import networkx as nx
import math


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

def calculate_advanced_risk(
    structural_risk: float,
    exploit_probability: float,
    impact_multiplier: float,
    time_to_breach: float
) -> float:
    """
    STAGE 3 Objective 5: Advanced Risk Intelligence Layer.
    Formula:
        advanced_risk = (structural_risk × exploit_probability × impact_multiplier) / log(time_to_breach + 1)
    """
    # impact_multiplier defaults to 1.0 if not provided
    # time_to_breach in minutes
    
    # structural_risk is from calculate_risk
    # exploit_probability is from probability.py (0.0 to 1.0)
    
    numerator = structural_risk * exploit_probability * impact_multiplier
    # log(time_to_breach + 1) to avoid divide by zero and handle very fast breaches
    # we use natural log as standard in mathematical models
    denominator = math.log(time_to_breach + 1) if time_to_breach > 0 else 1.0
    
    if denominator < 0.1: # safety for very small time values
        denominator = 0.1
        
    adv_risk = numerator / denominator
    return round(adv_risk, 2)


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
