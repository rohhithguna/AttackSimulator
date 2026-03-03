"""
confidence.py — Confidence scoring for the attack simulation.

Confidence represents how certain the simulation is about the identified
attack path, based on the quality of entry vectors, chain length, and
the directness of exposure.

Score range: 0–100 (integer percentage)

Factors that INCREASE confidence:
  - Direct public exposure (no intermediate pivot needed)
  - Short attack chain (fewer assumptions)
  - Risky ports on entry node (known exploit vector)
  - High exposure_score on entry node

Factors that DECREASE confidence:
  - Long attack chain (many lateral hops = more uncertainty)
  - Multiple lateral movement steps (each pivot adds uncertainty)
  - No risky ports at entry (exploit vector is speculative)
  - All-medium or all-low asset values (target less certain)

Formula (additive with clamping):
  base            = 80
  + direct_bonus  (entry is public-facing and 1-hop to target)
  + port_bonus    (known risky ports on entry)
  - chain_penalty (per lateral-movement hop beyond 1)
  - pivot_penalty (each intermediate pivot)
  - speculation_penalty (no clear port-based vector)

Final score is clamped to [10, 97] for realism — no system is ever
100% certain or 100% unknown.
"""

import networkx as nx


def calculate_confidence(
    G: nx.DiGraph,
    sim_result: dict,
    arch: dict,
) -> dict:
    """
    Compute confidence score for the primary attack path.

    Returns:
        {
            "confidence_score" : int,     # 0–100
            "confidence_label" : str,     # "Very High" | "High" | "Moderate" | "Low"
            "confidence_color" : str,     # hex color
            "factors"          : dict,    # breakdown of each factor's contribution
        }
    """
    path   = sim_result.get("attack_path", [])
    steps  = sim_result.get("attack_steps", [])
    entry  = sim_result.get("entry_point")

    if not path or not entry:
        return _empty_confidence()

    factors: dict[str, int] = {}

    # ── Base ──────────────────────────────────────────────────────────────────
    score = 80
    factors["base"] = 80

    # ── Direct-exposure bonus (+10) ───────────────────────────────────────────
    # If the entry node is public-facing and reachable without intermediaries
    entry_data  = G.nodes.get(entry, {})
    is_public   = entry_data.get("public_facing", False)
    chain_len   = len(path)

    if is_public and chain_len <= 2:
        score += 10
        factors["direct_exposure_bonus"] = +10
    else:
        factors["direct_exposure_bonus"] = 0

    # ── Port-vector bonus (+5) ────────────────────────────────────────────────
    # If entry node has well-known exploitable ports (22, 80, 443, 3306, 5432)
    risky_ports = {22, 80, 443, 3306, 5432, 27017}
    entry_ports = set(entry_data.get("open_ports", []))
    overlap     = entry_ports & risky_ports

    if overlap:
        score += 5
        factors["known_port_vector_bonus"] = +5
    else:
        # Speculative entry — no concrete port vector
        score -= 8
        factors["speculation_penalty"] = -8
        factors["known_port_vector_bonus"] = 0

    # ── Chain-length penalty (-5 per hop beyond 1) ────────────────────────────
    extra_hops = max(0, chain_len - 2)          # 2-hop chain has 0 penalty
    hop_penalty = extra_hops * 5
    score -= hop_penalty
    factors["chain_length_penalty"] = -hop_penalty

    # ── Lateral movement penalty (-4 per lateral step) ────────────────────────
    lateral_steps = sum(1 for s in steps if s["step_type"] == "Lateral Movement")
    lateral_penalty = lateral_steps * 4
    score -= lateral_penalty
    factors["lateral_movement_penalty"] = -lateral_penalty

    # ── Exposure quality bonus/penalty ────────────────────────────────────────
    exposure = entry_data.get("exposure_score", 0.5)
    if exposure >= 0.8:
        score += 5
        factors["high_exposure_bonus"] = +5
    elif exposure < 0.3:
        score -= 5
        factors["low_exposure_penalty"] = -5
    else:
        factors["exposure_neutral"] = 0

    # ── Privilege escalation complexity penalty (-3 per priv-esc step) ────────
    priv_steps = sum(
        1 for s in steps
        if s["step_type"] == "Privilege Escalation"
        or "Privilege Escalation" in [v for v in s.get("vulns", [])]
    )
    priv_penalty = priv_steps * 3
    score -= priv_penalty
    factors["privilege_escalation_penalty"] = -priv_penalty

    # ── Exploit Realism Bonus (Stage 3) ───────────────────────────────────────
    # If the path probability is high, confidence in the breach increases
    from analysis.probability import compute_path_probability
    path_prob = compute_path_probability(G, path)

    if path_prob >= 0.7:
        score += 8
        factors["exploit_realism_bonus"] = +8
    elif path_prob < 0.2:
        score -= 5
        factors["exploit_difficulty_penalty"] = -5
    
    # ── Clamp to [10, 97] ─────────────────────────────────────────────────────
    final = max(10, min(97, score))
    factors["final"] = final

    return {
        "confidence_score" : final,
        "confidence_label" : _label(final),
        "confidence_color" : _color(final),
        "factors"          : factors,
    }


# ─────────────────────────────────────────────────────────────────────────────

def _label(score: int) -> str:
    if score >= 80:
        return "Very High"
    if score >= 65:
        return "High"
    if score >= 45:
        return "Moderate"
    return "Low"


def _color(score: int) -> str:
    if score >= 80:
        return "#e74c3c"   # red — attacker has clear path
    if score >= 65:
        return "#f39c12"   # orange
    if score >= 45:
        return "#f1c40f"   # yellow
    return "#2ecc71"       # green — uncertain path, defender wins


def _empty_confidence() -> dict:
    return {
        "confidence_score" : 0,
        "confidence_label" : "Unknown",
        "confidence_color" : "#484f58",
        "factors"          : {},
    }
