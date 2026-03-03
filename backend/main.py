"""
main.py — Production-grade entry point for the AI Attack Simulation Agent.
Unified for Stage 1-4.5 logic.
"""

import sys
import os
import json
import networkx as nx
import time
import uuid
import traceback

# Ensure core directory is in path
base_dir = os.path.dirname(os.path.abspath(__file__))
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

from core.parser          import parse_input, ParseError
from core.graph_engine    import build_graph
from core.attack_engine   import simulate_attack
from core.validator       import validate_input, get_error_response
from core.config_loader   import get_config

from analysis.scoring         import calculate_risk, calculate_advanced_risk, severity_color
from analysis.breach_time     import estimate_breach_time
from analysis.confidence      import calculate_confidence
from analysis.business_impact import compute_business_impact
from analysis.ai_explainer    import explain_attack
from analysis.centrality      import analyze_choke_points
from analysis.probability     import compute_path_probability, compute_overall_breach_probability
from analysis.monte_carlo     import run_monte_carlo
from analysis.analysis_extensions import (
    generate_attack_timeline, 
    cluster_attack_paths, 
    JSON_deep_copy,
    simulate_node_hardening,
    perform_sensitivity_analysis
)

VERSION = "1.0.0-production"

def run_simulation_logic(
    raw_input: dict, 
    openai_key: str = "", 
    monte_carlo_enabled: bool = True, 
    attacker_skill: float = 1.0, 
    harden_node: str = None
) -> dict:
    """
    Core execution logic for the simulation.
    """
    start_time_perf = time.perf_counter()
    request_id = str(uuid.uuid4())

    if openai_key:
        os.environ["OPENAI_API_KEY"] = openai_key

    # 1. Validation & Parsing
    try:
        validate_input(raw_input)
        arch = parse_input(raw_input["architecture"])
    except Exception as e:
        return {
            **get_error_response(e),
            "request_id": request_id,
            "version": VERSION
        }

    # 2. Graph Construction
    try:
        G = build_graph(arch)
    except Exception as e:
        return {
            "status": "error",
            "message": f"Graph construction failed: {str(e)}",
            "request_id": request_id,
            "version": VERSION
        }

    # 3. Path Finding & Primary Simulation
    sim_result = simulate_attack(G, arch)
    
    # Handle scenario where no path is found
    if sim_result.get("error") or not sim_result.get("attack_path"):
        resilience = {
            "is_resilient": True,
            "reason": sim_result.get("error") or "No viable attack path found to high-value targets.",
            "confidence": 94
        }
        
        # Minimal valid output even for resilient systems
        return _build_resilient_response(request_id, VERSION, arch, resilience, start_time_perf)

    # 4. Detailed Analysis (Stage 2-3)
    score_result = calculate_risk(G, sim_result)
    time_result  = estimate_breach_time(sim_result["attack_steps"])
    conf_result  = calculate_confidence(G, sim_result, arch)
    biz_result   = compute_business_impact(sim_result, score_result, time_result, conf_result, arch)
    
    primary_path = sim_result["attack_path"]
    exploit_prob = compute_path_probability(G, primary_path, attacker_skill)
    
    # Find all paths for advanced analysis
    config = get_config()
    max_depth = config.get("simulation", {}).get("max_dfs_depth", 12)
    try:
        all_paths = list(nx.all_simple_paths(G, source=sim_result["entry_point"], target=sim_result["target"], cutoff=max_depth))
    except:
        all_paths = [primary_path]

    # Choke Points & Centrality
    choke_points_data = analyze_choke_points(G, all_paths)
    # Standardize field names for frontend (centrality_score -> centrality)
    choke_points = []
    for cp in choke_points_data:
        choke_points.append({
            "node": cp["node"],
            "centrality": cp["centrality_score"],
            "path_dependency_percent": cp["path_dependency_percent"],
            "risk_reduction_if_hardened": cp["risk_reduction_if_hardened"],
            "single_point_of_catastrophic_failure": cp["single_point_of_catastrophic_failure"]
        })

    # Monte Carlo
    if monte_carlo_enabled:
        monte_carlo_results = run_monte_carlo(G, all_paths, iterations=1000, skill_multiplier=attacker_skill)
    else:
        monte_carlo_results = {"iterations": 0, "breach_success_rate": 0.0, "average_time_if_successful": "Disabled"}

    # Advanced Risk
    impact_mult = 1.0 + (len(biz_result.get("summary_tags", [])) * 0.1)
    advanced_risk = calculate_advanced_risk(
        structural_risk     = score_result["risk_score"],
        exploit_probability = exploit_prob,
        impact_multiplier   = impact_mult,
        time_to_breach      = time_result["total_minutes"]
    )

    # 5. Stage 4.5 Extensions
    timeline = generate_attack_timeline(time_result["breakdown"])
    path_clusters = cluster_attack_paths(all_paths, G)
    
    risk_components = {
        "structural_exposure": score_result["component_scores"].get("exposure_weight", 0),
        "intrinsic_vulnerability": score_result["component_scores"].get("asset_value_weight", 0),
        "target_proximity": score_result["component_scores"].get("depth_weight", 0),
        "privilege_amplification": score_result["component_scores"].get("privilege_weight", 0)
    }

    # Baseline for extensions
    baseline_metrics = {
        "risk_score": score_result["risk_score"],
        "paths": all_paths,
        "exploit_probability": exploit_prob
    }

    # Node Hardening Sandbox
    harden_metrics = None
    if harden_node:
        harden_metrics = simulate_node_hardening(
            arch=arch, 
            node_id=harden_node, 
            baseline_metrics=baseline_metrics, 
            run_sim_func=run_simulation_logic,
            attacker_skill=attacker_skill
        )

    # Sensitivity Analysis
    sensitivity_results = perform_sensitivity_analysis(arch, run_simulation_logic)

    # 6. AI Explanation
    ai_result = explain_attack(
        attack_path         = sim_result["attack_path"],
        secondary_path      = sim_result.get("secondary_attack_path", []),
        vulnerability_chain = sim_result["vulnerability_chain"],
        risk_score          = score_result["risk_score"],
        severity            = score_result["severity"],
        confidence_score    = conf_result["confidence_score"],
        breach_time         = time_result["display"],
        arch                = arch,
        business_impact     = biz_result,
    )

    # 7. Final Output Assembly
    return {
        "status": "success",
        "request_id": request_id,
        "execution_time": round(time.perf_counter() - start_time_perf, 4),
        "version": VERSION,

        # Paths
        "paths": all_paths, 
        "primary_path": sim_result["attack_path"],
        "secondary_paths": [sim_result.get("secondary_attack_path", [])] if sim_result.get("secondary_attack_path") else [],
        "attack_path": sim_result["attack_path"], # Legacy
        "attack_steps": sim_result["attack_steps"],
        "vulnerability_chain": sim_result["vulnerability_chain"],
        "entry_point": sim_result["entry_point"],
        "target": sim_result["target"],
        "attack_timeline": timeline,
        "path_clusters": path_clusters,
        "optimized_paths": sim_result.get("optimized_paths", {}),

        # Risk
        "risk_score": score_result["risk_score"],
        "structural_risk": score_result["risk_score"],
        "advanced_risk": advanced_risk,
        "severity": score_result["severity"],
        "severity_color": severity_color(score_result["severity"]),
        "component_scores": score_result["component_scores"],
        "risk_components": risk_components,

        # Analytics
        "exploit_probability": exploit_prob,
        "breach_probability_overall": compute_overall_breach_probability(G, all_paths, attacker_skill),
        "monte_carlo_results": monte_carlo_results,
        "centrality_scores": {cp["node"]: cp["centrality"] for cp in choke_points},
        "choke_points": choke_points,
        "harden_metrics": harden_metrics,
        "sensitivity_analysis": sensitivity_results,
        "resilience_summary": {"is_resilient": False, "reason": "Attack path identified.", "confidence": conf_result["confidence_score"]},

        # Confidence
        "confidence_score": conf_result["confidence_score"],
        "confidence_label": conf_result["confidence_label"],
        "confidence_color": conf_result["confidence_color"],
        "confidence_factors": conf_result["factors"],

        # Breach Time
        "breach_time": time_result["display"],
        "breach_time_data": { # Keep object for frontend
            "display": time_result["display"],
            "total_minutes": time_result["total_minutes"],
            "breakdown": time_result["breakdown"],
        },

        # Impact
        "business_impact": biz_result,

        # AI Analysis (Standardized Keys)
        "ai_analysis": {
            "executive_summary": ai_result.get("executive_summary", ""),
            "technical_analysis": ai_result.get("technical_analysis", ""),
            "risk_justification": ai_result.get("risk_justification", ""),
            "business_interpretation": ai_result.get("business_interpretation", ""),
            "mitigation_roadmap": ai_result.get("mitigation_roadmap", ""),
            "error": ai_result.get("error")
        },
        "ai": ai_result, 
        "ai_explanation": ai_result.get("executive_summary", ""), # Legacy

        # Infrastructure
        "graph": _serialize_graph(G),
        "arch": arch
    }

