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

export interface TimelineStep {
  step: number;
  node: string;
  action: string;
  time_delta: string;
  privilege_level: string;
}

export interface PathCluster {
  cluster_type: string;
  count: number;
  representative_path: string[];
}

export interface SensitivityScenario {
  skill_level: string;
  skill_value: number;
  risk_score: number;
  breach_probability: number;
}

export interface SensitivityAnalysis {
  analysis_type: string;
  scenarios: SensitivityScenario[];
  risk_variance: number;
}

export interface HardenMetrics {
  node_hardened: string;
  original_risk: number;
  new_risk: number;
  risk_reduction_pct: number;
  original_path_count: number;
  new_path_count: number;
  path_reduction_pct: number;
  original_probability: number;
  new_probability: number;
}

export interface ResilienceSummary {
  is_resilient: boolean;
  reason: string;
  confidence: number;
}

export interface SimulationResult {
  // Attack paths
  primary_attack_path: string[];
  secondary_attack_path: string[];
  secondary_paths: string[][];
  path_count: number;
  // Legacy compat
  attack_path: string[];
  attack_steps: AttackStep[];
  vulnerability_chain: string[];
  entry_point: string;
  target: string;
  attack_timeline?: TimelineStep[];
  path_clusters?: PathCluster[];

  // Risk
  risk_score: number;
  structural_risk?: number;
  advanced_risk?: number;
  severity: "Low" | "Medium" | "High" | "Critical";
  severity_color: string;
  component_scores: {
    exposure_weight: number;
    privilege_weight: number;
    asset_value_weight: number;
    depth_weight: number;
  };
  risk_components?: {
    structural_exposure: number;
    intrinsic_vulnerability: number;
    target_proximity: number;
    privilege_amplification: number;
  };

  // Probability & Simulation
  exploit_probability?: number;
  breach_probability_overall?: number;
  monte_carlo_results?: {
    iterations: number;
    breach_success_rate: number;
    average_time_if_successful: string;
  };
  choke_points?: Array<{ node: string; centrality: number }>;
    harden_metrics?: HardenMetrics | null;
    sensitivity_analysis?: SensitivityAnalysis;
    resilience_summary?: ResilienceSummary;

    // Confidence
    confidence_score: number;
    confidence_label: string;
    confidence_color: string;
    confidence_factors: Record<string, number>;

    // Breach time
    breach_time: string;
    breach_time_data: {
      display: string;
      total_minutes: number;
      breakdown: BreachBreakdown[];
    };

    // Business impact
    business_impact: BusinessImpact;

    // AI Standard Output
    ai_analysis?: {
      executive_summary: string;
      technical_analysis: string;
      risk_justification: string;
      business_interpretation: string;
      mitigation_roadmap: string;
      error: string | null;
    };

    // AI Detail Object
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
