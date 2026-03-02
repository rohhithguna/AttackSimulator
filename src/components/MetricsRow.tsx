"use client";

import type { SimulationResult } from "@/lib/types";

interface Props {
  result: SimulationResult;
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Low: { bg: "rgba(46,204,113,0.12)", text: "#2ecc71", border: "rgba(46,204,113,0.3)" },
  Medium: { bg: "rgba(243,156,18,0.12)", text: "#f39c12", border: "rgba(243,156,18,0.3)" },
  High: { bg: "rgba(231,76,60,0.12)", text: "#e74c3c", border: "rgba(231,76,60,0.3)" },
  Critical: { bg: "rgba(142,68,173,0.12)", text: "#8e44ad", border: "rgba(142,68,173,0.3)" },
};

export default function MetricsRow({ result }: Props) {
  const sev = result.severity;
  const sevStyle = SEVERITY_STYLES[sev] ?? SEVERITY_STYLES.Low;

  const metrics = [
    {
      label: "Risk Score",
      value: result.risk_score.toFixed(2),
      color: sevStyle.text,
      sub: `/ 15+ max`,
    },
    {
      label: "Severity",
      value: (
        <span
          style={{
            background: sevStyle.bg,
            color: sevStyle.text,
            border: `1px solid ${sevStyle.border}`,
            borderRadius: "20px",
            padding: "4px 14px",
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "1px",
            textTransform: "uppercase" as const,
          }}
        >
          {sev}
        </span>
      ),
      color: sevStyle.text,
      sub: null,
    },
    {
      label: "Breach Time",
      value: result.breach_time.display,
      color: "#58a6ff",
      sub: `${result.breach_time.total_minutes} min total`,
    },
    {
      label: "Attack Hops",
      value: result.attack_path.length,
      color: "#e6edf3",
      sub: `${result.entry_point} → ${result.target}`,
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "12px",
        marginBottom: "24px",
      }}
    >
      {metrics.map((m, i) => (
        <div
          key={i}
          style={{
            background: "#161b22",
            border: "1px solid #30363d",
            borderRadius: "10px",
            padding: "16px 18px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "1px",
              color: "#8b949e",
              marginBottom: "8px",
            }}
          >
            {m.label}
          </div>
          <div
            style={{
              fontSize: "26px",
              fontWeight: 700,
              color: m.color,
              lineHeight: 1.2,
            }}
          >
            {m.value}
          </div>
          {m.sub && (
            <div style={{ fontSize: "11px", color: "#484f58", marginTop: "4px" }}>
              {m.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
