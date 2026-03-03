"use client";

import type { AttackStep } from "@/lib/types";

interface Props {
  attackPath: string[];
  attackSteps: AttackStep[];
  vulnerabilityChain: string[];
}

const STEP_ICONS: Record<string, string> = {
  "Initial Exploit": "🔓",
  "Privilege Escalation": "⬆️",
  "Lateral Movement": "➡️",
  "Data Exfiltration": "💀",
};

const PERM_COLORS: Record<string, string> = {
  low: "#2ecc71",
  medium: "#f39c12",
  high: "#e74c3c",
};

export default function AttackChain({ attackPath, attackSteps, vulnerabilityChain }: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
      {/* Attack Path */}
      <div>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "#e6edf3",
            borderBottom: "1px solid #30363d",
            paddingBottom: "8px",
            marginBottom: "12px",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          Attack Path
        </div>
        {attackSteps.map((step, i) => (
          <div key={step.node}>
            <div
              style={{
                background: "#161b22",
                border: "1px solid #30363d",
                borderRadius: "8px",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "18px" }}>
                {STEP_ICONS[step.step_type] ?? "⚡"}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#e6edf3", fontWeight: 600, fontSize: "14px" }}>
                  {step.node}
                </div>
                <div style={{ color: "#8b949e", fontSize: "11px", marginTop: "2px" }}>
                  {step.step_type} · Asset: {step.asset_value}
                </div>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  color: PERM_COLORS[step.permission] ?? "#8b949e",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "4px",
                  padding: "2px 8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {step.permission}
              </span>
            </div>
            {i < attackSteps.length - 1 && (
              <div
                style={{
                  textAlign: "center",
                  color: "#e74c3c",
                  fontSize: "16px",
                  lineHeight: "20px",
                  margin: "2px 0",
                }}
              >
                ↓
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Vulnerability Chain */}
      <div>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "#e6edf3",
            borderBottom: "1px solid #30363d",
            paddingBottom: "8px",
            marginBottom: "12px",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          Vulnerability Chain
        </div>
        {vulnerabilityChain.map((vuln, i) => (
          <div
            key={i}
            style={{
              background: "#161b22",
              border: "1px solid rgba(240,136,62,0.25)",
              borderLeft: "3px solid #f0883e",
              borderRadius: "0 8px 8px 0",
              padding: "10px 14px",
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span
              style={{
                color: "#484f58",
                fontSize: "11px",
                minWidth: "20px",
                fontWeight: 700,
              }}
            >
              #{i + 1}
            </span>
            <span style={{ color: "#f0883e", fontSize: "13px" }}>{vuln}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
