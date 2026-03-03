"""
business_impact.py — Deterministic business impact modeling.

Derives three impact dimensions from the simulation results using
rule-based logic only (no ML, no external API).

Output schema:
    {
        "data_risk"        : str,   # data exposure / exfiltration risk
        "operational_risk" : str,   # service disruption risk
        "compliance_risk"  : str,   # regulatory / compliance exposure
        "summary_tags"     : list,  # machine-readable short tags
    }

Thresholds (configurable):
    HIGH_ASSET_THRESHOLD  = 7     # asset_value >= this triggers data risk
    RAPID_BREACH_MINUTES  = 60    # breach faster than this = rapid compromise
    CRITICAL_SEVERITY     = {"Critical", "High"}
"""

HIGH_ASSET_THRESHOLD  = 7
RAPID_BREACH_MINUTES  = 60


def compute_business_impact(
    sim_result     : dict,
    score_result   : dict,
    time_result    : dict,
    confidence_result: dict,
    arch           : dict,
) -> dict:
    """
    Compute business impact from simulation outputs.

    All logic is deterministic rule-based — no randomness, no LLM.
    """
    path           = sim_result.get("attack_path", [])
    severity       = score_result.get("severity", "Low")
    risk_score     = score_result.get("risk_score", 0)
    total_minutes  = time_result.get("total_minutes", 999)
    confidence     = confidence_result.get("confidence_score", 50)
    target         = sim_result.get("target", "unknown")
    asset_values   = arch.get("asset_value", {})
    permissions    = arch.get("permissions", {})
    public_facing  = arch.get("public_facing", [])

    tags: list[str] = []

    # ── Data Risk ─────────────────────────────────────────────────────────────
    target_value = asset_values.get(target, 0)
    high_value_nodes = [
        n for n, v in asset_values.items()
        if v >= HIGH_ASSET_THRESHOLD and n in path
    ]

    if target_value >= HIGH_ASSET_THRESHOLD:
        if severity in ("Critical", "High"):
            data_risk = (
                f"CRITICAL DATA EXPOSURE: The target node '{target}' carries a high asset "
                f"value of {target_value}/10. Compromise would result in potential exfiltration "
                f"of sensitive data including PII, intellectual property, or financial records. "
                f"Immediate containment protocols are warranted."
            )
            tags.append("critical-data-exposure")
        else:
            data_risk = (
                f"ELEVATED DATA RISK: Node '{target}' (asset value {target_value}/10) "
                f"is reachable on the simulated attack path. Data exfiltration is plausible "
                f"if the attacker completes the {len(path)}-hop chain."
            )
            tags.append("elevated-data-risk")
    elif high_value_nodes:
        data_risk = (
            f"MODERATE DATA RISK: High-value intermediate nodes ({', '.join(high_value_nodes)}) "
            f"are on the attack path. Partial data exposure is possible even if the final "
            f"exfiltration target is not reached."
        )
        tags.append("moderate-data-risk")
    else:
        data_risk = (
            "LOW DATA RISK: No high-value assets (≥7/10) appear on the simulated attack path. "
            "Data exposure risk is limited to low-sensitivity infrastructure."
        )
        tags.append("low-data-risk")

    # ── Operational Risk ──────────────────────────────────────────────────────
    if total_minutes < RAPID_BREACH_MINUTES and confidence >= 65:
        operational_risk = (
            f"RAPID COMPROMISE WARNING: Estimated breach time of {_fmt(total_minutes)} "
            f"with {confidence}% confidence means an attacker could achieve full access "
            f"before most incident response teams complete initial triage (avg. ~2 hours). "
            f"Automated response controls are essential."
        )
        tags.append("rapid-compromise")
    elif severity in ("Critical", "High"):
        operational_risk = (
            f"SIGNIFICANT OPERATIONAL DISRUPTION: A {severity}-severity breach affecting "
            f"{len(path)} nodes could result in service outages, data corruption, or "
            f"ransomware deployment. Recovery time objective (RTO) may exceed 24–72 hours "
            f"for critical infrastructure nodes."
        )
        tags.append("service-disruption-risk")
    elif len(path) >= 3:
        operational_risk = (
            f"MODERATE OPERATIONAL RISK: The {len(path)}-hop attack chain touches multiple "
            f"infrastructure tiers. Lateral movement through internal nodes risks cascading "
            f"failures if an attacker establishes persistence."
        )
        tags.append("lateral-disruption-risk")
    else:
        operational_risk = (
            "LIMITED OPERATIONAL RISK: The simulated attack path is short and contained. "
            "Disruption would likely be isolated to the compromised nodes without "
            "broader cascading impact — provided network segmentation is in place."
        )
        tags.append("contained-operational-risk")

    # ── Compliance Risk ───────────────────────────────────────────────────────
    high_perm_nodes_on_path = [
        n for n in path
        if permissions.get(n, "low") == "high"
    ]
    multiple_public = len(public_facing) > 1
    has_db_nodes    = any(
        "db" in n.lower() or "storage" in n.lower() or "vault" in n.lower() or "backup" in n.lower()
        for n in path
    )

    compliance_parts = []

    if has_db_nodes and target_value >= HIGH_ASSET_THRESHOLD:
        compliance_parts.append(
            "GDPR/CCPA Exposure: Database and storage nodes on the breach path indicate "
            "potential access to personally identifiable information (PII). Reportable breach "
            "obligations may apply within 72 hours under GDPR Article 33."
        )
        tags.append("gdpr-exposure")

    if high_perm_nodes_on_path:
        compliance_parts.append(
            f"SOC 2 / ISO 27001 Risk: High-privilege nodes ({', '.join(high_perm_nodes_on_path)}) "
            f"are compromised in this scenario. Privileged access management (PAM) controls "
            f"and audit trails would be required evidence for compliance review."
        )
        tags.append("privileged-access-compliance")

    if risk_score >= 9:
        compliance_parts.append(
            "PCI DSS Risk: High risk score suggests inadequate network segmentation. "
            "If payment data resides anywhere in this architecture, PCI DSS Requirement 1 "
            "(network controls) and Requirement 7 (access restriction) may be violated."
        )
        tags.append("pci-dss-risk")

    if multiple_public:
        compliance_parts.append(
            "Attack Surface Compliance: Multiple public-facing nodes increase the regulatory "
            "audit surface. NIST CSF PR.AC-3 (remote access management) controls should be reviewed."
        )
        tags.append("attack-surface-compliance")

    if not compliance_parts:
        compliance_risk = (
            "No immediate high-priority compliance violations identified in this simulated "
            "scenario. Standard security controls and regular penetration testing are recommended."
        )
    else:
        compliance_risk = "\n\n".join(compliance_parts)

    return {
        "data_risk"       : data_risk,
        "operational_risk": operational_risk,
        "compliance_risk" : compliance_risk,
        "summary_tags"    : tags,
    }


def _fmt(minutes: int) -> str:
    if minutes < 60:
        return f"{minutes} minutes"
    h = minutes // 60
    m = minutes % 60
    return f"{h}h {m}m" if m else f"{h}h"
