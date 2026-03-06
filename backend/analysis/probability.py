"""
probability.py — Probabilistic exploit modeling.
STAGE 3: Objective 3.

Now uses ML-based predictions and CVE intelligence for grounded probability,
with automatic fallback to rule-based constants if both are missing.

Architecture:
  - Entry node: CVE Intel > ML prediction > rule-based fallback
  - Hop nodes:  CVE Intel > blend(ML_prediction, lateral_movement_prob) > rule-based fallback
"""

import networkx as nx
import os
from analysis.ml_exploit_predictor import extract_features, predict_exploit_probability

try:
    from vulnerability_intelligence import VulnerabilityIntelligence
    from mitre_mapper import MitreMapper
    _VULN_INTEL_AVAILABLE = True
except ImportError:
    _VULN_INTEL_AVAILABLE = False

# ---------------------------------------------------------------------------
# Rule-based fallback constants (original logic)
# ---------------------------------------------------------------------------
PROB_DEFAULT_CVE    = 0.6
PROB_CRITICAL_CVE   = 0.85
PROB_LOW_CVE        = 0.3
PROB_PRIV_ESC       = 0.7
PROB_CRED_REUSE     = 0.9

# Blending weight: how much the ML prediction influences hop probability
# vs the structural lateral movement probability
_ML_BLEND_WEIGHT = 0.4  # 40% ML, 60% lateral movement

# Initialize Vulnerability Intelligence and MITRE Mapper once at module level
vuln_intel = None
mitre_mapper = None

if _VULN_INTEL_AVAILABLE:
    try:
        _NVD_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "nvd.json.gz")
        if not os.path.exists(_NVD_PATH):
            _NVD_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "nvd.json.gz")
        if not os.path.exists(_NVD_PATH):
            _NVD_PATH = "nvd.json.gz"

        # Validate dataset is not effectively empty (< 1KB = placeholder/empty)
        if os.path.exists(_NVD_PATH) and os.path.getsize(_NVD_PATH) >= 1024:
            vuln_intel = VulnerabilityIntelligence(_NVD_PATH, lazy_load=True)
            mitre_mapper = MitreMapper()
        else:
            import warnings
            warnings.warn(
                f"[probability] NVD dataset too small ({os.path.getsize(_NVD_PATH) if os.path.exists(_NVD_PATH) else 0} bytes). "
                "CVE-grounded probability disabled; using rule-based fallback.",
                stacklevel=2,
            )
    except Exception:
        vuln_intel = None
        mitre_mapper = None

def get_grounded_exploit_prob(node_data: dict) -> tuple[float | None, dict | None, dict | None]:
    """
    Computes grounded exploit probability based on CVSS metrics if CVEs are present.
    Returns (probability, display_intel, raw_intel) or (None, None, None).
    """
    cves = node_data.get("cves", [])
    if not cves or vuln_intel is None:
        return None, None, None
    
    best_prob = -1.0
    best_display_intel = None
    best_raw_intel = None
    
    for cve_id in cves:
        intel = vuln_intel.get_cve_intelligence(cve_id)
        if not intel:
            continue
            
        base_prob = intel["normalized_exploitability"]
        
        # Apply structured modifiers
        if intel.get("attack_vector") == "NETWORK":
            base_prob += 0.10
        if intel.get("privileges_required") == "NONE":
            base_prob += 0.05
        if intel.get("attack_complexity") == "LOW":
            base_prob += 0.05
            
        grounded_prob = min(base_prob, 0.95)
        
        if grounded_prob > best_prob:
            best_prob = grounded_prob
            best_display_intel = {
                "cve": intel["cve_id"],
                "cvss_score": intel["base_score"],
                "exploitability_score": intel["exploitability_score"],
                "grounded_probability": round(grounded_prob, 4)
            }
            best_raw_intel = intel
            
    if best_prob < 0:
        return None, None, None
        
    return best_prob, best_display_intel, best_raw_intel

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

    Prioritizes Grounded CVE Intel > ML model > rule-based.
    """
    if not path:
        return 0.0

    # --- Entry node probability ---
    entry = path[0]
    entry_data = G.nodes.get(entry, {})

    # 1. Try Grounded CVE Prob
    grounded_prob, _, _ = get_grounded_exploit_prob(entry_data)
    if grounded_prob is not None:
        prob = grounded_prob # Use deterministic grounded_prob as per requirement
    else:
        # 2. Try ML Prediction
        ml_prob = _get_node_exploit_prob(entry_data)
        if ml_prob is not None:
            prob = min(max(ml_prob, 0.05) * skill_multiplier, 0.99)
        else:
            # 3. Fallback: rule-based entry probability
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

        # 1. Try Grounded CVE Prob
        grounded_prob, _, _ = get_grounded_exploit_prob(node_data)
        if grounded_prob is not None:
            hop_prob = grounded_prob
        else:
            # 2. Try ML Blend
            ml_hop_prob = _get_node_exploit_prob(node_data)
            if ml_hop_prob is not None:
                ml_clamped = max(ml_hop_prob, 0.05)
                hop_prob = (_ML_BLEND_WEIGHT * ml_clamped) + ((1 - _ML_BLEND_WEIGHT) * lateral_prob)
                hop_prob = min(hop_prob * skill_multiplier, 0.99)

                # Privilege escalation penalty still applies from structural data
                if prev_data.get("permission") == "low" and node_data.get("permission") in ("medium", "high"):
                    hop_prob *= PROB_PRIV_ESC
            else:
                # 3. Fallback: pure rule-based hop probability
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

def collect_vulnerability_intelligence(G: nx.DiGraph, path: list[str]) -> list[dict]:
    """
    Extract intelligence for each CVE-driven node in the path.
    Also maps to MITRE ATT&CK techniques.
    """
    intelligence = []
    for i, node in enumerate(path):
        node_data = G.nodes.get(node, {})
        _, display_intel, raw_intel = get_grounded_exploit_prob(node_data)
        
        if display_intel and raw_intel and mitre_mapper is not None:
            # Context for MITRE mapping
            is_priv_esc = False
            is_lateral_movement = i > 0
            is_high_value_access = node_data.get("high_value", False)
            
            if i > 0:
                prev_node = path[i - 1]
                prev_data = G.nodes.get(prev_node, {})
                # Detect privilege escalation
                if prev_data.get("permission") == "low" and node_data.get("permission") in ("medium", "high"):
                    is_priv_esc = True
            
            # Map techniques
            techniques = mitre_mapper.map_cve_to_techniques(
                raw_intel,
                is_priv_esc=is_priv_esc,
                is_lateral_movement=is_lateral_movement,
                is_high_value_access=is_high_value_access
            )
            
            # Add to display intel
            display_intel["mitre_techniques"] = techniques
            intelligence.append(display_intel)
            
    return intelligence
