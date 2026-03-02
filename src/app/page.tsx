"use client";

import { useState, useCallback } from "react";
import AttackGraph from "@/components/AttackGraph";
import AttackChain from "@/components/AttackChain";
import MetricsRow from "@/components/MetricsRow";
import AIExplanation, { MitigationSection } from "@/components/AIExplanation";
import type { SimulationResult } from "@/lib/types";

const DEFAULT_JSON = JSON.stringify(
  {
    servers: ["web", "app", "db", "storage", "backup"],
    connections: [
      ["web", "app"],
      ["app", "db"],
      ["db", "storage"],
      ["storage", "backup"],
      ["app", "storage"],
    ],
    open_ports: {
      web: [80, 443, 22],
      app: [8080, 22],
      db: [3306],
      storage: [22],
      backup: [],
    },
    permissions: {
      web: "low",
      app: "medium",
      db: "high",
      storage: "high",
      backup: "high",
    },
    asset_value: {
      web: 3,
      app: 5,
      db: 8,
      storage: 9,
      backup: 10,
    },
    public_facing: ["web"],
  },
  null,
  2
);

const SCENARIOS: Record<string, object> = {
  "Simple Web → DB": {
    servers: ["web", "db"],
    connections: [["web", "db"]],
    open_ports: { web: [80, 22] },
    permissions: { web: "low", db: "high" },
    asset_value: { web: 3, db: 9 },
    public_facing: ["web"],
  },
  "Multi-tier Enterprise": JSON.parse(DEFAULT_JSON),
  "Exposed Database": {
    servers: ["web", "db"],
    connections: [["web", "db"]],
    open_ports: { web: [80], db: [3306] },
    permissions: { web: "low", db: "medium" },
    asset_value: { web: 2, db: 8 },
    public_facing: ["web", "db"],
  },
  "Deep Chain": {
    servers: ["dmz", "proxy", "app", "internal", "vault"],
    connections: [
      ["dmz", "proxy"],
      ["proxy", "app"],
      ["app", "internal"],
      ["internal", "vault"],
    ],
    open_ports: { dmz: [80, 443, 22], proxy: [8080], app: [3000], internal: [22], vault: [] },
    permissions: { dmz: "low", proxy: "low", app: "medium", internal: "high", vault: "high" },
    asset_value: { dmz: 2, proxy: 3, app: 6, internal: 8, vault: 10 },
    public_facing: ["dmz"],
  },
};

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "13px",
        fontWeight: 600,
        color: "#e6edf3",
        borderBottom: "1px solid #30363d",
        paddingBottom: "8px",
        marginBottom: "16px",
        textTransform: "uppercase",
        letterSpacing: "1px",
      }}
    >
      {children}
    </div>
  );
}

function Expandable({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        border: "1px solid #30363d",
        borderRadius: "8px",
        marginBottom: "12px",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          background: "#161b22",
          border: "none",
          padding: "12px 16px",
          textAlign: "left",
          cursor: "pointer",
          color: "#8b949e",
          fontSize: "13px",
          fontWeight: 600,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: "12px", opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ background: "#0d1117", padding: "16px" }}>{children}</div>
      )}
    </div>
  );
}

