"use client";

import { useState, useCallback } from "react";
import AttackGraph from "@/components/AttackGraph";
import AttackChain from "@/components/AttackChain";
import MetricsRow from "@/components/MetricsRow";
import AIExplanation, { MitigationSection } from "@/components/AIExplanation";
import type { SimulationResult } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Default / scenario data
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_JSON = JSON.stringify(
  {
    servers: ["web", "app", "db", "storage", "backup"],
    connections: [
      ["web", "app"], ["app", "db"], ["db", "storage"],
      ["storage", "backup"], ["app", "storage"],
    ],
    open_ports: {
      web: [80, 443, 22], app: [8080, 22], db: [3306], storage: [22], backup: [],
    },
    permissions: { web: "low", app: "medium", db: "high", storage: "high", backup: "high" },
    asset_value:  { web: 3, app: 5, db: 8, storage: 9, backup: 10 },
    public_facing: ["web"],
  },
  null, 2
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
    connections: [["dmz","proxy"],["proxy","app"],["app","internal"],["internal","vault"]],
    open_ports: { dmz: [80,443,22], proxy: [8080], app: [3000], internal: [22], vault: [] },
    permissions: { dmz: "low", proxy: "low", app: "medium", internal: "high", vault: "high" },
    asset_value: { dmz: 2, proxy: 3, app: 6, internal: 8, vault: 10 },
    public_facing: ["dmz"],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Small shared UI primitives
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: "12px", fontWeight: 600, color: "#e6edf3",
      borderBottom: "1px solid #30363d", paddingBottom: "8px",
      marginBottom: "16px", textTransform: "uppercase", letterSpacing: "1px",
    }}>
      {children}
    </div>
  );
}

