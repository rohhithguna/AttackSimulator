"""
probability.py — Probabilistic exploit modeling.
STAGE 3: Objective 3.

Now uses ML-based predictions when the trained model is available,
with automatic fallback to rule-based constants if the model is missing.

Architecture:
  - Entry node: ML prediction (or rule-based fallback) determines initial exploit chance
  - Hop nodes:  ML prediction is BLENDED with structural lateral movement probability
                so that internal nodes with low direct exploit chance still allow
                realistic path traversal via credential reuse / trust relationships
"""

import networkx as nx
from analysis.ml_exploit_predictor import extract_features, predict_exploit_probability

# ---------------------------------------------------------------------------
# Rule-based fallback constants (original logic — used when ML model is absent)
# ---------------------------------------------------------------------------
PROB_DEFAULT_CVE    = 0.6
PROB_CRITICAL_CVE   = 0.85
PROB_LOW_CVE        = 0.3
PROB_PRIV_ESC       = 0.7
PROB_CRED_REUSE     = 0.9

# Blending weight: how much the ML prediction influences hop probability
# vs the structural lateral movement probability
_ML_BLEND_WEIGHT = 0.4  # 40% ML, 60% lateral movement


def _get_node_exploit_prob(node_data: dict) -> float | None:
    """
    Attempt ML prediction for a single node's exploit probability.
    Returns None if ML model is unavailable (caller should use rule-based).
    """
    features = extract_features(node_data)
    return predict_exploit_probability(features)


def _rule_based_entry_prob(ports: list[int]) -> float:
    """Original rule-based entry probability from port analysis."""
    if 80 in ports or 443 in ports:
        return PROB_CRITICAL_CVE
    elif 22 in ports:
        return PROB_DEFAULT_CVE
    elif any(p in ports for p in [3306, 5432, 27017]):
        return PROB_CRITICAL_CVE
    else:
        return PROB_LOW_CVE


def _rule_based_hop_prob(prev_data: dict, node_data: dict, skill_multiplier: float) -> float:
    """Original rule-based lateral movement probability."""
    move_prob = PROB_CRED_REUSE * skill_multiplier
    move_prob = min(move_prob, 0.99)

    # Privilege escalation penalty
    if prev_data.get("permission") == "low" and node_data.get("permission") in ("medium", "high"):
        move_prob *= PROB_PRIV_ESC

    return move_prob


def compute_path_probability(G: nx.DiGraph, path: list[str], skill_multiplier: float = 1.0) -> float:
    """
    Compute path success probability as product of step probabilities.

    Uses ML model predictions when available. Falls back to rule-based
    constants if the model is missing or prediction fails for a node.

    For entry nodes:  P = ML_prediction (or rule-based)
    For hop nodes:    P = blend(ML_prediction, lateral_movement_prob)
                      This ensures internal nodes aren't zeroed out by
                      the ML model while still incorporating its signal.

    STAGE 3: Objective 3.
    Extended with ML predictions for AI-driven probability.
    """
    if not path:
        return 0.0

    # --- Entry node probability ---
    entry = path[0]
    entry_data = G.nodes.get(entry, {})

    ml_prob = _get_node_exploit_prob(entry_data)
    if ml_prob is not None:
        # ML prediction available — use it, apply skill multiplier
        prob = min(max(ml_prob, 0.05) * skill_multiplier, 0.99)
    else:
        # Fallback: rule-based entry probability
        ports = entry_data.get("open_ports", [])
        prob = min(_rule_based_entry_prob(ports) * skill_multiplier, 0.99)

    # --- Walk the path and multiply by hop probabilities ---
    for i in range(1, len(path)):
        node = path[i]
        node_data = G.nodes.get(node, {})
        prev_node = path[i - 1]
        prev_data = G.nodes.get(prev_node, {})

        # Structural lateral movement probability (always computed)
        lateral_prob = _rule_based_hop_prob(prev_data, node_data, skill_multiplier)

        ml_hop_prob = _get_node_exploit_prob(node_data)
        if ml_hop_prob is not None:
            # Blend ML prediction with lateral movement probability
            # This ensures internal nodes retain realistic traversal chances
            # while the ML model contributes its vulnerability assessment
            ml_clamped = max(ml_hop_prob, 0.05)
            hop_prob = (_ML_BLEND_WEIGHT * ml_clamped) + ((1 - _ML_BLEND_WEIGHT) * lateral_prob)
            hop_prob = min(hop_prob * skill_multiplier, 0.99)

            # Privilege escalation penalty still applies from structural data
            if prev_data.get("permission") == "low" and node_data.get("permission") in ("medium", "high"):
                hop_prob *= PROB_PRIV_ESC
        else:
            # Fallback: pure rule-based hop probability
            hop_prob = lateral_prob

        prob *= hop_prob

    return round(prob, 4)


def compute_overall_breach_probability(G: nx.DiGraph, all_paths: list[list[str]], skill_multiplier: float = 1.0) -> float:
    """
    Compute overall breach probability: max(path_probability).
    """
    if not all_paths:
        return 0.0

    probs = [compute_path_probability(G, p, skill_multiplier) for p in all_paths]
    return max(probs) if probs else 0.0
