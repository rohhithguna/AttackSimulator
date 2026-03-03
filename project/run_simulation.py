"""
run_simulation.py — CLI entry point for Next.js API route.
Reads JSON from stdin, runs full simulation, outputs JSON to stdout.

Updated output schema (Stage 2):
  - primary_attack_path / secondary_attack_path
  - confidence_score + confidence_label + confidence_color
  - business_impact { data_risk, operational_risk, compliance_risk, summary_tags }
  - ai.* now has 5 structured sections
  - mitigation_arch support for re-simulation (before/after comparison)
"""

import sys
import os
import json

sys.path.insert(0, os.path.dirname(__file__))

from parser          import parse_input, ParseError
from graph_engine    import build_graph, graph_summary
from attack_engine   import simulate_attack
from scoring         import calculate_risk, severity_color
from breach_time     import estimate_breach_time
from confidence      import calculate_confidence
from business_impact import compute_business_impact
from ai_explainer    import explain_attack


def run(raw_input: str | dict, openai_key: str = "") -> dict:
    if openai_key:
        os.environ["OPENAI_API_KEY"] = openai_key

    arch          = parse_input(raw_input)
    G             = build_graph(arch)
    sim_result    = simulate_attack(G, arch)

    if sim_result.get("error"):
        return {"error": sim_result["error"]}

    score_result  = calculate_risk(G, sim_result)
    time_result   = estimate_breach_time(sim_result["attack_steps"])
    conf_result   = calculate_confidence(G, sim_result, arch)
    biz_result    = compute_business_impact(
        sim_result, score_result, time_result, conf_result, arch
    )
    ai_result     = explain_attack(
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

    # Graph data for visualization
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

    return {
        # ── Attack paths ────────────────────────────────────────────────
        "primary_attack_path"   : sim_result["attack_path"],
        "secondary_attack_path" : sim_result.get("secondary_attack_path", []),
        "path_count"            : sim_result.get("path_count", 1),
        # Legacy key for backwards compat
        "attack_path"           : sim_result["attack_path"],
        "attack_steps"          : sim_result["attack_steps"],
        "vulnerability_chain"   : sim_result["vulnerability_chain"],
        "entry_point"           : sim_result["entry_point"],
        "target"                : sim_result["target"],

        # ── Risk ────────────────────────────────────────────────────────
        "risk_score"            : score_result["risk_score"],
        "severity"              : score_result["severity"],
        "severity_color"        : severity_color(score_result["severity"]),
        "component_scores"      : score_result["component_scores"],

        # ── Confidence ──────────────────────────────────────────────────
        "confidence_score"      : conf_result["confidence_score"],
        "confidence_label"      : conf_result["confidence_label"],
        "confidence_color"      : conf_result["confidence_color"],
        "confidence_factors"    : conf_result["factors"],

        # ── Breach time ─────────────────────────────────────────────────
        "breach_time": {
            "display"      : time_result["display"],
            "total_minutes": time_result["total_minutes"],
            "breakdown"    : time_result["breakdown"],
        },

        # ── Business impact ─────────────────────────────────────────────
        "business_impact": {
            "data_risk"       : biz_result["data_risk"],
            "operational_risk": biz_result["operational_risk"],
            "compliance_risk" : biz_result["compliance_risk"],
            "summary_tags"    : biz_result["summary_tags"],
        },

        # ── AI explanation ──────────────────────────────────────────────
        "ai": {
            "executive_summary"       : ai_result.get("executive_summary",       ""),
            "technical_analysis"      : ai_result.get("technical_analysis",      ""),
            "risk_justification"      : ai_result.get("risk_justification",      ""),
            "business_interpretation" : ai_result.get("business_interpretation", ""),
            "mitigation_roadmap"      : ai_result.get("mitigation_roadmap",      ""),
            # Legacy compat
            "technical_reasoning"     : ai_result.get("technical_analysis",      ""),
            "mitigation_strategy"     : ai_result.get("mitigation_roadmap",      ""),
            "business_impact"         : ai_result.get("business_interpretation", ""),
            "error"                   : ai_result.get("error"),
        },

        # ── Graph visualization data ─────────────────────────────────────
        "graph": {
            "nodes": nodes,
            "edges": edges,
        },
        "arch": arch,
    }


if __name__ == "__main__":
    payload     = json.loads(sys.stdin.read())
    raw_json    = payload.get("architecture", "{}")
    openai_key  = payload.get("openai_key", "")
    try:
        result = run(raw_json, openai_key)
    except ParseError as e:
        result = {"error": f"Parse error: {e}"}
    except Exception as e:
        result = {"error": f"Simulation error: {e}"}
    print(json.dumps(result))
