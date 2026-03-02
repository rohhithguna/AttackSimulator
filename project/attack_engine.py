"""
attack_engine.py — Core attack simulation logic.

Implements:
  1. Entry detection (public-facing + risky ports)
  2. Privilege escalation assessment
  3. Lateral movement (graph traversal toward high-value targets)
  4. Data exfiltration (highest asset_value node)
  5. Vulnerability chain construction
  6. Loop prevention
"""

import networkx as nx
from graph_engine import get_entry_points, get_highest_value_node


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

    Returns:
        {
            "attack_path"         : list[str],          # ordered node sequence
            "attack_steps"        : list[dict],         # step details per node
            "vulnerability_chain" : list[str],          # ordered vulnerability labels
            "entry_point"         : str,
            "target"              : str,
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

    # Find best path from entry to target
    path = _find_best_path(G, entry, target)

    if not path:
        return _empty_result(f"No reachable path from '{entry}' to '{target}'.")

    attack_steps, vuln_chain = _build_chain(G, path)

    return {
        "attack_path"        : path,
        "attack_steps"       : attack_steps,
        "vulnerability_chain": vuln_chain,
        "entry_point"        : entry,
        "target"             : target,
    }


# ---------------------------------------------------------------------------
# Path-finding
# ---------------------------------------------------------------------------

def _find_best_path(G: nx.DiGraph, entry: str, target: str) -> list[str]:
    """
    Find the path from entry to target that maximises total asset_value traversed.
    Falls back to shortest path if no weighted path exists.
    Prevents infinite loops via visited set.
    """
    if entry == target:
        return [entry]

    # Try all simple paths and pick the one with maximum cumulative asset value
    try:
        all_paths = list(nx.all_simple_paths(G, source=entry, target=target, cutoff=10))
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return []

    if not all_paths:
        return []

    def path_score(path):
        return sum(G.nodes[n].get("asset_value", 0) for n in path)

    best = max(all_paths, key=path_score)
    return best


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
            "node"      : node,
            "step_type" : step_type,
            "vulns"     : vulns,
            "permission": perm,
            "asset_value": asset_val,
            "ports"     : ports,
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
        "attack_path"        : [],
        "attack_steps"       : [],
        "vulnerability_chain": [],
        "entry_point"        : None,
        "target"             : None,
        "error"              : reason,
    }
