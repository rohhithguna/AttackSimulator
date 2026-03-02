"""
app.py — Streamlit dashboard for the AI Attack Simulation Agent.

Run with:
    streamlit run app.py
"""

import sys
import os
import json
import streamlit as st

# Ensure project modules resolve
sys.path.insert(0, os.path.dirname(__file__))

from parser       import parse_input, ParseError
from graph_engine import build_graph, graph_summary
from attack_engine import simulate_attack
from scoring      import calculate_risk, severity_color
from breach_time  import estimate_breach_time
from ai_explainer import explain_attack
from visualization import build_plotly_graph


# ---------------------------------------------------------------------------
# Page config
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title = "RedTeam Box — AI Attack Simulation",
    page_icon  = "🔴",
    layout     = "wide",
    initial_sidebar_state = "expanded",
)

# ---------------------------------------------------------------------------
# Custom CSS
# ---------------------------------------------------------------------------
st.markdown("""
<style>
    /* Dark theme overrides */
    .stApp { background-color: #0d1117; color: #c9d1d9; }
    section[data-testid="stSidebar"] { background-color: #161b22; }
    
    .metric-card {
        background: #161b22;
        border: 1px solid #30363d;
        border-radius: 10px;
        padding: 16px 20px;
        text-align: center;
    }
    .metric-card .label {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #8b949e;
        margin-bottom: 6px;
    }
    .metric-card .value {
        font-size: 28px;
        font-weight: 700;
        color: #e6edf3;
    }
    
    .severity-badge {
        display: inline-block;
        padding: 6px 18px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 1px;
        text-transform: uppercase;
    }
    
    .path-step {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin: 4px 0;
    }
    
    .vuln-tag {
        display: inline-block;
        background: #21262d;
        border: 1px solid #f0883e44;
        border-radius: 6px;
        padding: 4px 12px;
        font-size: 13px;
        color: #f0883e;
        margin: 3px 4px;
    }
    
    .section-header {
        font-size: 16px;
        font-weight: 600;
        color: #e6edf3;
        border-bottom: 1px solid #30363d;
        padding-bottom: 8px;
        margin-bottom: 14px;
    }
    
    .ai-card {
        background: #161b22;
        border: 1px solid #30363d;
        border-left: 3px solid #58a6ff;
        border-radius: 8px;
        padding: 16px 20px;
        margin-bottom: 14px;
    }
    .ai-card h4 {
        color: #58a6ff;
        margin: 0 0 8px 0;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    .ai-card p {
        color: #c9d1d9;
        margin: 0;
        line-height: 1.6;
        font-size: 14px;
    }
    
    .mitigation-item {
        background: #0d1117;
        border-left: 3px solid #3fb950;
        padding: 8px 14px;
        margin: 6px 0;
        border-radius: 0 6px 6px 0;
        color: #c9d1d9;
        font-size: 14px;
    }

    div[data-testid="stAlert"] {
        background: #161b22;
        border: 1px solid #30363d;
    }

    .stButton > button {
        background: linear-gradient(135deg, #e74c3c, #c0392b) !important;
        color: white !important;
        border: none !important;
        border-radius: 8px !important;
        padding: 10px 28px !important;
        font-weight: 600 !important;
        font-size: 15px !important;
        letter-spacing: 0.5px !important;
        width: 100%;
    }
    .stButton > button:hover {
        background: linear-gradient(135deg, #c0392b, #a93226) !important;
    }
    
    .stTextArea textarea {
        background-color: #161b22 !important;
        color: #c9d1d9 !important;
        border: 1px solid #30363d !important;
        font-family: 'Fira Code', 'Courier New', monospace !important;
        font-size: 13px !important;
    }
</style>
""", unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# Sidebar
# ---------------------------------------------------------------------------
with st.sidebar:
    st.markdown("""
    <div style='text-align:center; padding: 10px 0 20px 0;'>
        <div style='font-size:36px;'>🔴</div>
        <div style='font-size:20px; font-weight:700; color:#e6edf3;'>RedTeam Box</div>
        <div style='font-size:12px; color:#8b949e; letter-spacing:2px;'>AI ATTACK SIMULATION</div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("---")
    st.markdown("### Configuration")

    openai_key = st.text_input(
        "OpenAI API Key (optional)",
        type="password",
        placeholder="sk-...",
        help="If provided, uses GPT-4o for AI explanations. Falls back to rule-based if empty.",
    )
    if openai_key:
        os.environ["OPENAI_API_KEY"] = openai_key

    st.markdown("---")
    st.markdown("""
    <div style='font-size:12px; color:#8b949e; line-height:1.8;'>
    <b style='color:#58a6ff;'>Input Fields:</b><br>
    • <code>servers</code> — list of node names<br>
    • <code>connections</code> — directed edges<br>
    • <code>open_ports</code> — per-server ports<br>
    • <code>permissions</code> — low/medium/high<br>
    • <code>asset_value</code> — 1–10 importance score<br>
    • <code>public_facing</code> — internet-exposed nodes
    </div>
    """, unsafe_allow_html=True)

    st.markdown("---")
    st.markdown("""
    <div style='font-size:11px; color:#484f58; text-align:center;'>
    For educational & CTF purposes only.<br>
    Not a real vulnerability scanner.
    </div>
    """, unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# Default JSON
# ---------------------------------------------------------------------------
DEFAULT_JSON = json.dumps({
    "servers"     : ["web", "app", "db", "storage", "backup"],
    "connections" : [
        ["web", "app"],
        ["app", "db"],
        ["db", "storage"],
        ["storage", "backup"],
        ["app", "storage"]
    ],
    "open_ports"  : {
        "web"    : [80, 443, 22],
        "app"    : [8080, 22],
        "db"     : [3306],
        "storage": [22],
        "backup" : []
    },
    "permissions" : {
        "web"    : "low",
        "app"    : "medium",
        "db"     : "high",
        "storage": "high",
        "backup" : "high"
    },
    "asset_value" : {
        "web"    : 3,
        "app"    : 5,
        "db"     : 8,
        "storage": 9,
        "backup" : 10
    },
    "public_facing": ["web"]
}, indent=2)


# ---------------------------------------------------------------------------
# Main layout
# ---------------------------------------------------------------------------
st.markdown("""
<div style='padding: 10px 0 24px 0;'>
    <h1 style='color:#e6edf3; font-size:28px; margin:0;'>
        AI Attack Simulation Agent
    </h1>
    <p style='color:#8b949e; margin:6px 0 0 0; font-size:15px;'>
        Red Team in a Box — Predictive attack path reasoning from infrastructure architecture
    </p>
</div>
""", unsafe_allow_html=True)

col_input, col_results = st.columns([1, 2], gap="large")

# --- Input column ---
with col_input:
    st.markdown('<div class="section-header">Architecture Input (JSON)</div>', unsafe_allow_html=True)

    json_input = st.text_area(
        label        = "Architecture JSON",
        value        = DEFAULT_JSON,
        height       = 420,
        label_visibility = "collapsed",
    )

    simulate_btn = st.button("⚡ Run Attack Simulation", use_container_width=True)

    st.markdown("")

    with st.expander("Load Example Scenarios"):
        scenarios = {
            "Simple Web → DB"      : {"servers": ["web", "db"], "connections": [["web", "db"]], "open_ports": {"web": [80, 22]}, "permissions": {"web": "low", "db": "high"}, "asset_value": {"web": 3, "db": 9}, "public_facing": ["web"]},
            "Multi-tier Enterprise": json.loads(DEFAULT_JSON),
            "Exposed DB"           : {"servers": ["web", "db"], "connections": [["web", "db"]], "open_ports": {"web": [80], "db": [3306]}, "permissions": {"web": "low", "db": "medium"}, "asset_value": {"web": 2, "db": 8}, "public_facing": ["web", "db"]},
        }
        for name, scenario in scenarios.items():
            if st.button(f"Load: {name}", key=f"scenario_{name}"):
                st.session_state["loaded_json"] = json.dumps(scenario, indent=2)
                st.rerun()

    if "loaded_json" in st.session_state:
        json_input = st.session_state.pop("loaded_json")
        st.rerun()


# --- Results column ---
with col_results:
    if not simulate_btn:
        st.markdown("""
        <div style='
            background:#161b22;
            border:1px dashed #30363d;
            border-radius:10px;
            padding:60px 40px;
            text-align:center;
            margin-top:20px;
        '>
            <div style='font-size:48px; margin-bottom:16px;'>🎯</div>
            <div style='color:#8b949e; font-size:15px;'>
                Paste your infrastructure JSON and click<br>
                <b style='color:#58a6ff;'>Run Attack Simulation</b> to begin.
            </div>
        </div>
        """, unsafe_allow_html=True)
    else:
        # ---- Run simulation ----
        with st.spinner("Simulating attack..."):
            try:
                arch        = parse_input(json_input)
                G           = build_graph(arch)
                sim_result  = simulate_attack(G, arch)

                if sim_result.get("error"):
                    st.error(f"Simulation Error: {sim_result['error']}")
                    st.stop()

                score_result = calculate_risk(G, sim_result)
                time_result  = estimate_breach_time(sim_result["attack_steps"])
                ai_result    = explain_attack(
                    attack_path        = sim_result["attack_path"],
                    vulnerability_chain= sim_result["vulnerability_chain"],
                    risk_score         = score_result["risk_score"],
                    severity           = score_result["severity"],
                    breach_time        = time_result["display"],
                    arch               = arch,
                )

            except ParseError as e:
                st.error(f"Input Error: {e}")
                st.stop()
            except Exception as e:
                st.error(f"Unexpected error: {e}")
                st.stop()

        # ================================================================
        # Metrics row
        # ================================================================
        sev       = score_result["severity"]
        sev_color = severity_color(sev)

        m1, m2, m3, m4 = st.columns(4)
        with m1:
            st.markdown(f"""
            <div class="metric-card">
                <div class="label">Risk Score</div>
                <div class="value" style="color:{sev_color};">{score_result['risk_score']}</div>
            </div>""", unsafe_allow_html=True)
        with m2:
            st.markdown(f"""
            <div class="metric-card">
                <div class="label">Severity</div>
                <div class="value">
                    <span class="severity-badge" style="background:{sev_color}22; color:{sev_color}; border:1px solid {sev_color}44;">
                        {sev}
                    </span>
                </div>
            </div>""", unsafe_allow_html=True)
        with m3:
            st.markdown(f"""
            <div class="metric-card">
                <div class="label">Breach Time</div>
                <div class="value" style="font-size:20px; padding-top:4px;">{time_result['display']}</div>
            </div>""", unsafe_allow_html=True)
        with m4:
            st.markdown(f"""
            <div class="metric-card">
                <div class="label">Hops in Path</div>
                <div class="value">{len(sim_result['attack_path'])}</div>
            </div>""", unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)

        # ================================================================
        # Graph visualization
        # ================================================================
        st.markdown('<div class="section-header">Attack Graph</div>', unsafe_allow_html=True)

        fig = build_plotly_graph(
            G           = G,
            attack_path = sim_result["attack_path"],
            entry_point = sim_result["entry_point"],
            target      = sim_result["target"],
        )
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

        # ================================================================
        # Attack path + vulnerability chain (side by side)
        # ================================================================
        col_path, col_vuln = st.columns(2, gap="medium")

        with col_path:
            st.markdown('<div class="section-header">Attack Path</div>', unsafe_allow_html=True)
            path = sim_result["attack_path"]
            for i, node in enumerate(path):
                step = sim_result["attack_steps"][i]
                icon = {"Initial Exploit": "🔓", "Lateral Movement": "➡️", "Data Exfiltration": "💀"}.get(step["step_type"], "⚡")
                arrow = " ↓" if i < len(path) - 1 else ""
                st.markdown(f"""
                <div style='
                    background:#161b22;
                    border:1px solid #30363d;
                    border-radius:8px;
                    padding:10px 14px;
                    margin-bottom:6px;
                    display:flex;
                    align-items:center;
                    gap:10px;
                '>
                    <span style='font-size:18px;'>{icon}</span>
                    <div>
                        <div style='color:#e6edf3; font-weight:600;'>{node}</div>
                        <div style='color:#8b949e; font-size:12px;'>{step["step_type"]} · Asset Value: {step["asset_value"]}</div>
                    </div>
                    <span style='margin-left:auto; color:#8b949e;'>{arrow}</span>
                </div>""", unsafe_allow_html=True)

        with col_vuln:
            st.markdown('<div class="section-header">Vulnerability Chain</div>', unsafe_allow_html=True)
            for i, vuln in enumerate(sim_result["vulnerability_chain"]):
                st.markdown(f"""
                <div style='
                    background:#161b22;
                    border:1px solid #f0883e44;
                    border-left:3px solid #f0883e;
                    border-radius:0 8px 8px 0;
                    padding:10px 14px;
                    margin-bottom:6px;
                '>
                    <span style='color:#8b949e; font-size:11px; margin-right:8px;'>#{i+1}</span>
                    <span style='color:#f0883e; font-size:13px;'>{vuln}</span>
                </div>""", unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)

        # ================================================================
        # Breach time breakdown
        # ================================================================
        with st.expander("Breach Time Breakdown"):
            cols = st.columns(len(time_result["breakdown"]) or 1)
            for i, step in enumerate(time_result["breakdown"]):
                with cols[i % len(cols)]:
                    st.markdown(f"""
                    <div class="metric-card" style='margin-bottom:8px;'>
                        <div class="label">{step['node']}</div>
                        <div style='font-size:13px; color:#58a6ff;'>{step['step_type']}</div>
                        <div class="value" style='font-size:22px;'>{step['adjusted_minutes']}m</div>
                    </div>""", unsafe_allow_html=True)

        # ================================================================
        # Risk score breakdown
        # ================================================================
        with st.expander("Risk Score Breakdown"):
            comps = score_result["component_scores"]
            c1, c2, c3, c4 = st.columns(4)
            for col, (key, val) in zip([c1, c2, c3, c4], comps.items()):
                with col:
                    label = key.replace("_", " ").title()
                    st.markdown(f"""
                    <div class="metric-card">
                        <div class="label">{label}</div>
                        <div class="value" style='font-size:22px;'>{val}</div>
                    </div>""", unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)

        # ================================================================
        # AI Explanation
        # ================================================================
        st.markdown('<div class="section-header">AI Analysis</div>', unsafe_allow_html=True)

        if ai_result.get("error") and not ai_result.get("executive_summary"):
            st.warning(f"AI explanation unavailable: {ai_result['error']}")
        else:
            if ai_result.get("error"):
                st.info(f"Note: {ai_result['error']} — showing rule-based analysis.")

            ai_sections = [
                ("Executive Summary",   "📋", ai_result.get("executive_summary", "")),
                ("Technical Reasoning", "⚙️",  ai_result.get("technical_reasoning", "")),
                ("Business Impact",     "💼", ai_result.get("business_impact", "")),
            ]
            for title, icon, content in ai_sections:
                if content:
                    st.markdown(f"""
                    <div class="ai-card">
                        <h4>{icon} {title}</h4>
                        <p>{content}</p>
                    </div>""", unsafe_allow_html=True)

        # ================================================================
        # Mitigation
        # ================================================================
        st.markdown("<br>", unsafe_allow_html=True)
        st.markdown('<div class="section-header">Mitigation Recommendations</div>', unsafe_allow_html=True)

        mitigation_text = ai_result.get("mitigation_strategy", "")
        if mitigation_text:
            lines = [l.strip() for l in mitigation_text.split("\n") if l.strip()]
            for line in lines:
                clean = line.lstrip("•-–1234567890. ").strip()
                if clean:
                    st.markdown(f"""
                    <div class="mitigation-item">
                        <span style='color:#3fb950; margin-right:8px;'>✓</span>{clean}
                    </div>""", unsafe_allow_html=True)
        else:
            st.info("No mitigation recommendations generated.")

        st.markdown("<br>", unsafe_allow_html=True)

        # ================================================================
        # Raw JSON output
        # ================================================================
        with st.expander("Raw Simulation Output (JSON)"):
            output = {
                "attack_path"         : sim_result["attack_path"],
                "vulnerability_chain" : sim_result["vulnerability_chain"],
                "risk_score"          : score_result["risk_score"],
                "severity"            : score_result["severity"],
                "breach_time_estimate": time_result["display"],
                "mitigation"          : ai_result.get("mitigation_strategy", ""),
                "ai_explanation"      : ai_result.get("executive_summary", ""),
            }
            st.code(json.dumps(output, indent=2), language="json")