export default function Home() {
  const [jsonInput, setJsonInput] = useState(DEFAULT_JSON);
  const [openaiKey, setOpenaiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showScenarios, setShowScenarios] = useState(false);
  const [activeTab, setActiveTab] = useState<"analysis" | "raw">("analysis");

  const runSimulation = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setActiveTab("analysis");

    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonInput);
      } catch {
        throw new Error("Invalid JSON input. Please check your syntax.");
      }

      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          architecture: parsed,
          openai_key: openaiKey,
        }),
      });

      const data: SimulationResult & { error?: string } = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [jsonInput, openaiKey]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d1117",
        color: "#c9d1d9",
        fontFamily: "var(--font-geist-sans), -apple-system, sans-serif",
        display: "flex",
      }}
    >
      {/* ── Sidebar ── */}
      <aside
        style={{
          width: "280px",
          minWidth: "280px",
          background: "#161b22",
          borderRight: "1px solid #30363d",
          display: "flex",
          flexDirection: "column",
          padding: "24px 16px",
          overflowY: "auto",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", paddingBottom: "24px", borderBottom: "1px solid #30363d", marginBottom: "24px" }}>
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>🔴</div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#e6edf3", letterSpacing: "0.5px" }}>
            RedTeam Box
          </div>
          <div style={{ fontSize: "10px", color: "#484f58", letterSpacing: "2px", marginTop: "2px" }}>
            AI ATTACK SIMULATION
          </div>
        </div>

        {/* API Key */}
        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "1px",
              color: "#8b949e",
              display: "block",
              marginBottom: "6px",
            }}
          >
            OpenAI API Key
          </label>
          <input
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="sk-... (optional)"
            style={{
              width: "100%",
              background: "#0d1117",
              border: "1px solid #30363d",
              borderRadius: "6px",
              padding: "8px 10px",
              color: "#c9d1d9",
              fontSize: "12px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <div style={{ fontSize: "10px", color: "#484f58", marginTop: "4px" }}>
            Uses GPT-4o for AI analysis. Falls back to rule-based if empty.
          </div>
        </div>

        {/* Schema reference */}
        <div
          style={{
            background: "#0d1117",
            border: "1px solid #30363d",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "16px",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#8b949e", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>
            Input Schema
          </div>
          {[
            ["servers", "list of node names"],
            ["connections", "directed edges [src, dst]"],
            ["open_ports", "per-server port lists"],
            ["permissions", "low / medium / high"],
            ["asset_value", "1–10 importance score"],
            ["public_facing", "internet-exposed nodes"],
          ].map(([key, desc]) => (
            <div key={key} style={{ display: "flex", gap: "6px", marginBottom: "5px", fontSize: "11px" }}>
              <code style={{ color: "#58a6ff", flexShrink: 0 }}>{key}</code>
              <span style={{ color: "#484f58" }}>— {desc}</span>
            </div>
          ))}
        </div>

        {/* Severity legend */}
        <div
          style={{
            background: "#0d1117",
            border: "1px solid #30363d",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "24px",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#8b949e", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>
            Severity Scale
          </div>
          {[
            ["0–4", "Low", "#2ecc71"],
            ["5–8", "Medium", "#f39c12"],
            ["9–12", "High", "#e74c3c"],
            ["13+", "Critical", "#8e44ad"],
          ].map(([range, label, color]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px", fontSize: "11px" }}>
              <span
                style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: color,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: color, fontWeight: 600, minWidth: "50px" }}>{label}</span>
              <span style={{ color: "#484f58" }}>({range})</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "auto", fontSize: "10px", color: "#484f58", textAlign: "center", lineHeight: "1.6", paddingTop: "16px", borderTop: "1px solid #30363d" }}>
          For educational &amp; CTF purposes only.
          <br />
          Not a vulnerability scanner.
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div
          style={{
            padding: "18px 32px",
            borderBottom: "1px solid #30363d",
            background: "#0d1117",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#e6edf3" }}>
              AI Attack Simulation Agent
            </h1>
            <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#8b949e" }}>
              Red Team in a Box — Predictive attack path reasoning from infrastructure architecture
            </p>
          </div>
          <span
            style={{
              fontSize: "11px",
              background: "rgba(231,76,60,0.12)",
              color: "#e74c3c",
              border: "1px solid rgba(231,76,60,0.25)",
              borderRadius: "20px",
              padding: "3px 10px",
              letterSpacing: "1px",
              fontWeight: 600,
            }}
          >
            RED TEAM
          </span>
        </div>

        {/* Body: two-column */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "380px 1fr",
            overflow: "hidden",
          }}
        >
          {/* Left: Input panel */}
          <div
            style={{
              borderRight: "1px solid #30363d",
              display: "flex",
              flexDirection: "column",
              padding: "24px",
              gap: "12px",
              overflowY: "auto",
            }}
          >
            <SectionHeader>Architecture Input (JSON)</SectionHeader>

            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              spellCheck={false}
              style={{
                flex: 1,
                minHeight: "340px",
                background: "#161b22",
                border: "1px solid #30363d",
                borderRadius: "8px",
                padding: "12px",
                color: "#c9d1d9",
                fontSize: "12px",
                fontFamily: "var(--font-geist-mono), 'Fira Code', monospace",
                lineHeight: "1.6",
                resize: "vertical",
                outline: "none",
              }}
            />

            <button
              onClick={runSimulation}
              disabled={loading}
              style={{
                background: loading
                  ? "#21262d"
                  : "linear-gradient(135deg, #e74c3c, #c0392b)",
                color: loading ? "#8b949e" : "white",
                border: "none",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: "0.5px",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      display: "inline-block",
                      width: "14px",
                      height: "14px",
                      border: "2px solid #8b949e",
                      borderTop: "2px solid #e74c3c",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  Simulating Attack...
                </>
              ) : (
                "⚡ Run Attack Simulation"
              )}
            </button>

            {/* Scenario loader */}
            <div style={{ border: "1px solid #30363d", borderRadius: "8px", overflow: "hidden" }}>
              <button
                onClick={() => setShowScenarios((v) => !v)}
                style={{
                  width: "100%",
                  background: "#161b22",
                  border: "none",
                  padding: "10px 14px",
                  textAlign: "left",
                  cursor: "pointer",
                  color: "#8b949e",
                  fontSize: "12px",
                  fontWeight: 600,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Load Example Scenario</span>
                <span>{showScenarios ? "▲" : "▼"}</span>
              </button>
              {showScenarios && (
                <div style={{ background: "#0d1117", padding: "8px" }}>
                  {Object.entries(SCENARIOS).map(([name, scenario]) => (
                    <button
                      key={name}
                      onClick={() => {
                        setJsonInput(JSON.stringify(scenario, null, 2));
                        setShowScenarios(false);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        background: "transparent",
                        border: "1px solid #30363d",
                        borderRadius: "6px",
                        padding: "8px 12px",
                        cursor: "pointer",
                        color: "#58a6ff",
                        fontSize: "12px",
                        textAlign: "left",
                        marginBottom: "6px",
                      }}
                    >
                      → {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div
                style={{
                  background: "rgba(231,76,60,0.08)",
                  border: "1px solid rgba(231,76,60,0.3)",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  fontSize: "12px",
                  color: "#ff7b72",
                  lineHeight: "1.6",
                }}
              >
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>

          {/* Right: Results panel */}
          <div style={{ overflowY: "auto", padding: "24px 32px" }}>
            {!result && !loading && !error && (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "16px",
                  color: "#8b949e",
                  minHeight: "400px",
                }}
              >
                <div style={{ fontSize: "64px" }}>🎯</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "18px", fontWeight: 600, color: "#e6edf3", marginBottom: "8px" }}>
                    Ready to Simulate
                  </div>
                  <div style={{ fontSize: "14px", lineHeight: "1.7" }}>
                    Paste your infrastructure JSON on the left and click
                    <br />
                    <strong style={{ color: "#58a6ff" }}>Run Attack Simulation</strong> to begin.
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    marginTop: "8px",
                    width: "100%",
                    maxWidth: "480px",
                  }}
                >
                  {[
                    ["🔍 Entry Detection", "Identifies public-facing attack surfaces"],
                    ["⬆️ Privilege Escalation", "Maps privilege boundary crossings"],
                    ["➡️ Lateral Movement", "Traces graph traversal to high-value targets"],
                    ["💀 Data Exfiltration", "Estimates breach time & risk score"],
                  ].map(([title, desc]) => (
                    <div
                      key={title as string}
                      style={{
                        background: "#161b22",
                        border: "1px solid #30363d",
                        borderRadius: "8px",
                        padding: "12px",
                      }}
                    >
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "#e6edf3", marginBottom: "4px" }}>
                        {title}
                      </div>
                      <div style={{ fontSize: "11px", color: "#484f58" }}>{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  minHeight: "400px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    border: "3px solid #30363d",
                    borderTop: "3px solid #e74c3c",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <div style={{ color: "#8b949e", fontSize: "14px" }}>Running attack simulation...</div>
                {[
                  "Parsing architecture graph...",
                  "Identifying entry points...",
                  "Tracing lateral movement...",
                  "Scoring risk vectors...",
                  "Generating AI analysis...",
                ].map((step, i) => (
                  <div key={i} style={{ fontSize: "12px", color: "#484f58" }}>
                    ▸ {step}
                  </div>
                ))}
              </div>
            )}

            {result && !loading && (
              <>
                {/* Tabs */}
                <div
                  style={{
                    display: "flex",
                    gap: "4px",
                    marginBottom: "24px",
                    borderBottom: "1px solid #30363d",
                  }}
                >
                  {(["analysis", "raw"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        background: "transparent",
                        border: "none",
                        borderBottom: activeTab === tab ? "2px solid #e74c3c" : "2px solid transparent",
                        padding: "8px 16px",
                        cursor: "pointer",
                        color: activeTab === tab ? "#e6edf3" : "#8b949e",
                        fontSize: "13px",
                        fontWeight: activeTab === tab ? 600 : 400,
                        marginBottom: "-1px",
                        textTransform: "capitalize",
                      }}
                    >
                      {tab === "analysis" ? "Simulation Analysis" : "Raw JSON Output"}
                    </button>
                  ))}
                </div>

                {activeTab === "analysis" && (
                  <>
                    <MetricsRow result={result} />

                    {/* Attack Graph */}
                    <div style={{ marginBottom: "28px" }}>
                      <SectionHeader>Attack Graph</SectionHeader>
                      <div
                        style={{
                          background: "#0d1117",
                          border: "1px solid #30363d",
                          borderRadius: "10px",
                          overflow: "hidden",
                        }}
                      >
                        <AttackGraph
                          nodes={result.graph.nodes}
                          edges={result.graph.edges}
                          attackPath={result.attack_path}
                          entryPoint={result.entry_point}
                          target={result.target}
                        />
                      </div>
                    </div>

                    {/* Attack chain */}
                    <div style={{ marginBottom: "28px" }}>
                      <SectionHeader>Attack Chain</SectionHeader>
                      <AttackChain
                        attackPath={result.attack_path}
                        attackSteps={result.attack_steps}
                        vulnerabilityChain={result.vulnerability_chain}
                      />
                    </div>

                    {/* Breach time breakdown */}
                    <Expandable title={`Breach Time Breakdown — ${result.breach_time.display}`}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: `repeat(${Math.min(result.breach_time.breakdown.length, 4)}, 1fr)`,
                          gap: "10px",
                        }}
                      >
                        {result.breach_time.breakdown.map((step) => (
                          <div
                            key={step.node}
                            style={{
                              background: "#161b22",
                              border: "1px solid #30363d",
                              borderRadius: "8px",
                              padding: "12px",
                              textAlign: "center",
                            }}
                          >
                            <div style={{ fontSize: "11px", color: "#8b949e", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
                              {step.node}
                            </div>
                            <div style={{ fontSize: "11px", color: "#58a6ff", marginBottom: "6px" }}>
                              {step.step_type}
                            </div>
                            <div style={{ fontSize: "22px", fontWeight: 700, color: "#e6edf3" }}>
                              {step.adjusted_minutes}m
                            </div>
                            <div style={{ fontSize: "10px", color: "#484f58", marginTop: "4px" }}>
                              base: {step.base_minutes}m · ×{step.modifier}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Expandable>

                    {/* Risk score breakdown */}
                    <Expandable title="Risk Score Breakdown">
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px" }}>
                        {Object.entries(result.component_scores).map(([key, val]) => (
                          <div
                            key={key}
                            style={{
                              background: "#161b22",
                              border: "1px solid #30363d",
                              borderRadius: "8px",
                              padding: "12px",
                              textAlign: "center",
                            }}
                          >
                            <div style={{ fontSize: "10px", color: "#8b949e", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
                              {key.replace(/_/g, " ")}
                            </div>
                            <div style={{ fontSize: "22px", fontWeight: 700, color: "#e6edf3" }}>{val}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: "12px", fontSize: "12px", color: "#484f58", textAlign: "center" }}>
                        risk_score = exposure × privilege × asset_value × depth ={" "}
                        <strong style={{ color: "#e6edf3" }}>{result.risk_score.toFixed(2)}</strong>
                      </div>
                    </Expandable>

                    <div style={{ marginBottom: "8px" }} />

                    {/* AI Explanation */}
                    <div style={{ marginBottom: "28px" }}>
                      <SectionHeader>AI Analysis</SectionHeader>
                      <AIExplanation ai={result.ai} />
                    </div>

                    {/* Mitigation */}
                    <div style={{ marginBottom: "28px" }}>
                      <SectionHeader>Mitigation Recommendations</SectionHeader>
                      <MitigationSection strategy={result.ai.mitigation_strategy} />
                    </div>
                  </>
                )}

                {activeTab === "raw" && (
                  <div>
                    <SectionHeader>Simulation Output</SectionHeader>
                    <pre
                      style={{
                        background: "#161b22",
                        border: "1px solid #30363d",
                        borderRadius: "8px",
                        padding: "20px",
                        overflow: "auto",
                        fontSize: "12px",
                        color: "#c9d1d9",
                        fontFamily: "var(--font-geist-mono), monospace",
                        lineHeight: "1.6",
                        maxHeight: "600px",
                      }}
                    >
                      {JSON.stringify(
                        {
                          attack_path: result.attack_path,
                          vulnerability_chain: result.vulnerability_chain,
                          risk_score: result.risk_score,
                          severity: result.severity,
                          breach_time_estimate: result.breach_time.display,
                          mitigation: result.ai.mitigation_strategy,
                          ai_explanation: result.ai.executive_summary,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0d1117; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #484f58; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
