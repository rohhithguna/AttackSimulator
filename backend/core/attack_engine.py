"""
attack_engine.py — Core attack simulation logic.

Implements:
  1. Entry detection (public-facing + risky ports)
  2. Privilege escalation assessment
  3. Lateral movement (graph traversal toward high-value targets)
  4. Data exfiltration (highest asset_value node)
  5. Vulnerability chain construction
  6. Loop prevention via nx.all_simple_paths (cutoff=12)
  7. Dual path generation — primary (max risk) + secondary (second-best)
  8. STAGE 3: Weighted path optimization (Dijkstra)
"""

import networkx as nx
from core.graph_engine import get_entry_points, get_highest_value_node
from core.config_loader import get_config


# ---------------------------------------------------------------------------
# Attack step tags
# ---------------------------------------------------------------------------
STEP_EXPLOIT       = "Initial Exploit"
STEP_PRIV_ESC      = "Privilege Escalation"
STEP_LATERAL       = "Lateral Movement"
STEP_EXFILTRATION  = "Data Exfiltration"

# Vulnerability labels per scenario
VULN_BRUTE_FORCE   = "SSH Brute-Force (Port 22)"
VULN_WEB_EXPLOIT   = "Web Application Exploit (Port 80/443)"
VULN_EXPOSED_DB    = "Exposed Database Port"
VULN_PRIV_ESC_LOW  = "Privilege Escalation via Low-Privilege Account"
VULN_LATERAL_MOVE  = "Lateral Movement via Internal Trust"
VULN_EXFIL         = "Data Exfiltration from High-Value Asset"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def simulate_attack(G: nx.DiGraph, arch: dict) -> dict:
    """
    Run the full attack simulation on graph G.

    Returns primary path + secondary path (if one exists).

    Returns:
        {
            "attack_path"            : list[str],   # primary path (highest risk)
            "secondary_attack_path"  : list[str],   # second-best path (or [])
            "attack_steps"           : list[dict],  # step details per node (primary)
            "vulnerability_chain"    : list[str],   # ordered vulnerability labels (primary)
            "entry_point"            : str,
            "target"                 : str,
            "path_count"             : int,         # total simple paths found
            "optimized_paths": {                    # STAGE 3
                "min_friction": list[str],
                "max_damage": list[str],
                "fastest_breach": list[str]
            }
        }
    """
    entry_points = get_entry_points(G)
    target       = get_highest_value_node(G)

    if not entry_points:
        return _empty_result("No public-facing entry points found.")

    # Pick best entry point: highest exposure_score
    entry = max(
        entry_points,
        key=lambda n: G.nodes[n].get("exposure_score", 0)
    )

    # Find all ranked paths (Deterministic Stage 2 logic)
    ranked = _find_ranked_paths(G, entry, target)

    if not ranked:
        return _empty_result(f"No reachable path from '{entry}' to '{target}'.")

    # STAGE 3: Weighted Path Optimization
    opt_paths = compute_weighted_paths(G, entry, target)

    primary_path   = ranked[0]
    secondary_path = ranked[1] if len(ranked) > 1 else []

    attack_steps, vuln_chain = _build_chain(G, primary_path)

    return {
        "attack_path"           : primary_path,
        "secondary_attack_path" : secondary_path,
        "attack_steps"          : attack_steps,
        "vulnerability_chain"   : vuln_chain,
        "entry_point"           : entry,
        "target"                : target,
        "path_count"            : len(ranked),
        "optimized_paths"       : opt_paths,
    }


# ---------------------------------------------------------------------------
# Stage 3: Weighted Path Optimization
# ---------------------------------------------------------------------------

def compute_weighted_paths(G: nx.DiGraph, entry: str, target: str) -> dict:
    """
    Implements STAGE 3 Objective 1:
    1. Minimum friction path (most realistic attacker path)
    2. Maximum damage path (worst-case scenario)
    3. Fastest breach path (minimum time-to-compromise)
    """
    if entry == target:
        path = [entry]
        return {"min_friction": path, "max_damage": path, "fastest_breach": path}

    # Prepare temporary graph with specialized weights
    G_friction = nx.DiGraph()
    G_damage   = nx.DiGraph()
    G_speed    = nx.DiGraph()

    for u, v, d in G.edges(data=True):
        v_data = G.nodes[v]
        
        # 1. Minimum Friction (Path of least resistance)
        # Higher vulnerability, exposure and privilege weight reduces the friction/effort.
        vuln_score  = v_data.get("vulnerability_score", 0.1)
        exposure    = v_data.get("exposure_score", 0.1)
        priv_weight = v_data.get("privilege_weight", 1.0)
        edge_friction = d.get("friction", 0.5)
        
        # We want to minimize the effort. 
        # effort = edge_friction / (vuln_score * exposure * priv_weight)
        # Using a small epsilon to avoid divide by zero
        friction_weight = edge_friction / (vuln_score * exposure * priv_weight + 0.001)
        G_friction.add_edge(u, v, weight=friction_weight)

        # 2. Maximum Damage (Worst-case scenario)
        # We want to find the path that hits the highest value assets.
        # So we use a "cost" that is the inverse of the damage.
        asset_val = v_data.get("asset_value", 1)
        damage_inv = 1.0 / (asset_val * priv_weight + 0.001)
        G_damage.add_edge(u, v, weight=damage_inv)

        # 3. Fastest Breach (Minimum time-to-compromise)
        # We can estimate step time based on the node's attributes
        # Port-based estimates like in breach_time.py
        ports = v_data.get("open_ports", [])
        time_weight = 60 # Default 60 mins
        if 80 in ports or 443 in ports: time_weight = 30
        elif 22 in ports: time_weight = 120
        elif any(p in ports for p in [3306, 5432, 27017]): time_weight = 90
        
        # Adjust by privilege (harder nodes take longer)
        perm = v_data.get("permission", "medium")
        if perm == "high": time_weight *= 1.4
        elif perm == "low": time_weight *= 0.75
        
        G_speed.add_edge(u, v, weight=time_weight)

    def get_path(Graph, s, t):
        try:
            # Dijkstra is efficient for these graph sizes.
            # We could use A* if we had a meaningful coordinate-based heuristic.
            return nx.dijkstra_path(Graph, s, t, weight='weight')
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return []

    return {
        "min_friction"   : get_path(G_friction, entry, target),
        "max_damage"     : get_path(G_damage, entry, target),
        "fastest_breach" : get_path(G_speed, entry, target),
    }


