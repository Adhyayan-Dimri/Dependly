import {
  ApplicationSummary,
  GraphResponse,
  PackageDetail,
  PackageSearchResult,
  RiskScore,
  SimulationResponse,
  MitigationsResponse,
  ExplainResponse,
  AlternativesResponse,
  TyposquatFlag,
  SystemHealth,
  ExecutionType
} from '../types';

const API_BASE = '/api';

export const api = {
  async getApplications(): Promise<ApplicationSummary[]> {
    const res = await fetch(`${API_BASE}/applications`);
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to fetch applications');
    return res.json();
  },

  async deleteApplication(appId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/applications/${appId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to delete application');
    return res.json();
  },

  async getApplicationGraph(appId: string): Promise<GraphResponse> {
    const res = await fetch(`${API_BASE}/applications/${appId}/graph`);
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to fetch application graph');
    return res.json();
  },

  async uploadManifest(file: File, criticalityTag: string, appNameOverride?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('criticality_tag', criticalityTag);
    if (appNameOverride) {
      formData.append('app_name_override', appNameOverride);
    }

    const res = await fetch(`${API_BASE}/applications/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to upload manifest');
    return res.json();
  },

  async ingestGitHubRepo(repoUrl: string, criticalityTag: string, name?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/applications/github`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_url: repoUrl, criticality_tag: criticalityTag, name }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to ingest GitHub repository');
    return res.json();
  },

  async getPackageDetail(pkgId: string): Promise<PackageDetail> {
    const res = await fetch(`${API_BASE}/packages/${pkgId}`);
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to fetch package details');
    return res.json();
  },

  async getPackageRisk(pkgId: string): Promise<RiskScore> {
    const res = await fetch(`${API_BASE}/packages/${pkgId}/risk`);
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to fetch package risk');
    return res.json();
  },

  async simulateCompromise(pkgId: string, executionType: ExecutionType): Promise<SimulationResponse> {
    const res = await fetch(`${API_BASE}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package_id: pkgId, execution_type: executionType }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Simulation failed');
    return res.json();
  },

  async getMitigations(pkgId: string): Promise<MitigationsResponse> {
    const res = await fetch(`${API_BASE}/mitigations/${pkgId}`);
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to fetch mitigations');
    return res.json();
  },

  async explainRisk(pkgId: string): Promise<ExplainResponse> {
    const res = await fetch(`${API_BASE}/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package_id: pkgId }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to explain risk');
    return res.json();
  },

  async getAlternatives(pkgId: string): Promise<AlternativesResponse> {
    const res = await fetch(`${API_BASE}/alternatives/${pkgId}`);
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to fetch alternatives');
    return res.json();
  },

  async getTyposquatFlags(): Promise<TyposquatFlag[]> {
    const res = await fetch(`${API_BASE}/typosquat-flags`);
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to fetch typosquat flags');
    return res.json();
  },

  async getSystemHealth(): Promise<SystemHealth> {
    const res = await fetch(`${API_BASE}/system/health`);
    if (!res.ok) throw new Error('Failed to fetch system health');
    return res.json();
  },

  async searchPackages(q: string, ecosystem?: string, limit = 20): Promise<PackageSearchResult[]> {
    const params = new URLSearchParams({ q, limit: String(limit) });
    if (ecosystem) params.set('ecosystem', ecosystem);
    const res = await fetch(`${API_BASE}/packages/search?${params}`);
    if (!res.ok) throw new Error('Failed to search packages');
    return res.json();
  },

  async getTopRiskPackages(limit = 10): Promise<PackageSearchResult[]> {
    const res = await fetch(`${API_BASE}/packages/top-risk?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch top-risk packages');
    return res.json();
  },

  async updateSettings(payload: Record<string, any>): Promise<any> {
    const res = await fetch(`${API_BASE}/system/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  }
};
