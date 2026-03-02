"""
ai_explainer.py — Generates structured AI explanation using OpenAI API.

Uses a structured system prompt to produce:
  - Executive summary
  - Technical reasoning
  - Mitigation strategy
  - Business impact

Falls back gracefully when API key is missing or call fails.
"""

import os
import json
from openai import OpenAI


def explain_attack(
    attack_path       : list[str],
    vulnerability_chain: list[str],
    risk_score        : float,
    severity          : str,
    breach_time       : str,
    arch              : dict,
) -> dict:
    """
    Call OpenAI to produce a structured explanation of the simulated attack.

    Returns:
        {
            "executive_summary"   : str,
            "technical_reasoning" : str,
            "mitigation_strategy" : str,
            "business_impact"     : str,
            "raw_response"        : str,   # full LLM output
            "error"               : str | None,
        }
    """
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        return _fallback_explanation(attack_path, vulnerability_chain, risk_score, severity, breach_time)

    system_prompt = _build_system_prompt()
    user_prompt   = _build_user_prompt(attack_path, vulnerability_chain, risk_score, severity, breach_time, arch)

    try:
        client   = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model      = "gpt-4o",
            messages   = [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature = 0.4,
            max_tokens  = 1200,
        )
        raw = response.choices[0].message.content.strip()
        return _parse_llm_response(raw)
    except Exception as e:
        return _fallback_explanation(
            attack_path, vulnerability_chain, risk_score, severity, breach_time,
            error=str(e)
        )


# ---------------------------------------------------------------------------
# Prompt builders
# ---------------------------------------------------------------------------

def _build_system_prompt() -> str:
    return """You are a senior cybersecurity red-team analyst.
Your task is to explain a simulated infrastructure attack in a structured, professional format.

Always respond with a JSON object (no markdown fences) containing exactly these keys:
  "executive_summary"   – 2–3 sentences for a non-technical executive audience.
  "technical_reasoning" – detailed explanation of how the attack chain works technically.
  "mitigation_strategy" – specific, prioritized remediation steps.
  "business_impact"     – financial, reputational, and operational risks if the attack succeeds.

Be precise, realistic, and actionable. Do not add extra keys."""


def _build_user_prompt(
    attack_path: list[str],
    vulnerability_chain: list[str],
    risk_score: float,
    severity: str,
    breach_time: str,
    arch: dict,
) -> str:
    return f"""Analyze this simulated attack on an infrastructure system:

ATTACK PATH:
{" → ".join(attack_path) if attack_path else "No path identified"}

VULNERABILITY CHAIN:
{chr(10).join(f"  {i+1}. {v}" for i, v in enumerate(vulnerability_chain))}

RISK SCORE: {risk_score} / 15+ (severity: {severity})
ESTIMATED BREACH TIME: {breach_time}

ARCHITECTURE CONTEXT:
- Servers: {", ".join(arch.get("servers", []))}
- Public-facing: {", ".join(arch.get("public_facing", []))}
- Permissions: {json.dumps(arch.get("permissions", {}))}
- Asset values: {json.dumps(arch.get("asset_value", {}))}

Respond with the structured JSON as instructed."""


# ---------------------------------------------------------------------------
# Response parsing
# ---------------------------------------------------------------------------

def _parse_llm_response(raw: str) -> dict:
    """Extract structured fields from LLM JSON response."""
    try:
        # Strip markdown code fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            lines   = cleaned.split("\n")
            cleaned = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
        parsed = json.loads(cleaned)
        return {
            "executive_summary"   : parsed.get("executive_summary",   ""),
            "technical_reasoning" : parsed.get("technical_reasoning", ""),
            "mitigation_strategy" : parsed.get("mitigation_strategy", ""),
            "business_impact"     : parsed.get("business_impact",     ""),
            "raw_response"        : raw,
            "error"               : None,
        }
    except json.JSONDecodeError:
        # Return raw as executive summary if JSON parse fails
        return {
            "executive_summary"   : raw,
            "technical_reasoning" : "",
            "mitigation_strategy" : "",
            "business_impact"     : "",
            "raw_response"        : raw,
            "error"               : "Could not parse structured JSON from LLM response.",
        }


# ---------------------------------------------------------------------------
# Fallback (no API key)
# ---------------------------------------------------------------------------

def _fallback_explanation(
    attack_path: list[str],
    vulnerability_chain: list[str],
    risk_score: float,
    severity: str,
    breach_time: str,
    error: str | None = None,
) -> dict:
    """
    Rule-based fallback explanation when OpenAI is unavailable.
    """
    path_str  = " → ".join(attack_path) if attack_path else "N/A"
    vuln_list = "; ".join(vulnerability_chain) if vulnerability_chain else "None identified"

    executive_summary = (
        f"A simulated {severity}-severity attack was identified that could compromise your infrastructure "
        f"within an estimated {breach_time}. "
        f"The attack traverses: {path_str}."
    )

    technical_reasoning = (
        f"The attacker gains initial access via the public-facing entry node using: {vulnerability_chain[0] if vulnerability_chain else 'unknown exploit'}. "
        f"The full vulnerability chain includes: {vuln_list}. "
        f"The risk score of {risk_score} reflects exposure, privilege configuration, asset value, and attack depth."
    )

    mitigation_strategy = _rule_based_mitigation(vulnerability_chain, attack_path)

    business_impact = (
        f"If this attack succeeds, the most critical asset ({attack_path[-1] if attack_path else 'unknown'}) "
        f"could be breached within {breach_time}. This may result in data exfiltration, service disruption, "
        f"regulatory penalties, and reputational damage proportional to a {severity} severity incident."
    )

    return {
        "executive_summary"   : executive_summary,
        "technical_reasoning" : technical_reasoning,
        "mitigation_strategy" : mitigation_strategy,
        "business_impact"     : business_impact,
        "raw_response"        : "",
        "error"               : error,
    }


def _rule_based_mitigation(vuln_chain: list[str], path: list[str]) -> str:
    tips = []
    if any("SSH" in v or "Port 22" in v for v in vuln_chain):
        tips.append("Disable password-based SSH authentication; enforce key-based auth and MFA.")
    if any("Web" in v or "80" in v or "443" in v for v in vuln_chain):
        tips.append("Deploy a Web Application Firewall (WAF) and conduct regular DAST scans.")
    if any("Privilege" in v for v in vuln_chain):
        tips.append("Implement least-privilege access controls and enforce role-based access (RBAC).")
    if any("Lateral" in v for v in vuln_chain):
        tips.append("Segment the network; enforce zero-trust micro-segmentation between internal nodes.")
    if any("Exfiltration" in v for v in vuln_chain):
        tips.append("Deploy Data Loss Prevention (DLP) tools and monitor egress traffic anomalies.")
    if any("Database" in v for v in vuln_chain):
        tips.append("Remove public exposure of database ports; restrict DB access to application tier only.")
    if len(path) > 2:
        tips.append("Reduce lateral movement blast radius by enforcing network ACLs between service layers.")

    if not tips:
        tips.append("Conduct a full security audit and penetration test of the identified attack surface.")

    return "\n".join(f"• {t}" for t in tips)
