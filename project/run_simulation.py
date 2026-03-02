"""
run_simulation.py — CLI entry point for Next.js API route.
Reads JSON from stdin, runs full simulation, outputs JSON to stdout.
"""

import sys
import os
import json

sys.path.insert(0, os.path.dirname(__file__))

from parser import parse_input, ParseError
from graph_engine import build_graph, graph_summary
from attack_engine import simulate_attack
from scoring import calculate_risk, severity_color
from breach_time import estimate_breach_time
from ai_explainer import explain_attack


def run(raw_input: str, openai_key: str = "") -> dict:
    if openai_key:
        os.environ["OPENAI_API_KEY"] = openai_key

    arch = parse_input(raw_input)
    G = build_graph(arch)
    sim_result = simulate_attack(G, arch)

    if sim_result.get("error"):
        return {"error": sim_result["error"]}

    score_result = calculate_risk(G, sim_result)
    time_result = estimate_breach_time(sim_result["attack_steps"])
    ai_result = explain_attack(
        attack_path=sim_result["attack_path"],
        vulnerability_chain=sim_result["vulnerability_chain"],
        risk_score=score_result["risk_score"],
        severity=score_result["severity"],
        breach_time=time_result["display"],
        arch=arch,
    )

    # Build graph data for visualization
    nodes = []
    for node in G.nodes(data=True):
        name, data = node
        nodes.append({
            "id": name,
            "permission": data.get("permission", "medium"),
            "asset_value": data.get("asset_value", 1),
            "public_facing": data.get("public_facing", False),
            "exposure_score": round(data.get("exposure_score", 0), 3),
            "open_ports": data.get("open_ports", []),
        })

    edges = []
    for src, dst in G.edges():
        edges.append({"source": src, "target": dst})

    return {
        "attack_path": sim_result["attack_path"],
        "attack_steps": sim_result["attack_steps"],
        "vulnerability_chain": sim_result["vulnerability_chain"],
        "entry_point": sim_result["entry_point"],
        "target": sim_result["target"],
        "risk_score": score_result["risk_score"],
        "severity": score_result["severity"],
        "severity_color": severity_color(score_result["severity"]),
        "component_scores": score_result["component_scores"],
        "breach_time": {
            "display": time_result["display"],
            "total_minutes": time_result["total_minutes"],
            "breakdown": time_result["breakdown"],
        },
        "ai": {
            "executive_summary": ai_result.get("executive_summary", ""),
            "technical_reasoning": ai_result.get("technical_reasoning", ""),
            "mitigation_strategy": ai_result.get("mitigation_strategy", ""),
            "business_impact": ai_result.get("business_impact", ""),
            "error": ai_result.get("error"),
        },
        "graph": {
            "nodes": nodes,
            "edges": edges,
        },
        "arch": arch,
    }


if __name__ == "__main__":
    payload = json.loads(sys.stdin.read())
    raw_json = payload.get("architecture", "{}")
    openai_key = payload.get("openai_key", "")
    try:
        result = run(raw_json, openai_key)
    except ParseError as e:
        result = {"error": f"Parse error: {e}"}
    except Exception as e:
        result = {"error": f"Simulation error: {e}"}
    print(json.dumps(result))
