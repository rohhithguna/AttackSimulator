"""
analysis_extensions.py — Advanced analysis tools for Stage 4.5.
Includes node removal simulation, path clustering, timeline generation, and sensitivity analysis.
"""

import networkx as nx
import json
from typing import List, Dict, Any

def simulate_node_hardening(
    arch: Dict[str, Any], 
    node_id: str, 
    baseline_metrics: Dict[str, Any],
    run_sim_func,
    attacker_skill: float = 1.0
) -> Dict[str, Any]:
    """
    Clones current graph/arch, removes selected node, and re-runs full simulation pipeline.
    Returns delta metrics.
    """
    if node_id not in arch["servers"]:
        return {"error": f"Node {node_id} not found in architecture"}

    # Create a modified architecture without the hardened node
    modified_arch = JSON_deep_copy(arch)
    
    # Remove node from servers
    modified_arch["servers"] = [s for s in modified_arch["servers"] if s != node_id]
    
    # Remove connections involving this node
    modified_arch["connections"] = [c for c in modified_arch["connections"] if node_id not in c]
    
    # Remove from other fields
    if node_id in modified_arch.get("open_ports", {}):
        del modified_arch["open_ports"][node_id]
    if node_id in modified_arch.get("permissions", {}):
        del modified_arch["permissions"][node_id]
    if node_id in modified_arch.get("asset_value", {}):
        del modified_arch["asset_value"][node_id]
    if "public_facing" in modified_arch:
        modified_arch["public_facing"] = [s for s in modified_arch["public_facing"] if s != node_id]

    # Re-run simulation
    try:
        # We assume run_sim_func returns a dictionary containing 'risk_score' and 'paths'
        h_result = run_sim_func(
            {"architecture": modified_arch}, 
            openai_key="", 
            monte_carlo_enabled=False, 
            attacker_skill=attacker_skill
        )
        
        baseline_score = baseline_metrics["risk_score"]
        h_score = h_result.get("risk_score", 0)
        
        b_paths = len(baseline_metrics.get("paths", []))
        h_paths = len(h_result.get("paths", []))

        return {
            "node_hardened": node_id,
            "original_risk": baseline_score,
            "new_risk": h_score,
            "risk_reduction_pct": round(((baseline_score - h_score) / baseline_score * 100), 1) if baseline_score > 0 else 0,
            "original_path_count": b_paths,
            "new_path_count": h_paths,
            "path_reduction_pct": round(((b_paths - h_paths) / b_paths * 100), 1) if b_paths > 0 else 0,
            "original_probability": baseline_metrics.get("exploit_probability", 0),
            "new_probability": h_result.get("exploit_probability", 0),
        }
    except Exception as e:
        return {"error": f"Hardening simulation failed: {str(e)}"}

def generate_attack_timeline(attack_steps: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Converts static attack steps into an animated timeline progression.
    """
    timeline = []
    accumulated_minutes = 0
    
    for i, step in enumerate(attack_steps):
        duration = step.get('adjusted_minutes', 0)
        accumulated_minutes += duration
        
        timeline.append({
            "step": i + 1,
            "node": step.get("node"),
            "action": step.get("step_type", "Lateral Movement"),
            "time_delta": f"+{duration}m",
            "cumulative_time": f"{accumulated_minutes}m",
            "privilege_level": step.get("privilege_level", "low"),
            "success_probability": step.get("probability", 1.0)
        })
    
    return timeline

def cluster_attack_paths(all_paths: List[List[str]], G: nx.DiGraph) -> List[Dict[str, Any]]:
    """
    Group similar paths based on shared entry points and target nodes.
    """
    if not all_paths:
        return []
        
    clusters = {}
    
    for path in all_paths:
        if not path: continue
        
        entry = path[0]
        target = path[-1]
        
        # Determine cluster by entry node
        cluster_key = f"Entry: {entry}"
        
        if cluster_key not in clusters:
            clusters[cluster_key] = {
                "cluster_type": cluster_key,
                "count": 0,
                "representative_path": path,
                "target_node": target
            }
        
        clusters[cluster_key]["count"] += 1
        
    # Sort clusters by size
    sorted_clusters = sorted(clusters.values(), key=lambda x: x["count"], reverse=True)
    return sorted_clusters

def perform_sensitivity_analysis(arch: Dict[str, Any], run_sim_func) -> Dict[str, Any]:
    """
    Runs simulations across different attacker skill levels to see risk variance.
    """
    skills = [0.6, 1.0, 1.4]
    skill_labels = ["Low", "Medium", "Elite"]
    results = []
    
    for skill, label in zip(skills, skill_labels):
        try:
            res = run_sim_func(
                {"architecture": arch}, 
                monte_carlo_enabled=False, 
                attacker_skill=skill
            )
            results.append({
                "skill_level": label,
                "skill_value": skill,
                "risk_score": res.get("risk_score", 0),
                "breach_probability": res.get("exploit_probability", 0)
            })
        except:
            continue
            
    return {
        "analysis_type": "attacker_skill_sensitivity",
        "scenarios": results,
        "risk_variance": round(results[-1]["risk_score"] - results[0]["risk_score"], 2) if len(results) >= 2 else 0
    }

def JSON_deep_copy(obj):
    return json.loads(json.dumps(obj))
