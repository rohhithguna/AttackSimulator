"""
ai_explainer.py — Generates structured AI explanation using OpenAI API.

Structured 5-section output:
  1. Executive Summary
  2. Technical Attack Analysis
  3. Risk Justification
  4. Business Impact Interpretation
  5. Mitigation Roadmap

Falls back gracefully when API key is missing or call fails.
"""

import os
import json
from openai import OpenAI


def explain_attack(
    attack_path        : list[str],
    secondary_path     : list[str],
    vulnerability_chain: list[str],
    risk_score         : float,
    severity           : str,
    confidence_score   : int,
    breach_time        : str,
    arch               : dict,
    business_impact    : dict,
) -> dict:
    """
    Call OpenAI to produce a structured 5-section explanation.

    Returns:
        {
            "executive_summary"      : str,
            "technical_analysis"     : str,
            "risk_justification"     : str,
            "business_interpretation": str,
            "mitigation_roadmap"     : str,
            "raw_response"           : str,
            "error"                  : str | None,
        }
    """
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        return _fallback_explanation(
            attack_path, secondary_path, vulnerability_chain,
            risk_score, severity, confidence_score, breach_time,
            arch, business_impact,
        )

    system_prompt = _build_system_prompt()
    user_prompt   = _build_user_prompt(
        attack_path, secondary_path, vulnerability_chain,
        risk_score, severity, confidence_score, breach_time,
        arch, business_impact,
    )

    try:
        client   = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model      = "gpt-4o",
            messages   = [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature = 0.3,
            max_tokens  = 1600,
        )
        raw = response.choices[0].message.content.strip()
        return _parse_llm_response(raw)
    except Exception as e:
        return _fallback_explanation(
            attack_path, secondary_path, vulnerability_chain,
            risk_score, severity, confidence_score, breach_time,
            arch, business_impact, error=str(e),
        )


# ---------------------------------------------------------------------------
# Prompt builders
# ---------------------------------------------------------------------------

def _build_system_prompt() -> str:
    return """You are a senior cybersecurity red-team analyst and risk consultant.
Your task is to explain a simulated infrastructure attack in a structured, professional format
that is useful for both executives and engineers.

Always respond with a JSON object (no markdown fences) containing EXACTLY these keys:
  "executive_summary"       – 2–3 sentences for a non-technical C-suite audience. Focus on business risk.
  "technical_analysis"      – Step-by-step technical explanation of how the attack chain works.
                              Reference specific nodes, ports, and privilege transitions.
  "risk_justification"      – Explain WHY the risk score and confidence level are what they are.
                              Reference the specific factors (exposure, privilege, asset value, chain depth).
  "business_interpretation" – Financial, regulatory, and operational consequences if this attack succeeds.
                              Be specific about compliance implications and recovery cost estimates.
  "mitigation_roadmap"      – Numbered prioritized remediation steps. Be actionable and specific.
                              Each item should include WHAT to do, WHY it matters, and HOW URGENTLY.

Strict requirements:
  - Do not add extra keys beyond the five above.
  - Do not hallucinate vulnerabilities not present in the simulation data.
  - All claims must be justified by the input data provided.
  - Keep technical_analysis under 250 words.
  - Keep mitigation_roadmap as numbered lines."""


def _build_user_prompt(
    attack_path        : list[str],
    secondary_path     : list[str],
    vulnerability_chain: list[str],
    risk_score         : float,
    severity           : str,
    confidence_score   : int,
    breach_time        : str,
    arch               : dict,
    business_impact    : dict,
) -> str:
    secondary_str = (
        " → ".join(secondary_path) if secondary_path
        else "No alternative path identified"
    )
    return f"""Analyze this simulated attack on an infrastructure system:

PRIMARY ATTACK PATH:
{" → ".join(attack_path) if attack_path else "No path identified"}

SECONDARY ATTACK PATH (alternative route):
{secondary_str}

VULNERABILITY CHAIN:
{chr(10).join(f"  {i+1}. {v}" for i, v in enumerate(vulnerability_chain))}

SIMULATION METRICS:
  Risk Score    : {risk_score} / 15+ (severity: {severity})
  Confidence    : {confidence_score}% — how certain the simulation is about this path
  Breach Time   : {breach_time}
  Attack Hops   : {len(attack_path)}

ARCHITECTURE CONTEXT:
  Servers       : {", ".join(arch.get("servers", []))}
  Public-facing : {", ".join(arch.get("public_facing", []))}
  Permissions   : {json.dumps(arch.get("permissions", {}))}
  Asset values  : {json.dumps(arch.get("asset_value", {}))}
  Open ports    : {json.dumps(arch.get("open_ports", {}))}

BUSINESS IMPACT (pre-computed):
  Data risk         : {business_impact.get("data_risk", "")[:120]}...
  Operational risk  : {business_impact.get("operational_risk", "")[:120]}...
  Compliance risk   : {business_impact.get("compliance_risk", "")[:120]}...

Respond with the structured JSON as instructed. Do not add markdown fences."""


