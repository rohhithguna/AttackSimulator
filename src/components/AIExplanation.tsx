"use client";

interface AIData {
  executive_summary: string;
  technical_reasoning: string;
  mitigation_strategy: string;
  business_impact: string;
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
    <div
      style={{
        background: "#161b22",
        border: "1px solid #30363d",
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: "0 8px 8px 0",
        padding: "16px 20px",
        marginBottom: "12px",
      }}
    >
      <div
        style={{
          color: accentColor,
          fontSize: "12px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: "8px",
        }}
      >
        {icon} {title}
      </div>
      <p
        style={{
          color: "#c9d1d9",
          fontSize: "14px",
          lineHeight: "1.7",
          margin: 0,
          whiteSpace: "pre-wrap",
        }}
      >
        {content}
      </p>
    </div>
  );
}

export default function AIExplanation({ ai }: Props) {
  return (
    <div>
      {ai.error && (
        <div
          style={{
            background: "rgba(88,166,255,0.08)",
            border: "1px solid rgba(88,166,255,0.2)",
            borderRadius: "8px",
            padding: "10px 14px",
            fontSize: "12px",
            color: "#58a6ff",
            marginBottom: "12px",
          }}
        >
          ℹ️ {ai.error} — showing rule-based analysis
        </div>
      )}
      <AISection
        icon="📋"
        title="Executive Summary"
        content={ai.executive_summary}
        accentColor="#58a6ff"
      />
      <AISection
        icon="⚙️"
        title="Technical Reasoning"
        content={ai.technical_reasoning}
        accentColor="#f0883e"
      />
      <AISection
        icon="💼"
        title="Business Impact"
        content={ai.business_impact}
        accentColor="#e74c3c"
      />
    </div>
  );
}

export function MitigationSection({ strategy }: { strategy: string }) {
  if (!strategy) return null;
  const lines = strategy
    .split("\n")
    .map((l) => l.replace(/^[•\-–\d. ]+/, "").trim())
    .filter(Boolean);

  return (
    <div>
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            background: "rgba(63,185,80,0.05)",
            borderLeft: "3px solid #3fb950",
            borderRadius: "0 6px 6px 0",
            padding: "10px 14px",
            marginBottom: "8px",
            fontSize: "14px",
            color: "#c9d1d9",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
          }}
        >
          <span style={{ color: "#3fb950", flexShrink: 0, marginTop: "1px" }}>✓</span>
          <span>{line}</span>
        </div>
      ))}
    </div>
  );
}
