from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime

# Common Models
class FactorBreakdown(BaseModel):
    dependents_normalized: float = Field(..., ge=0.0, le=1.0)
    centrality_normalized: float = Field(..., ge=0.0, le=1.0)
    vulnerability_severity_normalized: float = Field(..., ge=0.0, le=1.0)
    active_exploitation_flag: float = Field(..., ge=0.0, le=1.0)
    maintainer_health_risk: float = Field(..., ge=0.0, le=1.0)
    critical_app_exposure: float = Field(..., ge=0.0, le=1.0)

class VulnerabilityItem(BaseModel):
    id: Optional[str] = None
    package_id: str
    cve_id: str
    severity: Literal["low", "medium", "high", "critical"]
    is_actively_exploited: bool = False
    disclosed_date: Optional[datetime] = None
    summary: Optional[str] = None

class RiskScoreModel(BaseModel):
    id: Optional[str] = None
    package_id: str
    score: float = Field(..., ge=0.0, le=100.0)
    factor_breakdown: FactorBreakdown
    computed_at: Optional[datetime] = None

class PackageDetail(BaseModel):
    id: str
    ecosystem: Literal["npm", "pypi"]
    name: str
    version: str
    maintainers: List[str] = []
    last_release_date: Optional[datetime] = None
    scorecard_score: Optional[float] = None
    download_rank: Optional[int] = None
    risk_score: Optional[RiskScoreModel] = None
    vulnerabilities: List[VulnerabilityItem] = []
    is_compromised: Optional[bool] = False

class ApplicationSummary(BaseModel):
    id: str
    name: str
    criticality_tag: Literal["customer_facing", "internal", "experimental"]
    source: Literal["seeded", "uploaded", "github"]
    source_ref: Optional[str] = None
    direct_deps_count: int = 0
    total_deps_count: int = 0
    max_risk_score: Optional[float] = 0.0

class ApplicationDetail(ApplicationSummary):
    direct_deps: List[str] = []
    created_at: Optional[datetime] = None

# Graph schemas for Cytoscape
class CytoscapeNodeData(BaseModel):
    id: str
    label: str
    name: str
    version: Optional[str] = None
    ecosystem: Optional[str] = None
    type: Literal["application", "direct_dep", "transitive_dep"] = "transitive_dep"
    criticality_tag: Optional[str] = None
    risk_score: float = 0.0
    has_kev: bool = False
    vulnerability_count: int = 0
    scorecard_score: Optional[float] = None
    is_compromised: bool = False
    is_affected: bool = False
    is_customer_facing: bool = False
    maintainer_count: int = 1

class CytoscapeNode(BaseModel):
    data: CytoscapeNodeData

class CytoscapeEdgeData(BaseModel):
    id: str
    source: str
    target: str
    version_range: Optional[str] = None
    is_dev_dependency: bool = False
    is_propagation_path: bool = False

class CytoscapeEdge(BaseModel):
    data: CytoscapeEdgeData

class GraphResponse(BaseModel):
    application_id: str
    application_name: str
    criticality_tag: str
    nodes: List[CytoscapeNode]
    edges: List[CytoscapeEdge]
    stats: Dict[str, Any]

# Ingestion Requests
class GitHubIngestRequest(BaseModel):
    repo_url: str
    name: Optional[str] = None
    criticality_tag: Optional[Literal["customer_facing", "internal", "experimental"]] = "customer_facing"

# Simulation
class SimulationRequest(BaseModel):
    package_id: str
    execution_type: Literal["install_time", "runtime"] = "install_time"
    version_override: Optional[str] = None

class PropagationPath(BaseModel):
    path: List[str]  # package names or IDs
    path_names: List[str]
    target_app_id: str
    target_app_name: str
    is_customer_facing: bool
    depth: int

class SimulationResponse(BaseModel):
    compromised_package_id: str
    compromised_package_name: str
    execution_type: Literal["install_time", "runtime"]
    affected_packages: List[str]
    affected_applications: List[Dict[str, Any]]
    propagation_paths: List[PropagationPath]
    blast_radius: int
    max_depth: int
    estimated_cost: float
    customer_facing_apps_count: int

# Mitigations
class MitigationAction(BaseModel):
    rank: int
    action_type: Literal["patch", "major_bump", "alternative", "vendor_isolate"]
    title: str
    description: str
    target_version_or_package: str
    effort: int = Field(..., ge=1, le=3)
    effort_label: Literal["Low (Patch)", "Medium (Major Bump)", "High (Replace/Isolate)"]
    current_score: float
    projected_score: float
    risk_reduction: float
    priority_score: float

class MitigationsResponse(BaseModel):
    package_id: str
    package_name: str
    current_score: float
    mitigations: List[MitigationAction]

# Explain AI
class ExplainRequest(BaseModel):
    package_id: str

class ExplainResponse(BaseModel):
    package_id: str
    package_name: str
    narration: str
    prompt_used: str
    provider: str

# Alternatives
class PackageAlternative(BaseModel):
    name: str
    ecosystem: str
    recommended_version: str
    score: float
    scorecard_score: Optional[float] = None
    downloads_summary: Optional[str] = None
    maintenance_status: str
    tradeoff_summary: str
    effort_estimate: int

class AlternativesResponse(BaseModel):
    package_id: str
    package_name: str
    current_score: float
    alternatives: List[PackageAlternative]

# Typosquat
class TyposquatFlag(BaseModel):
    id: str
    package_id: str
    package_name: str
    ecosystem: str
    suspected_target: str
    edit_distance: int
    detected_at: Optional[datetime] = None

# Settings & System Health
class SystemHealthResponse(BaseModel):
    status: str
    mongo_connected: bool
    packages_count: int
    applications_count: int
    active_graph_nodes: int
    active_graph_edges: int
    ai_provider: str
    has_openrouter_key: bool
    has_github_token: bool