def _build_resilient_response(request_id, version, arch, resilience, start_time):
    return {
        "status": "success",
        "request_id": request_id,
        "execution_time": round(time.perf_counter() - start_time, 4),
        "version": version,
        "resilience_summary": resilience,
        "risk_score": 0,
        "structural_risk": 0,
        "advanced_risk": 0,
        "severity": "Low",
        "severity_color": severity_color("Low"),
        "paths": [],
        "primary_path": [],
        "primary_attack_path": [],
        "attack_path": [],
        "secondary_paths": [],
        "secondary_attack_path": [],
        "attack_steps": [],
        "vulnerability_chain": [],
        "entry_point": None,
        "target": None,
        "risk_components": {
            "structural_exposure": 0,
            "intrinsic_vulnerability": 0,
            "target_proximity": 0,
            "privilege_amplification": 0
        },
        "exploit_probability": 0,
        "breach_probability_overall": 0,
        "monte_carlo_results": {
            "iterations": 0,
            "breach_success_rate": 0,
            "average_time_if_successful": "N/A"
        },
        "centrality_scores": {},
        "choke_points": [],
        "harden_metrics": None,
        "optimized_paths": {},
        "confidence_score": resilience.get("confidence", 0),
        "confidence_label": "High",
        "confidence_color": "#2ecc71",
        "confidence_factors": {},
        "breach_time": "N/A",
        "breach_time_data": {
            "display": "N/A",
            "total_minutes": 0,
            "breakdown": []
        },
        "business_impact": {
            "data_risk": "None identified.",
            "operational_risk": "None identified.",
            "compliance_risk": "None identified.",
            "summary_tags": ["secure-architecture"]
        },
        "attack_timeline": [],
        "path_clusters": [],
        "sensitivity_analysis": {
            "analysis_type": "attacker_skill_sensitivity",
            "scenarios": [],
            "risk_variance": 0
        },
        "ai_analysis": {
            "executive_summary": "No viable attack paths identified. System architecture demonstrates strong defensive posture.",
            "technical_analysis": "Simulation could not find a path from any entry point to high-value targets.",
            "risk_justification": "Structural isolation and lack of public exposure reduce risk to zero.",
            "business_interpretation": "Operational continuity is likely maintained.",
            "mitigation_roadmap": "Maintain current security configurations and regular audits."
        },
        "ai": {
            "executive_summary": "No viable attack paths identified.",
            "technical_analysis": "No path found.",
            "risk_justification": "Zero risk.",
            "business_interpretation": "No impact.",
            "mitigation_roadmap": "None needed.",
            "technical_reasoning": "No path found.",
            "mitigation_strategy": "None needed.",
            "business_impact": "No impact.",
            "error": None
        },
        "ai_explanation": "No viable attack paths identified.",
        "graph": {"nodes": [], "edges": []},
        "arch": arch
    }