# ---------------------------------------------------------------------------
# Response parsing
# ---------------------------------------------------------------------------

def _parse_llm_response(raw: str) -> dict:
    """Extract structured fields from LLM JSON response."""
    try:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            lines   = cleaned.split("\n")
            cleaned = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
        parsed = json.loads(cleaned)
        return {
            "executive_summary"       : parsed.get("executive_summary",       ""),
            "technical_analysis"      : parsed.get("technical_analysis",      ""),
            "risk_justification"      : parsed.get("risk_justification",      ""),
            "business_interpretation" : parsed.get("business_interpretation", ""),
            "mitigation_roadmap"      : parsed.get("mitigation_roadmap",      ""),
            # Legacy compat keys
            "technical_reasoning"     : parsed.get("technical_analysis",      ""),
            "mitigation_strategy"     : parsed.get("mitigation_roadmap",      ""),
            "business_impact"         : parsed.get("business_interpretation", ""),
            "raw_response"            : raw,
            "error"                   : None,
        }
    except json.JSONDecodeError:
        return {
            "executive_summary"       : raw,
            "technical_analysis"      : "",
            "risk_justification"      : "",
            "business_interpretation" : "",
            "mitigation_roadmap"      : "",
            "technical_reasoning"     : "",
            "mitigation_strategy"     : "",
            "business_impact"         : "",
            "raw_response"            : raw,
            "error"                   : "Could not parse structured JSON from LLM response.",
        }


# ---------------------------------------------------------------------------
# Fallback (no API key / API failure)
# ---------------------------------------------------------------------------

def _fallback_explanation(
    attack_path        : list[str],
    secondary_path     : list[str],
    vulnerability_chain: list[str],
    risk_score         : float,
    severity           : str,
    confidence_score   : int,
    breach_time        : str,
    arch               : dict,
    business_impact    : dict,
    error              : str | None = None,
) -> dict:
    """
    Deterministic rule-based fallback explanation when OpenAI is unavailable.
    All content is derived directly from simulation inputs — no hallucination.
    """
    path_str       = " → ".join(attack_path)   if attack_path       else "N/A"
    secondary_str  = " → ".join(secondary_path) if secondary_path    else "None"
    vuln_list      = "; ".join(vulnerability_chain) if vulnerability_chain else "None identified"
    entry          = attack_path[0]  if attack_path else "unknown"
    target         = attack_path[-1] if attack_path else "unknown"

    # ── Executive Summary ─────────────────────────────────────────────────
    executive_summary = (
        f"A {severity}-severity simulated attack was identified with {confidence_score}% confidence, "
        f"capable of breaching your infrastructure within {breach_time}. "
        f"The attack originates at '{entry}' (public-facing) and reaches '{target}' "
        f"(your highest-value asset) via a {len(attack_path)}-hop chain. "
        f"Immediate remediation of the identified entry vectors is recommended."
    )

    # ── Technical Analysis ────────────────────────────────────────────────
    first_vuln = vulnerability_chain[0] if vulnerability_chain else "unknown exploit"
    technical_analysis = (
        f"Attack initiates at '{entry}' using: {first_vuln}.\n"
        f"Full attack path: {path_str}.\n"
        f"Complete vulnerability chain: {vuln_list}.\n"
    )
    if secondary_path:
        technical_analysis += (
            f"Alternative attack path also identified: {secondary_str}. "
            f"Both paths must be mitigated to fully remediate the attack surface.\n"
        )
    perms = arch.get("permissions", {})
    priv_transitions = [
        f"{attack_path[i]} ({perms.get(attack_path[i],'?')}) → {attack_path[i+1]} ({perms.get(attack_path[i+1],'?')})"
        for i in range(len(attack_path)-1)
        if perms.get(attack_path[i]) != perms.get(attack_path[i+1])
    ]
    if priv_transitions:
        technical_analysis += f"Privilege boundary crossings: {'; '.join(priv_transitions)}."

    # ── Risk Justification ────────────────────────────────────────────────
    risk_justification = (
        f"Risk score of {risk_score} ({severity}) is driven by:\n"
        f"• Exposure: '{entry}' is publicly accessible with risky ports {arch.get('open_ports',{}).get(entry,[])}.\n"
        f"• Privilege configuration: path traverses nodes with elevated permissions.\n"
        f"• Asset value: target '{target}' has value "
        f"{arch.get('asset_value',{}).get(target,'?')}/10.\n"
        f"• Chain depth: {len(attack_path)}-hop path adds lateral movement risk.\n"
        f"• Confidence: {confidence_score}% — "
        f"{'high certainty, direct path with known entry vectors' if confidence_score >= 65 else 'moderate certainty, indirect pivots increase uncertainty'}."
    )

    # ── Business Impact Interpretation ────────────────────────────────────
    business_interpretation = (
        f"{business_impact.get('data_risk','')}\n\n"
        f"{business_impact.get('operational_risk','')}\n\n"
        f"{business_impact.get('compliance_risk','')}"
    ).strip()

    # ── Mitigation Roadmap ────────────────────────────────────────────────
    mitigation_roadmap = _rule_based_mitigation(vulnerability_chain, attack_path, arch)

    return {
        "executive_summary"       : executive_summary,
        "technical_analysis"      : technical_analysis,
        "risk_justification"      : risk_justification,
        "business_interpretation" : business_interpretation,
        "mitigation_roadmap"      : mitigation_roadmap,
        # Legacy compat
        "technical_reasoning"     : technical_analysis,
        "mitigation_strategy"     : mitigation_roadmap,
        "business_impact"         : business_interpretation,
        "raw_response"            : "",
        "error"                   : error,
    }


