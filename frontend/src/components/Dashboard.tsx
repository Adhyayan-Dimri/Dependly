import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  Layers,
  AlertTriangle,
  PlusCircle,
  Cpu,
  Activity,
  Compass,
  Zap,
  Lock,
  Flame,
  Search,
  X,
  TrendingUp,
  Package,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { ApplicationSummary, PackageSearchResult } from '../types';
import { api } from '../services/api';

interface DashboardProps {
  applications: ApplicationSummary[];
  onSelectApp: (appId: string) => void;
  onOpenIngestModal: () => void;
  onOpenWarRoom: (packageId?: string) => void;
  onOpenRiskReport: (packageId: string) => void;
  onOpenExplorer: (appId: string) => void;
  onDeleteApp?: (appId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  applications,
  onSelectApp,
  onOpenIngestModal,
  onOpenWarRoom,
  onOpenRiskReport,
  onOpenExplorer,
  onDeleteApp
}) => {
  const totalApps = applications.length;
  const customerFacingApps = applications.filter(a => a.criticality_tag === 'customer_facing').length;
  const totalDepsMonitored = applications.reduce((acc, a) => acc + (a.total_deps_count || 0), 0);
  const maxRisk = applications.reduce((acc, a) => Math.max(acc, a.max_risk_score || 0), 0);

  const [searchQuery, setSearchQuery] = useState('');
  const [ecosystemFilter, setEcosystemFilter] = useState<'all' | 'npm' | 'pypi'>('all');
  const [searchResults, setSearchResults] = useState<PackageSearchResult[]>([]);
  const [topRisk, setTopRisk] = useState<PackageSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingTop, setIsLoadingTop] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsLoadingTop(true);
    api.getTopRiskPackages(8)
      .then(setTopRisk)
      .catch(() => setTopRisk([]))
      .finally(() => setIsLoadingTop(false));
  }, []);

  const runSearch = useCallback((q: string, eco: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setHasSearched(true);
      try {
        const results = await api.searchPackages(q, eco === 'all' ? undefined : eco, 20);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 320);
  }, []);

  const handleQueryChange = (val: string) => {
    setSearchQuery(val);
    if (val.trim().length === 0) {
      setHasSearched(false);
      setSearchResults([]);
      return;
    }
    runSearch(val, ecosystemFilter);
  };

  const handleEcoChange = (eco: 'all' | 'npm' | 'pypi') => {
    setEcosystemFilter(eco);
    if (searchQuery.trim()) runSearch(searchQuery, eco);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setHasSearched(false);
    setSearchResults([]);
  };

  const displayList = hasSearched ? searchResults : topRisk;
  const isLoading = hasSearched ? isSearching : isLoadingTop;

  const riskColor = (score: number) => {
    if (score >= 70) return { text: 'text-[#FF5D5D]', bg: 'bg-[#FF5D5D]/20', border: 'border-[#FF5D5D]/40' };
    if (score >= 45) return { text: 'text-[#F5A623]', bg: 'bg-[#F5A623]/20', border: 'border-[#F5A623]/40' };
    return { text: 'text-[#3DDC97]', bg: 'bg-[#3DDC97]/10', border: 'border-[#3DDC97]/30' };
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-10 space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#1C2333] pb-6 gap-4">
        <div>
          <div className="flex items-center space-x-2 font-mono text-xs text-[#3DDC97] mb-1">
            <Activity className="w-4 h-4" />
            <span>THREAT RADAR &bull; DEPENDENCY GRAPH TELEMETRY</span>
          </div>
          <h2 className="text-3xl font-extrabold text-[#E6EDF3] tracking-tight">
            Ecosystem Security &amp; Blast Radius Overview
          </h2>
          <p className="text-sm text-[#8B949E] mt-1 max-w-2xl">
            Continuous deep graph analysis modeling version-filtered compromise propagation, maintainer bus factor, and financial exposure across customer-facing architectures.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenIngestModal}
            className="px-4 py-2.5 rounded-lg bg-[#3DDC97] text-[#0A0E14] font-mono text-xs font-bold hover:bg-[#3DDC97]/90 transition-all flex items-center space-x-2 shadow-glow-green"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Ingest Application</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1C2333]/90 border border-[#2A364F] rounded-xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="font-mono text-xs text-[#8B949E] uppercase">Monitored Applications</span>
            <div className="p-2 rounded bg-[#141B26] border border-[#2A364F] text-[#4D96FF]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="font-mono text-3xl font-bold text-[#E6EDF3]">{totalApps}</span>
            <span className="text-xs text-[#3DDC97] font-mono">({customerFacingApps} customer-facing)</span>
          </div>
          <div className="mt-2 text-xs text-[#5B6878] font-mono">{totalDepsMonitored} total packages tracked</div>
        </div>

        <div className="bg-[#1C2333]/90 border border-[#2A364F] rounded-xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="font-mono text-xs text-[#8B949E] uppercase">Active CISA KEV CVEs</span>
            <div className="p-2 rounded bg-[#FF5D5D]/10 border border-[#FF5D5D]/40 text-[#FF5D5D]">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="font-mono text-3xl font-bold text-[#FF5D5D]">
              {topRisk.filter(p => p.has_kev).length || '—'}
            </span>
            <span className="text-xs text-[#FF5D5D] font-mono font-semibold">ACTIVELY EXPLOITED</span>
          </div>
          <div className="mt-2 text-xs text-[#8B949E] font-mono">Confirmed in federal threat catalog</div>
        </div>

        <div className="bg-[#1C2333]/90 border border-[#2A364F] rounded-xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="font-mono text-xs text-[#8B949E] uppercase">Highest Risk Score</span>
            <div className="p-2 rounded bg-[#141B26] border border-[#2A364F] text-[#F5A623]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="font-mono text-3xl font-bold text-[#F5A623]">
              {maxRisk > 0 ? maxRisk.toFixed(1) : '—'}
            </span>
            <span className="text-xs text-[#8B949E] font-mono">/ 100</span>
          </div>
          <div className="mt-2 text-xs text-[#5B6878] font-mono">Across all monitored apps</div>
        </div>

        <div className="bg-[#1C2333]/90 border border-[#2A364F] rounded-xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="font-mono text-xs text-[#8B949E] uppercase">Packages in DB</span>
            <div className="p-2 rounded bg-[#141B26] border border-[#2A364F] text-[#3DDC97]">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="font-mono text-3xl font-bold text-[#3DDC97]">{totalDepsMonitored}</span>
          </div>
          <div className="mt-2 text-xs text-[#5B6878] font-mono">Resolved &amp; risk-scored</div>
        </div>
      </div>

      <div className="bg-[#1C2333]/70 border border-[#2A364F] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#2A364F]/60 gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <Search className="w-5 h-5 text-[#4D96FF]" />
              <h3 className="text-lg font-bold text-[#E6EDF3]">Package Risk Explorer</h3>
            </div>
            <p className="text-xs text-[#8B949E] mt-0.5">
              Search packages from your ingested apps — or browse the highest-risk dependencies automatically detected
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {(['all', 'npm', 'pypi'] as const).map(eco => (
              <button
                key={eco}
                onClick={() => handleEcoChange(eco)}
                className={`px-3 py-1 rounded font-mono text-xs transition-all border ${
                  ecosystemFilter === eco
                    ? 'bg-[#4D96FF]/20 border-[#4D96FF]/60 text-[#4D96FF] font-bold'
                    : 'bg-[#141B26] border-[#2A364F] text-[#8B949E] hover:text-[#E6EDF3]'
                }`}
              >
                {eco === 'all' ? 'All' : eco}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B6878]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="Search by package name (e.g. lodash, requests, express)…"
            className="w-full pl-9 pr-9 py-2.5 bg-[#141B26] border border-[#2A364F] focus:border-[#4D96FF]/60 rounded-lg text-sm text-[#E6EDF3] placeholder-[#5B6878] font-mono outline-none transition-all"
          />
          {searchQuery && (
            <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6878] hover:text-[#E6EDF3] transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {!hasSearched && (
          <div className="mt-3 flex items-center space-x-2 font-mono text-[11px] text-[#5B6878]">
            <TrendingUp className="w-3.5 h-3.5 text-[#F5A623]" />
            <span>
              {totalApps > 0 
                ? "Showing top-risk packages from your ingested applications. Type to search any specific package." 
                : "Showing highest risk packages across the global database. Type to search any specific package."}
            </span>
          </div>
        )}

        <div className="mt-4">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-10 flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-8 h-8 border-2 border-[#4D96FF]/30 border-t-[#4D96FF] rounded-full animate-spin" />
                <p className="font-mono text-xs text-[#5B6878]">{hasSearched ? 'Searching packages…' : 'Loading risk index…'}</p>
              </motion.div>
            ) : displayList.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 flex flex-col items-center justify-center space-y-3 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-[#141B26] border border-[#2A364F] flex items-center justify-center">
                  <Package className="w-5 h-5 text-[#5B6878]" />
                </div>
                <p className="font-mono text-sm text-[#8B949E]">
                  {hasSearched
                    ? `No packages matching "${searchQuery}"${ecosystemFilter !== 'all' ? ` in ${ecosystemFilter}` : ''} found in the database.`
                    : 'No applications ingested yet. Add an app to start exploring risk.'}
                </p>
                {!hasSearched && (
                  <button
                    onClick={onOpenIngestModal}
                    className="mt-2 px-4 py-2 rounded-lg bg-[#3DDC97] text-[#0A0E14] font-mono text-xs font-bold hover:bg-[#3DDC97]/90 transition-all flex items-center space-x-2"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Ingest Application</span>
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="divide-y divide-[#2A364F]/50"
              >
                {displayList.map((pkg, idx) => {
                  const colors = riskColor(pkg.risk_score);
                  return (
                    <motion.div
                      key={pkg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#141B26]/60 px-3 rounded-lg transition-all"
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`mt-1 font-mono text-xs px-2.5 py-1 rounded font-bold shrink-0 border ${colors.bg} ${colors.text} ${colors.border}`}>
                          {pkg.risk_score > 0 ? `${pkg.risk_score.toFixed(1)} / 100` : 'Unscored'}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-[#E6EDF3] text-sm">{pkg.name}</span>
                            <span className="font-mono text-xs text-[#8B949E] bg-[#141B26] px-2 py-0.5 rounded border border-[#2A364F]">
                              @{pkg.version || 'latest'}
                            </span>
                            <span className="text-[11px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#2A364F] text-[#8B949E]">
                              {pkg.ecosystem}
                            </span>
                            {pkg.has_kev && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FF5D5D]/20 border border-[#FF5D5D]/40 text-[#FF5D5D] font-semibold flex items-center space-x-1">
                                <Flame className="w-3 h-3" />
                                <span>CISA KEV</span>
                              </span>
                            )}
                            {pkg.cve_count > 0 && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F5A623]/15 border border-[#F5A623]/40 text-[#F5A623]">
                                {pkg.cve_count} CVE{pkg.cve_count > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          {pkg.top_cve && (
                            <p className="text-xs text-[#8B949E] mt-1">
                              <strong className="text-[#FF5D5D] font-mono">{pkg.top_cve}</strong>
                              {pkg.cve_desc ? `: ${pkg.cve_desc.slice(0, 100)}${pkg.cve_desc.length > 100 ? '…' : ''}` : ''}
                            </p>
                          )}
                          {!pkg.top_cve && (
                            <p className="text-xs text-[#5B6878] mt-1 font-mono">No CVEs recorded — structural risk only</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end md:self-center shrink-0">
                        <button
                          onClick={() => onOpenRiskReport(pkg.id)}
                          className="px-3 py-1.5 rounded bg-[#141B26] border border-[#2A364F] hover:border-[#4D96FF] text-[#E6EDF3] hover:text-[#4D96FF] font-mono text-xs transition-all"
                        >
                          Risk Report
                        </button>
                        <button
                          onClick={() => onOpenWarRoom(pkg.id)}
                          className="px-3.5 py-1.5 rounded bg-[#FF5D5D]/15 border border-[#FF5D5D]/40 text-[#FF5D5D] hover:bg-[#FF5D5D]/30 font-mono text-xs font-semibold flex items-center space-x-1.5 transition-all"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Simulate</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-[#E6EDF3]">Monitored Target Applications</h3>
            <p className="text-xs text-[#8B949E]">Select an application to explore its Cytoscape dependency topology</p>
          </div>
          <span className="font-mono text-xs text-[#8B949E]">{applications.length} Applications Configured</span>
        </div>

        {applications.length === 0 ? (
          <div className="bg-[#1C2333]/50 border border-dashed border-[#2A364F] rounded-xl p-10 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-[#141B26] border border-[#2A364F] flex items-center justify-center">
              <Layers className="w-6 h-6 text-[#3DDC97]" />
            </div>
            <div>
              <p className="text-[#E6EDF3] font-semibold">No applications ingested yet</p>
              <p className="text-xs text-[#8B949E] mt-1">Upload a manifest, paste a GitHub URL, or pick a seeded demo app to get started.</p>
            </div>
            <button
              onClick={onOpenIngestModal}
              className="px-5 py-2.5 rounded-lg bg-[#3DDC97] text-[#0A0E14] font-mono text-sm font-bold hover:bg-[#3DDC97]/90 transition-all flex items-center space-x-2 shadow-glow-green"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Ingest First Application</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-[#1C2333] border border-[#2A364F] hover:border-[#3DDC97]/60 rounded-xl p-5 flex flex-col justify-between transition-all hover:shadow-glow-green group"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full font-semibold ${
                      app.criticality_tag === 'customer_facing'
                        ? 'bg-[#FF5D5D]/15 border border-[#FF5D5D]/40 text-[#FF5D5D]'
                        : 'bg-[#4D96FF]/15 border border-[#4D96FF]/40 text-[#4D96FF]'
                    }`}>
                      {app.criticality_tag.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-[#8B949E] bg-[#141B26] px-2 py-0.5 rounded border border-[#2A364F]">
                      {app.source}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-[#E6EDF3] group-hover:text-[#3DDC97] transition-colors">
                    {app.name}
                  </h4>
                  <p className="text-xs text-[#5B6878] font-mono mt-1 truncate">
                    Ref: {app.source_ref || 'Local Manifest'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-[#2A364F]/50 grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[#8B949E] block text-[10px]">DIRECT DEPS</span>
                      <span className="font-bold text-[#E6EDF3]">{app.direct_deps_count}</span>
                    </div>
                    <div>
                      <span className="text-[#8B949E] block text-[10px]">TOTAL RESOLVED</span>
                      <span className="font-bold text-[#4D96FF]">{app.total_deps_count}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between font-mono text-xs">
                    <span className="text-[#8B949E] text-[11px]">Max Component Risk:</span>
                    <span className={`font-bold ${app.max_risk_score >= 60 ? 'text-[#FF5D5D]' : 'text-[#3DDC97]'}`}>
                      {app.max_risk_score.toFixed(1)} / 100
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-[#2A364F]/50 flex items-center space-x-2">
                  <button
                    onClick={() => onOpenExplorer(app.id)}
                    className="flex-1 py-2 rounded bg-[#141B26] hover:bg-[#3DDC97] text-[#8B949E] hover:text-[#0A0E14] font-mono text-xs font-bold transition-all border border-[#2A364F] hover:border-[#3DDC97] flex items-center justify-center space-x-1.5"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Explore Graph</span>
                  </button>
                  {onDeleteApp && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to remove ${app.name}?`)) {
                          onDeleteApp(app.id);
                        }
                      }}
                      title="Remove Application"
                      className="p-2 rounded bg-[#FF5D5D]/10 hover:bg-[#FF5D5D]/25 border border-[#FF5D5D]/30 text-[#FF5D5D] transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
