"""
breach_time.py — Estimates total breach time based on attack steps.

Time model (minutes per step type):
    Initial Exploit        → 30
    Privilege Escalation   → 20
    Lateral Movement       → 15
    Data Exfiltration      → 25

Each node on the path contributes based on its primary step type.
"""

from core.attack_engine import STEP_EXPLOIT, STEP_PRIV_ESC, STEP_LATERAL, STEP_EXFILTRATION


# ---------------------------------------------------------------------------
# Time constants (minutes)
# ---------------------------------------------------------------------------
STEP_TIME = {
    STEP_EXPLOIT      : 30,
    STEP_PRIV_ESC     : 20,
    STEP_LATERAL      : 15,
    STEP_EXFILTRATION : 25,
}

# Modifiers based on privilege level
PRIVILEGE_MODIFIER = {
    "low"   : 0.75,   # easier — faster
    "medium": 1.0,
    "high"  : 1.4,    # hardened — slower
}

# Port risk speeds up initial exploit
PORT_SPEED_BONUS = {
    22   : -5,    # SSH brute-force is fast once credentials leak
    80   : -3,
    443  : -3,
    3306 : -8,    # DB exposed = very fast
    5432 : -8,
    27017: -8,
}


def estimate_breach_time(attack_steps: list[dict]) -> dict:
    """
    Calculate breach time from the ordered list of attack steps.

    Returns:
        {
            "total_minutes"   : int,
            "total_hours"     : float,
            "breakdown"       : list[dict],   # per-step detail
            "display"         : str,          # human-readable string
        }
    """
    if not attack_steps:
        return {
            "total_minutes": 0,
            "total_hours"  : 0.0,
            "breakdown"    : [],
            "display"      : "0 minutes",
        }

    breakdown = []
    total     = 0

    for step in attack_steps:
        step_type = step["step_type"]
        perm      = step.get("permission", "medium")
        ports     = step.get("ports", [])

        base_time = STEP_TIME.get(step_type, 15)
        modifier  = PRIVILEGE_MODIFIER.get(perm, 1.0)
        port_adj  = sum(PORT_SPEED_BONUS.get(p, 0) for p in ports)

        adjusted = max(5, int(base_time * modifier) + port_adj)
        total   += adjusted

        breakdown.append({
            "node"        : step["node"],
            "step_type"   : step_type,
            "base_minutes": base_time,
            "adjusted_minutes": adjusted,
            "modifier"    : modifier,
            "port_adjustment": port_adj,
        })

    total_hours = round(total / 60, 2)
    display     = _format_time(total)

    return {
        "total_minutes": total,
        "total_hours"  : total_hours,
        "breakdown"    : breakdown,
        "display"      : display,
    }


def _format_time(minutes: int) -> str:
    if minutes < 60:
        return f"{minutes} minutes"
    hours   = minutes // 60
    mins    = minutes % 60
    h_label = "hour" if hours == 1 else "hours"
    if mins == 0:
        return f"{hours} {h_label}"
    return f"{hours} {h_label} {mins} minutes"
