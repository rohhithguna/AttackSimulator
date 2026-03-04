"use client";

interface AIData {
  executive_summary: string;
  technical_analysis?: string;
  technical_reasoning?: string;   // legacy compat
  risk_justification?: string;
  business_interpretation?: string;
  business_impact?: string;       // legacy compat
  mitigation_roadmap?: string;
  mitigation_strategy?: string;   // legacy compat
  error: string | null;
}

interface Props {
  ai: AIData;
}

interface SectionProps {
  icon: string;
  title: string;
  content: string;
  accentColor?: string;
}

function AISection({ icon, title, content, accentColor = "#58a6ff" }: SectionProps) {
  if (!content) return null;
  return (
    <div style={{
      background: "#161b22", border: "1px solid #30363d",
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: "0 8px 8px 0", padding: "14px 18px", marginBottom: "10px",
    }}>
      <div style={{ color: accentColor, fontSize: "11px", fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "1px", marginBottom: "7px" }}>
        {icon} {title}
      </div>
      <p style={{ color: "#c9d1d9", fontSize: "13px", lineHeight: "1.7", margin: 0, whiteSpace: "pre-wrap" }}>
        {content}
      </p>
    </div>
  );
}

export default function AIExplanation({ ai }: Props) {
  const technical     = ai.technical_analysis     || ai.technical_reasoning     || "";
  const business      = ai.business_interpretation || ai.business_impact         || "";
  const riskJust      = ai.risk_justification      || "";

  return (
    <div>
      {ai.error && (
        <div style={{ background: "rgba(88,166,255,0.08)", border: "1px solid rgba(88,166,255,0.2)",
          borderRadius: "8px", padding: "8px 12px", fontSize: "11px", color: "#58a6ff",
          marginBottom: "10px" }}>
          ℹ️ {ai.error} — showing rule-based analysis
        </div>
      )}
      <AISection icon="📋" title="Executive Summary"      content={ai.executive_summary}  accentColor="#58a6ff" />
      <AISection icon="⚙️" title="Technical Analysis"     content={technical}             accentColor="#f0883e" />
      <AISection icon="📊" title="Risk Justification"     content={riskJust}              accentColor="#f39c12" />
      <AISection icon="💼" title="Business Impact"        content={business}              accentColor="#e74c3c" />
    </div>
  );
}

export function MitigationSection({ strategy }: { strategy: string }) {
  if (!strategy) return null;

  // Handle numbered list format (from new structured AI output)
  const lines = strategy
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  return (
    <div>
      {lines.map((line, i) => {
        // Detect priority tag [CRITICAL] [HIGH] [MEDIUM] [LOW]
        const criticalMatch = line.match(/\[(CRITICAL|HIGH|MEDIUM|LOW)\]/);
        const priority = criticalMatch ? criticalMatch[1] : null;
        const priorityColors: Record<string, string> = {
          CRITICAL: "#e74c3c", HIGH: "#f39c12", MEDIUM: "#f1c40f", LOW: "#58a6ff",
        };
        const accentColor = priority ? priorityColors[priority] : "#3fb950";
        const cleanLine = line.replace(/^\d+\.\s*/, "").replace(/\[(?:CRITICAL|HIGH|MEDIUM|LOW)\]\s*/, "").trim();

        return (
          <div key={i} style={{
            background: priority
              ? `rgba(${priority === "CRITICAL" ? "231,76,60" : priority === "HIGH" ? "243,156,18" : priority === "MEDIUM" ? "241,196,15" : "88,166,255"},0.05)`
              : "rgba(63,185,80,0.05)",
            borderLeft: `3px solid ${accentColor}`,
            borderRadius: "0 6px 6px 0",
            padding: "10px 14px", marginBottom: "7px",
            display: "flex", alignItems: "flex-start", gap: "10px",
          }}>
            {priority ? (
              <span style={{ color: accentColor, fontSize: "9px", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.8px",
                flexShrink: 0, marginTop: "2px", minWidth: "52px" }}>
                [{priority}]
              </span>
            ) : (
              <span style={{ color: "#3fb950", flexShrink: 0, marginTop: "1px" }}>✓</span>
            )}
            <span style={{ color: "#c9d1d9", fontSize: "13px", lineHeight: "1.6" }}>{cleanLine}</span>
          </div>
        );
      })}
    </div>
  );
}
