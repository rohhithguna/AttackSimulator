"""
centrality.py — Graph centrality and choke point analysis.
STAGE 3: Objective 2.
"""

import networkx as nx

def analyze_choke_points(G: nx.DiGraph, all_paths: list[list[str]]) -> list[dict]:
    """
    Perform graph centrality analysis and compute path dependencies.
    """
    if not G or not G.nodes():
        return []

    # Calculate centralities
    # Use undirected version for better reachability analysis if appropriate,
    # but here we follow directed flow.
    G_undirected = G.to_undirected()
    
    betweenness = nx.betweenness_centrality(G_undirected)
    closeness   = nx.closeness_centrality(G_undirected)
    degree      = nx.degree_centrality(G_undirected)

    results = []
    total_paths = len(all_paths)

    # Calculate dependency for each node
    for node in G.nodes():
        if total_paths == 0:
            path_dependency = 0
        else:
            paths_using_node = sum(1 for p in all_paths if node in p)
            path_dependency = (paths_using_node / total_paths) * 100

        # Simulate hardening: remove node and see how many paths collapse
        paths_remaining = sum(1 for p in all_paths if node not in p)
        risk_reduction = 0
        if total_paths > 0:
            # % of paths that are blocked if this node is hardened
            risk_reduction = ((total_paths - paths_remaining) / total_paths) * 100

        results.append({
            "node": node,
            "centrality_score": round(betweenness.get(node, 0), 3),
            "path_dependency_percent": round(path_dependency, 1),
            "risk_reduction_if_hardened": round(risk_reduction, 1),
            "single_point_of_catastrophic_failure": path_dependency >= 90
        })

    # Sort by betweenness (structural criticality)
    results.sort(key=lambda x: x["centrality_score"], reverse=True)

    return results[:5] # Top 5 as per requirement