function Expandable({ title, children, defaultOpen = false }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: "1px solid #30363d", borderRadius: "8px", marginBottom: "12px", overflow: "hidden" }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: "100%", background: "#161b22", border: "none", padding: "12px 16px",
        textAlign: "left", cursor: "pointer", color: "#8b949e", fontSize: "12px",
        fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>{title}</span>
        <span style={{ fontSize: "11px", opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && <div style={{ background: "#0d1117", padding: "16px" }}>{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Business Impact Card
// ─────────────────────────────────────────────────────────────────────────────

const IMPACT_TAG_COLORS: Record<string, { bg: string; text: string }> = {
  "critical-data-exposure":    { bg: "rgba(142,68,173,0.15)", text: "#9b59b6" },
  "elevated-data-risk":        { bg: "rgba(231,76,60,0.12)",  text: "#e74c3c" },
  "moderate-data-risk":        { bg: "rgba(243,156,18,0.12)", text: "#f39c12" },
  "low-data-risk":             { bg: "rgba(46,204,113,0.1)",  text: "#2ecc71" },
  "rapid-compromise":          { bg: "rgba(231,76,60,0.15)",  text: "#ff7b72" },
  "service-disruption-risk":   { bg: "rgba(231,76,60,0.12)",  text: "#e74c3c" },
  "lateral-disruption-risk":   { bg: "rgba(243,156,18,0.12)", text: "#f39c12" },
  "contained-operational-risk":{ bg: "rgba(46,204,113,0.1)",  text: "#2ecc71" },
  "gdpr-exposure":             { bg: "rgba(88,166,255,0.12)", text: "#58a6ff" },
  "privileged-access-compliance":{ bg: "rgba(88,166,255,0.12)", text: "#58a6ff" },
  "pci-dss-risk":              { bg: "rgba(88,166,255,0.12)", text: "#58a6ff" },
  "attack-surface-compliance": { bg: "rgba(88,166,255,0.1)",  text: "#79c0ff" },
};

function BusinessImpactCard({ impact }: { impact: SimulationResult["business_impact"] }) {
  const tagStyle = (tag: string) => ({
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.8px",
    textTransform: "uppercase" as const,
    padding: "2px 8px",
    borderRadius: "20px",
    background: IMPACT_TAG_COLORS[tag]?.bg ?? "rgba(255,255,255,0.06)",
    color:      IMPACT_TAG_COLORS[tag]?.text ?? "#8b949e",
    marginRight: "6px",
    marginBottom: "4px",
    display: "inline-block",
  });

  const impactSections = [
    { key: "data_risk",        label: "Data Risk",        icon: "🗄️",  color: "#e74c3c", content: impact.data_risk },
    { key: "operational_risk", label: "Operational Risk", icon: "⚙️",  color: "#f39c12", content: impact.operational_risk },
    { key: "compliance_risk",  label: "Compliance Risk",  icon: "📋",  color: "#58a6ff", content: impact.compliance_risk },
  ];

  return (
    <div>
      {/* Tags row */}
      {impact.summary_tags && impact.summary_tags.length > 0 && (
        <div style={{ marginBottom: "16px", display: "flex", flexWrap: "wrap" as const }}>
          {impact.summary_tags.map(tag => (
            <span key={tag} style={tagStyle(tag)}>{tag.replace(/-/g, " ")}</span>
          ))}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
        {impactSections.map(sec => (
          <div key={sec.key} style={{
            background: "#161b22", border: "1px solid #30363d",
            borderLeft: `3px solid ${sec.color}`, borderRadius: "0 8px 8px 0",
            padding: "14px 16px",
          }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: sec.color,
              textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
              {sec.icon} {sec.label}
            </div>
            <p style={{ color: "#c9d1d9", fontSize: "12px", lineHeight: "1.65", margin: 0,
              whiteSpace: "pre-wrap" }}>
              {sec.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Before / After Mitigation Panel
// ─────────────────────────────────────────────────────────────────────────────

interface MitigationState {
  closePorts: string[];      // "web:22" format
  changePrivilege: string[]; // "web:medium" format
  removePublic: string[];    // server names
}

function delta(before: number, after: number): { pct: string; improved: boolean } {
  if (before === 0) return { pct: "—", improved: false };
  const d = ((before - after) / before) * 100;
  return { pct: `${d >= 0 ? "↓" : "↑"} ${Math.abs(d).toFixed(1)}%`, improved: d > 0 };
}

function BeforeAfterPanel({
  original,
  mitigated,
  onClear,
}: {
  original: SimulationResult;
  mitigated: SimulationResult;
  onClear: () => void;
}) {
  const riskDelta = delta(original.risk_score, mitigated.risk_score);
  const timeDelta = delta(original.breach_time.total_minutes, mitigated.breach_time.total_minutes);
  const confDelta = delta(original.confidence_score, mitigated.confidence_score);

  const col = (improved: boolean) => improved ? "#2ecc71" : "#e74c3c";

  return (
    <div style={{
      background: "#161b22", border: "1px solid #30363d", borderRadius: "10px",
      padding: "20px", marginBottom: "24px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "#e6edf3",
          textTransform: "uppercase", letterSpacing: "1px" }}>
          Mitigation Re-Simulation — Before vs After
        </div>
        <button onClick={onClear} style={{
          background: "transparent", border: "1px solid #30363d",
          borderRadius: "6px", padding: "4px 10px", cursor: "pointer",
          color: "#8b949e", fontSize: "11px",
        }}>
          Clear
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
        {[
          { label: "Risk Score",   before: original.risk_score.toFixed(2),             after: mitigated.risk_score.toFixed(2),              d: riskDelta },
          { label: "Breach Time",  before: original.breach_time.display,               after: mitigated.breach_time.display,                d: timeDelta },
          { label: "Confidence",   before: `${original.confidence_score}%`,            after: `${mitigated.confidence_score}%`,             d: confDelta },
        ].map(({ label, before, after, d }) => (
          <div key={label} style={{
            background: "#0d1117", border: "1px solid #30363d", borderRadius: "8px",
            padding: "14px 16px", textAlign: "center",
          }}>
            <div style={{ fontSize: "10px", color: "#8b949e", textTransform: "uppercase",
              letterSpacing: "1px", marginBottom: "8px" }}>{label}</div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#484f58", marginBottom: "2px" }}>BEFORE</div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#e74c3c" }}>{before}</div>
              </div>
              <div style={{ color: "#484f58", fontSize: "18px" }}>→</div>
              <div>
                <div style={{ fontSize: "11px", color: "#484f58", marginBottom: "2px" }}>AFTER</div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#2ecc71" }}>{after}</div>
              </div>
            </div>
            <div style={{ marginTop: "8px", fontSize: "13px", fontWeight: 700, color: col(d.improved) }}>
              {d.pct}
            </div>
          </div>
        ))}
      </div>
      {/* Severity comparison */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", justifyContent: "center" }}>
        <SeverityBadge sev={original.severity} label="Before" />
        <span style={{ color: "#484f58", fontSize: "20px" }}>→</span>
        <SeverityBadge sev={mitigated.severity} label="After" />
      </div>
    </div>
  );
}

const SEV_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  Low:      { bg: "rgba(46,204,113,0.15)",  text: "#2ecc71", border: "rgba(46,204,113,0.4)"  },
  Medium:   { bg: "rgba(243,156,18,0.15)",  text: "#f39c12", border: "rgba(243,156,18,0.4)"  },
  High:     { bg: "rgba(231,76,60,0.15)",   text: "#e74c3c", border: "rgba(231,76,60,0.4)"   },
  Critical: { bg: "rgba(142,68,173,0.15)",  text: "#8e44ad", border: "rgba(142,68,173,0.4)"  },
};

function SeverityBadge({ sev, label }: { sev: string; label?: string }) {
  const s = SEV_STYLE[sev] ?? SEV_STYLE.Low;
  return (
    <div style={{ textAlign: "center" }}>
      {label && <div style={{ fontSize: "10px", color: "#484f58", marginBottom: "4px", textTransform: "uppercase" }}>{label}</div>}
      <span style={{
        background: s.bg, color: s.text, border: `1px solid ${s.border}`,
        borderRadius: "20px", padding: "5px 16px", fontSize: "13px",
        fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase",
      }}>
        {sev}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mitigation editor — lets user modify arch to re-simulate
// ─────────────────────────────────────────────────────────────────────────────

function MitigationEditor({
  arch,
  state,
  onChange,
  onRun,
  loading,
}: {
  arch: SimulationResult["arch"];
  state: MitigationState;
  onChange: (s: MitigationState) => void;
  onRun: () => void;
  loading: boolean;
}) {
  const togglePort = (server: string, port: number) => {
    const key = `${server}:${port}`;
    const updated = state.closePorts.includes(key)
      ? state.closePorts.filter(k => k !== key)
      : [...state.closePorts, key];
    onChange({ ...state, closePorts: updated });
  };

  const togglePublic = (server: string) => {
    const updated = state.removePublic.includes(server)
      ? state.removePublic.filter(s => s !== server)
      : [...state.removePublic, server];
    onChange({ ...state, removePublic: updated });
  };

  const setPrivilege = (server: string, priv: string) => {
    const filtered = state.changePrivilege.filter(e => !e.startsWith(`${server}:`));
    onChange({ ...state, changePrivilege: [...filtered, `${server}:${priv}`] });
  };

  const getPrivilege = (server: string) => {
    const entry = state.changePrivilege.find(e => e.startsWith(`${server}:`));
    return entry ? entry.split(":")[1] : arch.permissions[server] ?? "medium";
  };

  const allOpenPorts = arch.servers.flatMap(s =>
    (arch.open_ports[s] ?? []).map(p => ({ server: s, port: p }))
  );

  return (
    <div>
      <div style={{ fontSize: "12px", color: "#8b949e", marginBottom: "14px", lineHeight: "1.6" }}>
        Modify the architecture below and run a re-simulation to see how mitigations reduce risk.
      </div>

      {/* Close ports */}
      {allOpenPorts.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#58a6ff", textTransform: "uppercase",
            letterSpacing: "1px", marginBottom: "8px" }}>
            Close Ports
          </div>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px" }}>
            {allOpenPorts.map(({ server, port }) => {
              const key = `${server}:${port}`;
              const active = state.closePorts.includes(key);
              return (
                <button key={key} onClick={() => togglePort(server, port)} style={{
                  background: active ? "rgba(231,76,60,0.15)" : "#0d1117",
                  border: `1px solid ${active ? "#e74c3c" : "#30363d"}`,
                  borderRadius: "6px", padding: "4px 10px", cursor: "pointer",
                  color: active ? "#e74c3c" : "#8b949e", fontSize: "11px",
                  textDecoration: active ? "line-through" : "none",
                }}>
                  {server}:{port}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Remove public exposure */}
      {arch.public_facing.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#58a6ff", textTransform: "uppercase",
            letterSpacing: "1px", marginBottom: "8px" }}>
            Remove Public Exposure
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
            {arch.public_facing.map(s => {
              const active = state.removePublic.includes(s);
              return (
                <button key={s} onClick={() => togglePublic(s)} style={{
                  background: active ? "rgba(46,204,113,0.1)" : "#0d1117",
                  border: `1px solid ${active ? "#2ecc71" : "#30363d"}`,
                  borderRadius: "6px", padding: "4px 10px", cursor: "pointer",
                  color: active ? "#2ecc71" : "#8b949e", fontSize: "11px",
                }}>
                  {active ? "✓ " : ""}{s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Change privilege */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "#58a6ff", textTransform: "uppercase",
          letterSpacing: "1px", marginBottom: "8px" }}>
          Change Privilege Level
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: "8px" }}>
          {arch.servers.map(s => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: "8px",
              background: "#0d1117", border: "1px solid #30363d", borderRadius: "6px", padding: "6px 10px" }}>
              <span style={{ color: "#c9d1d9", fontSize: "12px", flex: 1 }}>{s}</span>
              <select
                value={getPrivilege(s)}
                onChange={e => setPrivilege(s, e.target.value)}
                style={{
                  background: "#161b22", border: "1px solid #30363d", borderRadius: "4px",
                  color: "#c9d1d9", fontSize: "11px", padding: "2px 4px", outline: "none",
                }}
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      <button onClick={onRun} disabled={loading} style={{
        background: loading ? "#21262d" : "linear-gradient(135deg, #2ecc71, #27ae60)",
        color: loading ? "#8b949e" : "white", border: "none", borderRadius: "8px",
        padding: "10px 20px", fontSize: "13px", fontWeight: 700,
        cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.5px",
        display: "flex", alignItems: "center", gap: "8px",
      }}>
        {loading ? (
          <>
            <span style={{ display: "inline-block", width: "12px", height: "12px",
              border: "2px solid #8b949e", borderTop: "2px solid #2ecc71",
              borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            Re-simulating...
          </>
        ) : "⚡ Run Re-Simulation"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: apply mitigation mutations to arch JSON
// ─────────────────────────────────────────────────────────────────────────────

function applyMitigations(arch: SimulationResult["arch"], state: MitigationState): object {
  // Deep copy
  const modified = JSON.parse(JSON.stringify(arch));

  // Close ports
  for (const key of state.closePorts) {
    const [server, portStr] = key.split(":");
    const port = parseInt(portStr, 10);
    if (modified.open_ports[server]) {
      modified.open_ports[server] = modified.open_ports[server].filter((p: number) => p !== port);
    }
  }

  // Remove public exposure
  for (const server of state.removePublic) {
    modified.public_facing = modified.public_facing.filter((s: string) => s !== server);
  }

  // Change privilege
  for (const entry of state.changePrivilege) {
    const [server, priv] = entry.split(":");
    modified.permissions[server] = priv;
  }

  return modified;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const [jsonInput,       setJsonInput]       = useState(DEFAULT_JSON);
  const [openaiKey,       setOpenaiKey]       = useState("");
  const [loading,         setLoading]         = useState(false);
  const [mitigLoading,    setMitigLoading]    = useState(false);
  const [result,          setResult]          = useState<SimulationResult | null>(null);
  const [mitigResult,     setMitigResult]     = useState<SimulationResult | null>(null);
  const [error,           setError]           = useState<string | null>(null);
  const [showScenarios,   setShowScenarios]   = useState(false);
  const [activeTab,       setActiveTab]       = useState<"analysis" | "raw">("analysis");
  const [activePath,      setActivePath]      = useState<"primary" | "secondary">("primary");
  const [mitigState,      setMitigState]      = useState<MitigationState>({ closePorts: [], changePrivilege: [], removePublic: [] });

  const runSimulation = useCallback(async (overrideArch?: object) => {
    const isMitigation = Boolean(overrideArch);
    if (isMitigation) setMitigLoading(true);
    else {
      setLoading(true);
      setResult(null);
      setMitigResult(null);
      setError(null);
      setActivePath("primary");
      setActiveTab("analysis");
    }

    try {
      let parsed: unknown;
      if (overrideArch) {
        parsed = overrideArch;
      } else {
        try { parsed = JSON.parse(jsonInput); }
        catch { throw new Error("Invalid JSON input. Please check your syntax."); }
      }

      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ architecture: parsed, openai_key: openaiKey }),
      });

      const data: SimulationResult & { error?: string } = await res.json();
      if (data.error) throw new Error(data.error);

      if (isMitigation) setMitigResult(data);
      else setResult(data);
    } catch (e: unknown) {
      if (!isMitigation) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (isMitigation) setMitigLoading(false);
      else setLoading(false);
    }
  }, [jsonInput, openaiKey]);

  const runMitigation = useCallback(() => {
    if (!result) return;
    const modifiedArch = applyMitigations(result.arch, mitigState);
    runSimulation(modifiedArch);
  }, [result, mitigState, runSimulation]);

  const hasSecondary = result && result.secondary_attack_path && result.secondary_attack_path.length > 0;

  return (
    <div style={{
      minHeight: "100vh", background: "#0d1117", color: "#c9d1d9",
      fontFamily: "var(--font-geist-sans), -apple-system, sans-serif",
      display: "flex",
    }}>
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside style={{
        width: "268px", minWidth: "268px", background: "#161b22",
        borderRight: "1px solid #30363d", display: "flex", flexDirection: "column",
        padding: "20px 14px", overflowY: "auto",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", paddingBottom: "20px", borderBottom: "1px solid #30363d", marginBottom: "20px" }}>
          <div style={{ fontSize: "36px", marginBottom: "6px" }}>🔴</div>
          <div style={{ fontSize: "17px", fontWeight: 700, color: "#e6edf3", letterSpacing: "0.5px" }}>
            RedTeam Box
          </div>
          <div style={{ fontSize: "9px", color: "#484f58", letterSpacing: "2px", marginTop: "2px" }}>
            PREDICTIVE BREACH INTELLIGENCE
          </div>
        </div>

        {/* API Key */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px",
            color: "#8b949e", display: "block", marginBottom: "5px" }}>
            OpenAI API Key
          </label>
          <input type="password" value={openaiKey} onChange={e => setOpenaiKey(e.target.value)}
            placeholder="sk-... (optional)"
            style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d",
              borderRadius: "6px", padding: "7px 10px", color: "#c9d1d9", fontSize: "11px",
              outline: "none", boxSizing: "border-box" }}
          />
          <div style={{ fontSize: "9px", color: "#484f58", marginTop: "3px" }}>
            GPT-4o for AI analysis. Falls back to rule-based.
          </div>
        </div>

        {/* Schema reference */}
        <div style={{ background: "#0d1117", border: "1px solid #30363d", borderRadius: "8px",
          padding: "10px", marginBottom: "12px" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#8b949e",
            textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
            Input Schema
          </div>
          {[
            ["servers",       "list of node names"],
            ["connections",   "directed edges [src, dst]"],
            ["open_ports",    "per-server port lists"],
            ["permissions",   "low / medium / high"],
            ["asset_value",   "1–10 importance score"],
            ["public_facing", "internet-exposed nodes"],
          ].map(([key, desc]) => (
            <div key={key} style={{ display: "flex", gap: "5px", marginBottom: "4px", fontSize: "10px" }}>
              <code style={{ color: "#58a6ff", flexShrink: 0 }}>{key}</code>
              <span style={{ color: "#484f58" }}>— {desc}</span>
            </div>
          ))}
        </div>

        {/* Severity legend */}
        <div style={{ background: "#0d1117", border: "1px solid #30363d", borderRadius: "8px",
          padding: "10px", marginBottom: "12px" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#8b949e",
            textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
            Severity Scale
          </div>
          {[
            ["0–4",  "Low",      "#2ecc71"],
            ["5–8",  "Medium",   "#f39c12"],
            ["9–12", "High",     "#e74c3c"],
            ["13+",  "Critical", "#8e44ad"],
          ].map(([range, label, color]) => (
            <div key={label as string} style={{ display: "flex", alignItems: "center",
              gap: "7px", marginBottom: "4px", fontSize: "10px" }}>
              <span style={{ display: "inline-block", width: "7px", height: "7px",
                borderRadius: "50%", background: color as string, flexShrink: 0 }} />
              <span style={{ color: color as string, fontWeight: 600, minWidth: "48px" }}>{label}</span>
              <span style={{ color: "#484f58" }}>({range})</span>
            </div>
          ))}
        </div>

        {/* Confidence legend */}
        <div style={{ background: "#0d1117", border: "1px solid #30363d", borderRadius: "8px",
          padding: "10px", marginBottom: "20px" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#8b949e",
            textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
            Confidence (Attacker Certainty)
          </div>
          {[
            ["80–97%", "Very High", "#e74c3c"],
            ["65–79%", "High",      "#f39c12"],
            ["45–64%", "Moderate",  "#f1c40f"],
            ["10–44%", "Low",       "#2ecc71"],
          ].map(([range, label, color]) => (
            <div key={label as string} style={{ display: "flex", alignItems: "center",
              gap: "7px", marginBottom: "4px", fontSize: "10px" }}>
              <span style={{ display: "inline-block", width: "7px", height: "7px",
                borderRadius: "50%", background: color as string, flexShrink: 0 }} />
              <span style={{ color: color as string, fontWeight: 600, minWidth: "60px" }}>{label}</span>
              <span style={{ color: "#484f58" }}>({range})</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "auto", fontSize: "9px", color: "#484f58",
          textAlign: "center", lineHeight: "1.6", paddingTop: "14px",
          borderTop: "1px solid #30363d" }}>
          For educational &amp; CTF purposes only.
          <br />Not a vulnerability scanner.
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "16px 28px", borderBottom: "1px solid #30363d",
          background: "#0d1117", display: "flex", alignItems: "center",
          justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "19px", fontWeight: 700, color: "#e6edf3" }}>
              AI Attack Simulation Agent
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#8b949e" }}>
              Stage 2 — Predictive Breach Intelligence Platform
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "10px", background: "rgba(46,204,113,0.1)", color: "#2ecc71",
              border: "1px solid rgba(46,204,113,0.25)", borderRadius: "20px",
              padding: "2px 8px", letterSpacing: "1px", fontWeight: 600 }}>
              STAGE 2
            </span>
            <span style={{ fontSize: "10px", background: "rgba(231,76,60,0.12)", color: "#e74c3c",
              border: "1px solid rgba(231,76,60,0.25)", borderRadius: "20px",
              padding: "2px 8px", letterSpacing: "1px", fontWeight: 600 }}>
              RED TEAM
            </span>
          </div>
        </div>

        {/* Two-column body */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "360px 1fr", overflow: "hidden" }}>
          {/* Left: input panel */}
          <div style={{ borderRight: "1px solid #30363d", display: "flex", flexDirection: "column",
            padding: "20px", gap: "10px", overflowY: "auto" }}>
            <SectionHeader>Architecture Input (JSON)</SectionHeader>

            <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)}
              spellCheck={false}
              style={{ flex: 1, minHeight: "300px", background: "#161b22",
                border: "1px solid #30363d", borderRadius: "8px", padding: "12px",
                color: "#c9d1d9", fontSize: "11px",
                fontFamily: "var(--font-geist-mono), 'Fira Code', monospace",
                lineHeight: "1.6", resize: "vertical", outline: "none" }}
            />

            <button onClick={() => runSimulation()} disabled={loading} style={{
              background: loading ? "#21262d" : "linear-gradient(135deg, #e74c3c, #c0392b)",
              color: loading ? "#8b949e" : "white", border: "none", borderRadius: "8px",
              padding: "11px", fontSize: "13px", fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.5px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}>
              {loading ? (
                <>
                  <span style={{ display: "inline-block", width: "13px", height: "13px",
                    border: "2px solid #8b949e", borderTop: "2px solid #e74c3c",
                    borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  Simulating...
                </>
              ) : "⚡ Run Attack Simulation"}
            </button>

            {/* Scenario loader */}
            <div style={{ border: "1px solid #30363d", borderRadius: "8px", overflow: "hidden" }}>
              <button onClick={() => setShowScenarios(v => !v)} style={{
                width: "100%", background: "#161b22", border: "none", padding: "9px 12px",
                textAlign: "left", cursor: "pointer", color: "#8b949e", fontSize: "11px",
                fontWeight: 600, display: "flex", justifyContent: "space-between",
              }}>
                <span>Load Example Scenario</span>
                <span>{showScenarios ? "▲" : "▼"}</span>
              </button>
              {showScenarios && (
                <div style={{ background: "#0d1117", padding: "6px" }}>
                  {Object.entries(SCENARIOS).map(([name, scenario]) => (
                    <button key={name} onClick={() => {
                      setJsonInput(JSON.stringify(scenario, null, 2));
                      setShowScenarios(false);
                    }} style={{
                      display: "block", width: "100%", background: "transparent",
                      border: "1px solid #30363d", borderRadius: "5px",
                      padding: "7px 10px", cursor: "pointer", color: "#58a6ff",
                      fontSize: "11px", textAlign: "left", marginBottom: "5px",
                    }}>
                      → {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div style={{ background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.3)",
                borderRadius: "8px", padding: "10px 12px", fontSize: "11px", color: "#ff7b72", lineHeight: "1.6" }}>
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>

          {/* Right: results panel */}
          <div style={{ overflowY: "auto", padding: "20px 28px" }}>
            {/* Empty state */}
            {!result && !loading && !error && (
              <div style={{ height: "100%", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: "16px",
                color: "#8b949e", minHeight: "400px" }}>
                <div style={{ fontSize: "56px" }}>🎯</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "17px", fontWeight: 600, color: "#e6edf3", marginBottom: "6px" }}>
                    Ready to Simulate
                  </div>
                  <div style={{ fontSize: "13px", lineHeight: "1.7" }}>
                    Paste your infrastructure JSON and click{" "}
                    <strong style={{ color: "#58a6ff" }}>Run Attack Simulation</strong>.
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px",
                  marginTop: "8px", width: "100%", maxWidth: "480px" }}>
                  {[
                    ["🔍 Entry Detection",      "Identifies public-facing attack surfaces"],
                    ["⬆️ Privilege Escalation", "Maps privilege boundary crossings"],
                    ["➡️ Lateral Movement",     "Traces paths to high-value targets"],
                    ["💀 Data Exfiltration",    "Estimates breach time & risk score"],
                    ["📊 Confidence Scoring",   "Quantifies attacker path certainty"],
                    ["🔄 Re-Simulation",        "Compare before vs after mitigations"],
                  ].map(([title, desc]) => (
                    <div key={title as string} style={{ background: "#161b22",
                      border: "1px solid #30363d", borderRadius: "8px", padding: "10px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#e6edf3", marginBottom: "3px" }}>
                        {title}
                      </div>
                      <div style={{ fontSize: "10px", color: "#484f58" }}>{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: "10px", minHeight: "400px" }}>
                <div style={{ width: "44px", height: "44px", border: "3px solid #30363d",
                  borderTop: "3px solid #e74c3c", borderRadius: "50%",
                  animation: "spin 1s linear infinite" }} />
                <div style={{ color: "#8b949e", fontSize: "13px" }}>Running attack simulation...</div>
                {["Parsing architecture graph...", "Identifying entry points...",
                  "Finding all attack paths...", "Computing confidence scores...",
                  "Scoring risk vectors...", "Modeling business impact...",
                  "Generating AI analysis..."].map((step, i) => (
                  <div key={i} style={{ fontSize: "11px", color: "#484f58" }}>▸ {step}</div>
                ))}
              </div>
            )}

            {/* Results */}
            {result && !loading && (
              <>
                {/* Tabs */}
                <div style={{ display: "flex", gap: "4px", marginBottom: "20px",
                  borderBottom: "1px solid #30363d" }}>
                  {(["analysis", "raw"] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{
                      background: "transparent", border: "none",
                      borderBottom: activeTab === tab ? "2px solid #e74c3c" : "2px solid transparent",
                      padding: "7px 14px", cursor: "pointer",
                      color: activeTab === tab ? "#e6edf3" : "#8b949e",
                      fontSize: "12px", fontWeight: activeTab === tab ? 600 : 400,
                      marginBottom: "-1px", textTransform: "capitalize",
                    }}>
                      {tab === "analysis" ? "Simulation Analysis" : "Raw JSON Output"}
                    </button>
                  ))}
                </div>

                {activeTab === "analysis" && (
                  <>
                    {/* Metrics row */}
                    <MetricsRow result={result} />

                    {/* Attack Graph with path toggle */}
                    <div style={{ marginBottom: "24px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "center", marginBottom: "12px" }}>
                        <SectionHeader>Attack Graph</SectionHeader>
                        {hasSecondary && (
                          <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                            {(["primary", "secondary"] as const).map(p => (
                              <button key={p} onClick={() => setActivePath(p)} style={{
                                background: activePath === p
                                  ? p === "primary" ? "rgba(231,76,60,0.15)" : "rgba(52,152,219,0.15)"
                                  : "transparent",
                                border: `1px solid ${activePath === p
                                  ? p === "primary" ? "#e74c3c" : "#3498db"
                                  : "#30363d"}`,
                                borderRadius: "6px", padding: "4px 12px", cursor: "pointer",
                                color: activePath === p
                                  ? p === "primary" ? "#e74c3c" : "#3498db"
                                  : "#8b949e",
                                fontSize: "11px", fontWeight: 600,
                              }}>
                                {p === "primary" ? "Primary Path" : "Secondary Path"}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Path info strip */}
                      <div style={{ background: "#161b22", border: "1px solid #30363d",
                        borderRadius: "6px", padding: "8px 14px", marginBottom: "8px",
                        display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" as const }}>
                        <div>
                          <span style={{ fontSize: "10px", color: "#8b949e",
                            textTransform: "uppercase", letterSpacing: "1px", marginRight: "6px" }}>
                            {activePath === "primary" ? "Primary" : "Secondary"}:
                          </span>
                          <span style={{ fontSize: "12px", fontWeight: 600,
                            color: activePath === "primary" ? "#e74c3c" : "#3498db" }}>
                            {(activePath === "primary"
                              ? result.primary_attack_path
                              : result.secondary_attack_path
                            ).join(" → ")}
                          </span>
                        </div>
                        {hasSecondary && (
                          <span style={{ fontSize: "10px", color: "#484f58" }}>
                            {result.path_count} total path{result.path_count !== 1 ? "s" : ""} found
                          </span>
                        )}
                        {!hasSecondary && (
                          <span style={{ fontSize: "10px", color: "#484f58", fontStyle: "italic" }}>
                            Only one attack path exists in this topology
                          </span>
                        )}
                      </div>

                      <div style={{ background: "#0d1117", border: "1px solid #30363d",
                        borderRadius: "10px", overflow: "hidden" }}>
                        <AttackGraph
                          nodes={result.graph.nodes}
                          edges={result.graph.edges}
                          attackPath={result.primary_attack_path ?? result.attack_path}
                          secondaryPath={result.secondary_attack_path ?? []}
                          activePath={activePath}
                          entryPoint={result.entry_point}
                          target={result.target}
                        />
                      </div>
                    </div>

                    {/* Attack chain */}
                    <div style={{ marginBottom: "24px" }}>
                      <SectionHeader>Attack Chain</SectionHeader>
                      <AttackChain
                        attackPath={activePath === "primary"
                          ? (result.primary_attack_path ?? result.attack_path)
                          : (result.secondary_attack_path ?? [])}
                        attackSteps={result.attack_steps}
                        vulnerabilityChain={result.vulnerability_chain}
                      />
                    </div>

                    {/* Business Impact */}
                    {result.business_impact && (
                      <div style={{ marginBottom: "24px" }}>
                        <SectionHeader>Business Impact Analysis</SectionHeader>
                        <BusinessImpactCard impact={result.business_impact} />
                      </div>
                    )}

                    {/* Before / After panel */}
                    {mitigResult && (
                      <BeforeAfterPanel
                        original={result}
                        mitigated={mitigResult}
                        onClear={() => setMitigResult(null)}
                      />
                    )}

                    {/* Mitigation re-simulation */}
                    <Expandable title="Mitigation Re-Simulation — Modify Architecture" defaultOpen={false}>
                      <MitigationEditor
                        arch={result.arch}
                        state={mitigState}
                        onChange={setMitigState}
                        onRun={runMitigation}
                        loading={mitigLoading}
                      />
                    </Expandable>

                    {/* Breach time breakdown */}
                    <Expandable title={`Breach Time Breakdown — ${result.breach_time.display}`}>
                      <div style={{ display: "grid",
                        gridTemplateColumns: `repeat(${Math.min(result.breach_time.breakdown.length, 4)}, 1fr)`,
                        gap: "10px" }}>
                        {result.breach_time.breakdown.map(step => (
                          <div key={step.node} style={{ background: "#161b22",
                            border: "1px solid #30363d", borderRadius: "8px",
                            padding: "12px", textAlign: "center" }}>
                            <div style={{ fontSize: "10px", color: "#8b949e",
                              textTransform: "uppercase", letterSpacing: "1px", marginBottom: "3px" }}>
                              {step.node}
                            </div>
                            <div style={{ fontSize: "10px", color: "#58a6ff", marginBottom: "5px" }}>
                              {step.step_type}
                            </div>
                            <div style={{ fontSize: "22px", fontWeight: 700, color: "#e6edf3" }}>
                              {step.adjusted_minutes}m
                            </div>
                            <div style={{ fontSize: "9px", color: "#484f58", marginTop: "3px" }}>
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
                          <div key={key} style={{ background: "#161b22",
                            border: "1px solid #30363d", borderRadius: "8px",
                            padding: "12px", textAlign: "center" }}>
                            <div style={{ fontSize: "9px", color: "#8b949e",
                              textTransform: "uppercase", letterSpacing: "1px", marginBottom: "5px" }}>
                              {key.replace(/_/g, " ")}
                            </div>
                            <div style={{ fontSize: "22px", fontWeight: 700, color: "#e6edf3" }}>{val}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: "10px", fontSize: "11px", color: "#484f58", textAlign: "center" }}>
                        risk = exposure × privilege × asset_value × depth ={" "}
                        <strong style={{ color: "#e6edf3" }}>{result.risk_score.toFixed(2)}</strong>
                      </div>
                    </Expandable>

                    {/* Confidence factor breakdown */}
                    {result.confidence_factors && Object.keys(result.confidence_factors).length > 1 && (
                      <Expandable title={`Confidence Analysis — ${result.confidence_score}% (${result.confidence_label})`}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: "8px" }}>
                          {Object.entries(result.confidence_factors)
                            .filter(([k]) => k !== "final")
                            .map(([key, val]) => {
                              const isPositive = (val as number) >= 0;
                              return (
                                <div key={key} style={{ background: "#161b22",
                                  border: `1px solid ${isPositive ? "rgba(46,204,113,0.2)" : "rgba(231,76,60,0.2)"}`,
                                  borderRadius: "8px", padding: "10px 12px", textAlign: "center" }}>
                                  <div style={{ fontSize: "9px", color: "#8b949e",
                                    textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>
                                    {key.replace(/_/g, " ")}
                                  </div>
                                  <div style={{ fontSize: "18px", fontWeight: 700,
                                    color: isPositive ? "#2ecc71" : "#e74c3c" }}>
                                    {(val as number) > 0 ? "+" : ""}{val}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                        <div style={{ marginTop: "10px", fontSize: "11px", color: "#484f58", textAlign: "center" }}>
                          Final confidence: <strong style={{ color: result.confidence_color }}>
                            {result.confidence_score}% — {result.confidence_label}
                          </strong>
                        </div>
                      </Expandable>
                    )}

                    <div style={{ marginBottom: "8px" }} />

                    {/* AI Analysis */}
                    <div style={{ marginBottom: "24px" }}>
                      <SectionHeader>AI Analysis</SectionHeader>
                      <AIExplanation ai={result.ai} />
                    </div>

                    {/* Mitigation recommendations */}
                    <div style={{ marginBottom: "24px" }}>
                      <SectionHeader>Mitigation Recommendations</SectionHeader>
                      <MitigationSection strategy={result.ai.mitigation_roadmap || result.ai.mitigation_strategy} />
                    </div>
                  </>
                )}

                {activeTab === "raw" && (
                  <div>
                    <SectionHeader>Simulation Output (Stage 2 Schema)</SectionHeader>
                    <pre style={{ background: "#161b22", border: "1px solid #30363d",
                      borderRadius: "8px", padding: "20px", overflow: "auto",
                      fontSize: "11px", color: "#c9d1d9",
                      fontFamily: "var(--font-geist-mono), monospace",
                      lineHeight: "1.6", maxHeight: "600px" }}>
                      {JSON.stringify({
                        primary_attack_path:  result.primary_attack_path,
                        secondary_attack_path: result.secondary_attack_path,
                        vulnerability_chain:  result.vulnerability_chain,
                        risk_score:           result.risk_score,
                        severity:             result.severity,
                        confidence_score:     result.confidence_score,
                        confidence_label:     result.confidence_label,
                        breach_time_estimate: result.breach_time.display,
                        business_impact: {
                          data_risk:        result.business_impact?.data_risk?.slice(0, 80) + "...",
                          operational_risk: result.business_impact?.operational_risk?.slice(0, 80) + "...",
                          compliance_risk:  result.business_impact?.compliance_risk?.slice(0, 80) + "...",
                          summary_tags:     result.business_impact?.summary_tags,
                        },
                        mitigation:     result.ai.mitigation_roadmap || result.ai.mitigation_strategy,
                        ai_explanation: result.ai.executive_summary,
                      }, null, 2)}
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
          to   { transform: rotate(360deg); }
        }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #0d1117; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #484f58; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