def _rule_based_mitigation(
    vuln_chain : list[str],
    path       : list[str],
    arch       : dict,
) -> str:
    tips: list[tuple[int, str]] = []  # (priority, text)

    if any("SSH" in v or "Port 22" in v for v in vuln_chain):
        tips.append((1, "CRITICAL — Disable password-based SSH. Enforce key-based authentication + MFA on all nodes with port 22 open. Restrict SSH to a bastion host only."))
    if any("Web" in v or "80" in v or "443" in v for v in vuln_chain):
        tips.append((1, "CRITICAL — Deploy a Web Application Firewall (WAF) with OWASP CRS ruleset. Conduct DAST scanning of all public-facing web endpoints."))
    if any("Database" in v or "3306" in v or "5432" in v for v in vuln_chain):
        tips.append((1, "CRITICAL — Remove public exposure of database ports immediately. Restrict DB access to application tier only via security groups / firewall rules."))
    if any("Privilege" in v for v in vuln_chain):
        tips.append((2, "HIGH — Implement least-privilege access controls. Enforce RBAC and regularly audit privilege assignments. Deploy PAM (Privileged Access Management) tooling."))
    if any("Lateral" in v for v in vuln_chain):
        tips.append((2, "HIGH — Enforce network micro-segmentation between all internal tiers. Implement zero-trust architecture: no implicit trust between nodes."))
    if any("Exfiltration" in v for v in vuln_chain):
        tips.append((3, "MEDIUM — Deploy Data Loss Prevention (DLP) tooling. Monitor and alert on abnormal egress traffic. Encrypt data at rest on all high-value nodes."))
    if len(path) > 3:
        tips.append((3, "MEDIUM — Reduce lateral movement blast radius by enforcing strict ACLs and network policies between each service layer. Log all east-west traffic."))

    # General hardening
    tips.append((4, "LOW — Enable centralized SIEM logging for all nodes on the attack path. Set up anomaly detection for privilege escalation patterns."))
    tips.append((4, "LOW — Schedule a full penetration test of the identified attack surface. Validate all remediations with adversarial simulation."))

    tips.sort(key=lambda x: x[0])
    return "\n".join(f"{i+1}. [{['CRITICAL','CRITICAL','HIGH','MEDIUM','LOW'][min(t[0],4)]}] {t[1]}" for i, t in enumerate(tips))
