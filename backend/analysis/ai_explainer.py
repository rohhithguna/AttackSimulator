"""
ai_explainer.py — Dual AI explanation system (Edge + Cloud).

Supports two AI providers:
  1. Edge AI  — Local LM Studio (qwen3.5-4b), on-device inference
  2. Cloud AI — Google Gemini (gemini-2.5-flash), cloud-based analysis

Zero external dependencies — stdlib only (urllib, json, threading).
Both providers run in parallel. Graceful fallback if either is unavailable.
"""

import json
import os
import threading
import urllib.request
import urllib.error


# ── Edge AI (LM Studio) ─────────────────────────────────────────────────────
_LM_STUDIO_URL   = "http://127.0.0.1:1234/v1/chat/completions"
_LM_STUDIO_KEY   = "lm-studio"
_LM_STUDIO_MODEL = "qwen3.5-4b"
_EDGE_TIMEOUT    = 30

# ── Cloud AI (Google Gemini) ─────────────────────────────────────────────────
_GEMINI_MODEL    = "gemini-2.5-flash"
_GEMINI_URL      = f"https://generativelanguage.googleapis.com/v1beta/models/{_GEMINI_MODEL}:generateContent"
_CLOUD_TIMEOUT   = 20


# ═══════════════════════════════════════════════════════════════════════════════
# Public API
# ═══════════════════════════════════════════════════════════════════════════════

def explain_attack(
    attack_path: list[str],
    secondary_path: list[str],
    vulnerability_chain: list[str],
    risk_score: float,
    severity: str,
    confidence_score: int,
    breach_time: str,
    arch: dict,
    business_impact: dict,
) -> dict:
    """
    Generate AI insights from both Edge and Cloud providers in parallel.
    Never blocks the simulation — returns fallback messages on failure.
    """
    edge_box: dict = {}
    cloud_box: dict = {}

    def run_edge():
        edge_box["r"] = _edge_ai(attack_path, risk_score, severity, confidence_score, breach_time)

    def run_cloud():
        cloud_box["r"] = _cloud_ai(attack_path, risk_score, severity, confidence_score, breach_time)

    t1 = threading.Thread(target=run_edge, daemon=True)
    t2 = threading.Thread(target=run_cloud, daemon=True)
    t1.start()
    t2.start()
    t1.join(timeout=_EDGE_TIMEOUT + 5)
    t2.join(timeout=_CLOUD_TIMEOUT + 5)

    edge = edge_box.get("r", _make("LM Studio", _LM_STUDIO_MODEL, error="Edge AI timeout"))
    cloud = cloud_box.get("r", _make("Google Gemini", _GEMINI_MODEL, error="Cloud AI timeout"))

    # Backward compat: use edge insight as primary
    primary = edge["insight"] if not edge["error"] else ""

    return {
        "executive_summary": primary,
        "technical_analysis": "",
        "risk_justification": "",
        "business_interpretation": "",
        "mitigation_roadmap": "",
        "technical_reasoning": "",
        "mitigation_strategy": "",
        "business_impact": "",
        "raw_response": primary,
        "error": edge.get("error"),
        "edge_ai": edge,
        "cloud_ai": cloud,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Edge AI — Local LM Studio
# ═══════════════════════════════════════════════════════════════════════════════

def _edge_ai(attack_path, risk_score, severity, confidence_score, breach_time) -> dict:
    path_str = " → ".join(attack_path) if attack_path else "N/A"

    body = json.dumps({
        "model": _LM_STUDIO_MODEL,
        "messages": [
            {"role": "system", "content": "You are a cybersecurity analyst interpreting simulated attack paths. Base the insight strictly on the given attack path and metrics. Do not give generic advice."},
            {"role": "user", "content": f"Attack path: {path_str}\nRisk score: {risk_score}, Severity: {severity}, Confidence: {confidence_score}%, Breach time: {breach_time}\nDescribe how this specific attack path leads to compromise, what asset is at risk, and the main weakness exploited. 4 to 6 lines only."}
        ],
        "temperature": 0.3,
        "top_p": 0.9,
        "max_tokens": 60,
    }).encode()

    try:
        req = urllib.request.Request(
            _LM_STUDIO_URL,
            data=body,
            headers={"Authorization": f"Bearer {_LM_STUDIO_KEY}", "Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=_EDGE_TIMEOUT) as resp:
            data = json.loads(resp.read())

        text = data["choices"][0]["message"]["content"].strip()
        return _make("LM Studio", _LM_STUDIO_MODEL, insight=text)

    except urllib.error.URLError as e:
        return _make("LM Studio", _LM_STUDIO_MODEL,
                      error=f"LM Studio unreachable: {e.reason}",
                      insight="Edge Intelligence unavailable. Run the simulator locally with LM Studio to enable on-device AI insights.")
    except Exception as e:
        return _make("LM Studio", _LM_STUDIO_MODEL, error=str(e),
                      insight="Edge Intelligence unavailable.")


# ═══════════════════════════════════════════════════════════════════════════════
# Cloud AI — Google Gemini (direct REST API, no SDK)
# ═══════════════════════════════════════════════════════════════════════════════

def _cloud_ai(attack_path, risk_score, severity, confidence_score, breach_time) -> dict:
    api_key = os.environ.get("GEMINI_API_KEY", "")

    if not api_key:
        return _make("Google Gemini", _GEMINI_MODEL,
                      error="GEMINI_API_KEY not configured",
                      insight="Cloud Intelligence unavailable. GEMINI_API_KEY not configured.")

    path_str = " → ".join(attack_path) if attack_path else "N/A"
    prompt = (
        "You are a cybersecurity analyst. "
        "Generate a concise security insight in 4-8 lines. "
        "Be direct. No markdown. No bullet points.\n\n"
        f"Attack path: {path_str}\n"
        f"Risk score: {risk_score}\n"
        f"Severity: {severity}\n"
        f"Confidence: {confidence_score}%\n"
        f"Estimated breach time: {breach_time}\n\n"
        "Explain the attack risk, impact, and key mitigation steps briefly."
    )

    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 400,
            "thinkingConfig": {"thinkingBudget": 0},
        },
    }).encode()

    try:
        req = urllib.request.Request(
            f"{_GEMINI_URL}?key={api_key}",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=_CLOUD_TIMEOUT) as resp:
            data = json.loads(resp.read())

        # Extract text from the response parts (skip thinking parts)
        parts = data["candidates"][0]["content"]["parts"]
        text_parts = [p["text"] for p in parts if "text" in p and not p.get("thought")]
        text = "\n".join(text_parts).strip()

        if not text:
            return _make("Google Gemini", _GEMINI_MODEL,
                          error="Empty response from Gemini",
                          insight="Cloud AI returned an empty response.")

        return _make("Google Gemini", _GEMINI_MODEL, insight=text)

    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")[:200]
        return _make("Google Gemini", _GEMINI_MODEL,
                      error=f"Gemini API {e.code}: {err_body}",
                      insight="Cloud AI unavailable. Check your API key and quota.")
    except urllib.error.URLError as e:
        return _make("Google Gemini", _GEMINI_MODEL,
                      error=f"Gemini unreachable: {e.reason}",
                      insight="Cloud AI unavailable. Network error.")
    except Exception as e:
        return _make("Google Gemini", _GEMINI_MODEL,
                      error=str(e),
                      insight="Cloud AI unavailable.")


# ═══════════════════════════════════════════════════════════════════════════════
# Helper
# ═══════════════════════════════════════════════════════════════════════════════

def _make(provider: str, model: str, insight: str = "", error: str | None = None) -> dict:
    return {"insight": insight, "error": error, "provider": provider, "model": model}
