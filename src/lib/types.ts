export interface AttackStep {
  node: string;
  step_type: "Initial Exploit" | "Privilege Escalation" | "Lateral Movement" | "Data Exfiltration";
  vulns: string[];
  permission: "low" | "medium" | "high";
  asset_value: number;
  ports: number[];
}

export interface BreachBreakdown {
  node: string;
  step_type: string;
  base_minutes: number;
  adjusted_minutes: number;
  modifier: number;
  port_adjustment: number;
}

export interface GraphNode {
  id: string;
  permission: string;
  asset_value: number;
  public_facing: boolean;
  exposure_score: number;
  open_ports: number[];
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface BusinessImpact {
  data_risk: string;
  operational_risk: string;
  compliance_risk: string;
  summary_tags: string[];
}

export interface SimulationResult {
  // Attack paths
  primary_attack_path: string[];
  secondary_attack_path: string[];
  path_count: number;
  // Legacy compat
  attack_path: string[];
  attack_steps: AttackStep[];
  vulnerability_chain: string[];
  entry_point: string;
  target: string;

  // Risk
  risk_score: number;
  severity: "Low" | "Medium" | "High" | "Critical";
  severity_color: string;
  component_scores: {
    exposure_weight: number;
    privilege_weight: number;
    asset_value_weight: number;
    depth_weight: number;
  };

  // Confidence
  confidence_score: number;
  confidence_label: string;
  confidence_color: string;
  confidence_factors: Record<string, number>;

  // Breach time
  breach_time: {
    display: string;
    total_minutes: number;
    breakdown: BreachBreakdown[];
  };

  // Business impact
  business_impact: BusinessImpact;

  // AI
  ai: {
    executive_summary: string;
    technical_analysis: string;
    risk_justification: string;
    business_interpretation: string;
    mitigation_roadmap: string;
    // Legacy compat
    technical_reasoning: string;
    mitigation_strategy: string;
    business_impact: string;
    error: string | null;
  };

  // Graph
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  arch: {
    servers: string[];
    connections: string[][];
    open_ports: Record<string, number[]>;
    permissions: Record<string, string>;
    asset_value: Record<string, number>;
    public_facing: string[];
  };
  error?: string;
}
