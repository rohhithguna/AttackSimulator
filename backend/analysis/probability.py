"""
probability.py — Probabilistic exploit modeling.
STAGE 3: Objective 3.
"""

import networkx as nx

# Default probability values (from spec)
PROB_DEFAULT_CVE    = 0.6
PROB_CRITICAL_CVE   = 0.85
PROB_LOW_CVE        = 0.3
PROB_PRIV_ESC       = 0.7
PROB_CRED_REUSE     = 0.9

def compute_path_probability(G: nx.DiGraph, path: list[str], skill_multiplier: float = 1.0) -> float:
    """
    Compute path success probability as product of step probabilities.
    STAGE 3: Objective 3.
    Extended in Stage 4.5 for sensitivity analysis.
    """
    if not path:
        return 0.0
    
    # 1. Entry point probability based on ports
    entry = path[0]
    entry_data = G.nodes.get(entry, {})
    ports = entry_data.get("open_ports", [])
    
    if 80 in ports or 443 in ports:
        prob = PROB_CRITICAL_CVE
    elif 22 in ports:
        prob = PROB_DEFAULT_CVE
    elif any(p in ports for p in [3306, 5432, 27017]):
        prob = PROB_CRITICAL_CVE
    else:
        prob = PROB_LOW_CVE
    
    # Apply skill multiplier to base probability
    prob = min(prob * skill_multiplier, 0.99)
        
    # 2. Walk the path and multiply by hop probabilities
    for i in range(1, len(path)):
        node = path[i]
        node_data = G.nodes.get(node, {})
        prev_node = path[i-1]
        prev_data = G.nodes.get(prev_node, {})
        
        # Lateral movement probability (Credential reuse / internal trust)
        move_prob = PROB_CRED_REUSE * skill_multiplier
        move_prob = min(move_prob, 0.99)
        
        # Privilege escalation penalty if moving to higher privilege
        if prev_data.get("permission") == "low" and node_data.get("permission") in ("medium", "high"):
            move_prob *= PROB_PRIV_ESC
            
        prob *= move_prob
        
    return round(prob, 4)

def compute_overall_breach_probability(G: nx.DiGraph, all_paths: list[list[str]], skill_multiplier: float = 1.0) -> float:
    """
    Compute overall breach probability: max(path_probability)
    """
    if not all_paths:
        return 0.0
        
    probs = [compute_path_probability(G, p, skill_multiplier) for p in all_paths]
    return max(probs) if probs else 0.0
