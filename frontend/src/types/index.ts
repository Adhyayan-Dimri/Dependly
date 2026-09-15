export type CriticalityTag = 'customer_facing' | 'internal' | 'experimental';
export type Ecosystem = 'npm' | 'pypi';
export type IngestionSource = 'seeded' | 'uploaded' | 'github';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type ExecutionType = 'install_time' | 'runtime';

/** Lightweight package result returned by /api/packages/search and /api/packages/top-risk */
export interface PackageSearchResult {
  id: string;
  name: string;
  version: string;
  ecosystem: Ecosystem;
  risk_score: number;
  cve_count: number;
  has_kev: boolean;
  top_cve: string | null;
  cve_desc: string | null;
}


export interface FactorBreakdown {
  dependents_normalized: number;
  centrality_normalized: number;
  vulnerability_severity_normalized: number;
  active_exploitation_flag: number;
  maintainer_health_risk: number;
  critical_app_exposure: number;
}

export interface Vulnerability {
  id?: string;
  package_id: string;
  cve_id: string;
  severity: Severity;
  is_actively_exploited: boolean;
  disclosed_date?: string;
  summary?: string;
}

export interface RiskScore {
  score: number;
  factor_breakdown: FactorBreakdown;
  computed_at?: string;
}

export interface PackageDetail {
  id: string;
  ecosystem: Ecosystem;
  name: string;
  version: string;
  maintainers: string[];
  last_release_date?: string;
  scorecard_score?: number;
  download_rank?: number;
  risk_score?: RiskScore;
  vulnerabilities: Vulnerability[];
}

export interface ApplicationSummary {
  id: string;
  name: string;
  criticality_tag: CriticalityTag;
  source: IngestionSource;
  source_ref?: string;
  direct_deps_count: number;
  total_deps_count: number;
  max_risk_score: number;
}

export interface CytoscapeNodeData {
  id: string;
  label: string;
  name: string;
  version?: string;
  ecosystem?: Ecosystem;
  type: 'application' | 'direct_dep' | 'transitive_dep';
  criticality_tag?: CriticalityTag;
  risk_score: number;
  has_kev: boolean;
  vulnerability_count: number;
  scorecard_score?: number;
  is_compromised?: boolean;
  is_affected?: boolean;
  is_customer_facing?: boolean;
  maintainer_count?: number;
  depth?: number;
}

export interface CytoscapeEdgeData {
  id: string;
  source: string;
  target: string;
  version_range?: string;
  is_dev_dependency: boolean;
  is_propagation_path?: boolean;
}

export interface GraphResponse {
  application_id: string;
  application_name: string;
  criticality_tag: CriticalityTag;
  nodes: { data: CytoscapeNodeData }[];
  edges: { data: CytoscapeEdgeData }[];
  stats: {
    total_nodes: number;
    total_packages: number;
    direct_dependencies: number;
    transitive_dependencies: number;
    total_edges: number;
    critical_packages: number;
    actively_exploited_cves: number;
  };
}

export interface PropagationPath {
  path: string[];
  path_names: string[];
  target_app_id: string;
  target_app_name: string;
  is_customer_facing: boolean;
  depth: number;
}

export interface SimulationResponse {
  compromised_package_id: string;
  compromised_package_name: string;
  execution_type: ExecutionType;
  affected_packages: string[];
  affected_applications: {
    id: string;
    name: string;
    criticality_tag: CriticalityTag;
    is_customer_facing: boolean;
  }[];
  propagation_paths: PropagationPath[];
  blast_radius: number;
  max_depth: number;
  estimated_cost: number;
  customer_facing_apps_count: number;
}

export interface MitigationAction {
  rank: number;
  action_type: 'patch' | 'major_bump' | 'alternative' | 'vendor_isolate';
  title: string;
  description: string;
  target_version_or_package: string;
  effort: 1 | 2 | 3;
  effort_label: string;
  current_score: number;
  projected_score: number;
  risk_reduction: number;
  priority_score: number;
}

export interface MitigationsResponse {
  package_id: string;
  package_name: string;
  current_score: number;
  mitigations: MitigationAction[];
}

export interface ExplainResponse {
  package_id: string;
  package_name: string;
  narration: string;
  prompt_used: string;
  provider: string;
}

export interface PackageAlternative {
  name: string;
  ecosystem: string;
  recommended_version: string;
  score: number;
  scorecard_score?: number;
  downloads_summary?: string;
  maintenance_status: string;
  tradeoff_summary: string;
  effort_estimate: number;
}

export interface AlternativesResponse {
  package_id: string;
  package_name: string;
  current_score: number;
  alternatives: PackageAlternative[];
}

export interface TyposquatFlag {
  id: string;
  package_id: string;
  package_name: string;
  ecosystem: string;
  suspected_target: string;
  edit_distance: number;
  detected_at?: string;
}

export interface SystemHealth {
  status: string;
  mongo_connected: boolean;
  packages_count: number;
  applications_count: number;
  active_graph_nodes: number;
  active_graph_edges: number;
  ai_provider: string;
  has_openrouter_key: boolean;
  has_github_token: boolean;
}