def _serialize_graph(G):
    nodes = []
    for name, data in G.nodes(data=True):
        nodes.append({
            "id"            : name,
            "permission"    : data.get("permission",     "medium"),
            "asset_value"   : data.get("asset_value",    1),
            "public_facing" : data.get("public_facing",  False),
            "exposure_score": round(data.get("exposure_score", 0), 3),
            "open_ports"    : data.get("open_ports",     []),
        })
    edges = [{"source": s, "target": t} for s, t in G.edges()]
    return {"nodes": nodes, "edges": edges}

if __name__ == "__main__":
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"error": "No input provided via stdin"}))
            sys.exit(1)
            
        payload = json.loads(input_data)
        
        result = run_simulation_logic(
            raw_input      = payload,
            openai_key     = payload.get("openai_key", ""),
            monte_carlo_enabled = payload.get("monte_carlo", True),
            attacker_skill = payload.get("attacker_skill", 1.0),
            harden_node    = payload.get("harden_node")
        )
        print(json.dumps(result))
        
    except json.JSONDecodeError:
        print(json.dumps({"error": "Invalid JSON input"}))
    except Exception as e:
        print(json.dumps({
            "status": "error",
            "message": f"Fatal engine error: {str(e)}",
            "trace": traceback.format_exc()
        }))