# ---------------------------------------------------------------------------
# Path-finding (Stage 2)
# ---------------------------------------------------------------------------

def _find_ranked_paths(G: nx.DiGraph, entry: str, target: str) -> list[list[str]]:
    """
    Explore all simple paths from entry to target (cutoff 12 to prevent explosion).
    Rank by cumulative asset_value × exposure contribution (highest = most dangerous).

    Returns list of paths sorted descending by risk score.
    No infinite loops — nx.all_simple_paths guarantees simple (no-repeat) paths.
    """
    if entry == target:
        return [[entry]]

    config = get_config()
    max_depth = config.get("simulation", {}).get("max_dfs_depth", 12)

    try:
        all_paths = list(nx.all_simple_paths(G, source=entry, target=target, cutoff=max_depth))
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return []

    if not all_paths:
        return []

    def path_risk(path: list[str]) -> float:
        """
        Score a path by:
          sum(asset_value) * avg(exposure_score) * max(privilege_weight)
        Higher = more dangerous / higher attacker motivation.
        """
        asset_sum   = sum(G.nodes[n].get("asset_value", 1) for n in path)
        avg_exp     = sum(G.nodes[n].get("exposure_score", 0.1) for n in path) / len(path)
        max_priv    = max(G.nodes[n].get("privilege_weight", 1.0) for n in path)
        return asset_sum * avg_exp * max_priv

    ranked = sorted(all_paths, key=path_risk, reverse=True)
    return ranked


# ---------------------------------------------------------------------------
# Vulnerability chain builder
# ---------------------------------------------------------------------------

def _build_chain(G: nx.DiGraph, path: list[str]) -> tuple[list[dict], list[str]]:
    """
    Walk the path and assign attack steps + vulnerability labels to each hop.
    """
    steps      = []
    vuln_chain = []

    for i, node in enumerate(path):
        node_data = G.nodes[node]
        ports     = node_data.get("open_ports", [])
        perm      = node_data.get("permission", "medium")
        asset_val = node_data.get("asset_value", 1)
        is_public = node_data.get("public_facing", False)

        if i == 0:
            # Entry node — Initial Exploit
            step_type = STEP_EXPLOIT
            vulns     = _detect_entry_vulns(ports, is_public)

        elif i == len(path) - 1:
            # Final node — Data Exfiltration
            step_type = STEP_EXFILTRATION
            vulns     = [VULN_EXFIL]
            # Add privilege escalation if needed
            if perm in ("medium", "high"):
                vulns.insert(0, VULN_PRIV_ESC_LOW)
                vuln_chain.append(VULN_PRIV_ESC_LOW)

        else:
            # Intermediate node — Lateral Movement + possible priv-esc
            step_type = STEP_LATERAL
            vulns     = [VULN_LATERAL_MOVE]
            if perm == "low":
                vulns.append(VULN_PRIV_ESC_LOW)

        steps.append({
            "node"       : node,
            "step_type"  : step_type,
            "vulns"      : vulns,
            "permission" : perm,
            "asset_value": asset_val,
            "ports"      : ports,
        })

        for v in vulns:
            if v not in vuln_chain:
                vuln_chain.append(v)

    # Ensure privilege escalation appears when path crosses privilege boundaries
    _inject_priv_esc(steps, vuln_chain)

    return steps, vuln_chain


def _detect_entry_vulns(ports: list[int], is_public: bool) -> list[str]:
    vulns = []
    if 22 in ports:
        vulns.append(VULN_BRUTE_FORCE)
    if 80 in ports or 443 in ports:
        vulns.append(VULN_WEB_EXPLOIT)
    if 3306 in ports or 5432 in ports or 27017 in ports:
        vulns.append(VULN_EXPOSED_DB)
    if not vulns and is_public:
        vulns.append(VULN_WEB_EXPLOIT)   # default web surface
    return vulns or [VULN_WEB_EXPLOIT]


def _inject_priv_esc(steps: list[dict], vuln_chain: list[str]) -> None:
    """
    If path moves from low to high privilege node, ensure PRIV_ESC is in chain.
    """
    for i in range(1, len(steps)):
        prev_perm = steps[i - 1]["permission"]
        curr_perm = steps[i]["permission"]
        if prev_perm == "low" and curr_perm in ("medium", "high"):
            if VULN_PRIV_ESC_LOW not in vuln_chain:
                vuln_chain.insert(1, VULN_PRIV_ESC_LOW)


def _empty_result(reason: str) -> dict:
    return {
        "attack_path"           : [],
        "secondary_attack_path" : [],
        "attack_steps"          : [],
        "vulnerability_chain"   : [],
        "entry_point"           : None,
        "target"                : None,
        "path_count"            : 0,
        "error"                 : reason,
        "optimized_paths"       : {},
    }
