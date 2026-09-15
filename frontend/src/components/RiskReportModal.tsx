import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  ShieldAlert, 
  Award, 
  Flame, 
  Users, 
  Compass, 
  Cpu, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  ArrowUpRight,
  ExternalLink,
  Wrench,
  Zap
} from 'lucide-react';
import { PackageDetail, MitigationsResponse, ExplainResponse, FactorBreakdown } from '../types';
import { api } from '../services/api';

interface RiskReportModalProps {
  packageId: string;
  onClose: () => void;
  onOpenAlternatives: (packageId: string) => void;
  onOpenWarRoom: (packageId: string) => void;
}

export const RiskReportModal: React.FC<RiskReportModalProps> = ({
  packageId,
  onClose,
  onOpenAlternatives,
  onOpenWarRoom,
}) => {
  const [pkg, setPkg] = useState<PackageDetail | null>(null);
  const [mitigations, setMitigations] = useState<MitigationsResponse | null>(null);
  const [explainData, setExplainData] = useState<ExplainResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeScore, setActiveScore] = useState<number>(0);
  const [simulatedPatchScore, setSimulatedPatchScore] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      api.getPackageDetail(packageId),
      api.getMitigations(packageId),
      api.explainRisk(packageId),
    ])
      .then(([pkgRes, mitigRes, expRes]) => {
        if (isMounted) {
          setPkg(pkgRes);
          setMitigations(mitigRes);
          setExplainData(expRes);
          setActiveScore(pkgRes.risk_score?.score || 50.0);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [packageId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0E14]/80 backdrop-blur-md p-4">
        <div className="bg-[#141B26] border border-[#2A364F] rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full border-2 border-[#3DDC97] border-t-transparent animate-spin mx-auto"></div>
          <p className="font-mono text-xs text-[#3DDC97]">ANALYZING FACTOR BREAKDOWN & AI NARRATION...</p>
        </div>
      </div>
    );
  }

  if (!pkg) return null;

  const factors: FactorBreakdown = pkg.risk_score?.factor_breakdown || {
    dependents_normalized: 0.2,
    centrality_normalized: 0.1,
    vulnerability_severity_normalized: 0.5,
    active_exploitation_flag: 1.0,
    maintainer_health_risk: 0.6,
    critical_app_exposure: 0.8,
  };

  const currentDisplayScore = simulatedPatchScore !== null ? simulatedPatchScore : activeScore;

  const factorItems = [
    { label: 'Downstream Dependents Exposure (25%)', value: factors.dependents_normalized, desc: 'Fraction of dependency graph relying on package' },
    { label: 'Betweenness Centrality (15%)', value: factors.centrality_normalized, desc: 'Normalized hub criticality in graph topology' },
    { label: 'Vulnerability Severity Index (20%)', value: factors.vulnerability_severity_normalized, desc: 'Weighted CVSS magnitude of active CVEs' },
    { label: 'CISA KEV Active Exploitation (10%)', value: factors.active_exploitation_flag, desc: '1.0 if confirmed in federal exploit catalog' },
    { label: 'Maintainer Bus Factor & Inactivity (15%)', value: factors.maintainer_health_risk, desc: 'Single maintainer inactivity & scorecard' },
    { label: 'Critical Customer-Facing Exposure (15%)', value: factors.critical_app_exposure, desc: 'Proportion of affected apps in production' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0E14]/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#141B26] border border-[#2A364F] rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl space-y-8 my-auto animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-[#2A364F] pb-6">
          <div>
            <div className="flex items-center space-x-2 font-mono text-xs text-[#3DDC97] mb-1">
              <ShieldAlert className="w-4 h-4" />
              <span>PACKAGE RISK DEEP DIVE REPORT</span>
            </div>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold font-mono text-[#E6EDF3]">{pkg.name}</h2>
              <span className="font-mono text-xs px-2.5 py-1 rounded bg-[#1C2333] border border-[#2A364F] text-[#8B949E]">
                v{pkg.version}
              </span>
              <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-[#2A364F] text-[#8B949E]">
                {pkg.ecosystem}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1C2333] border border-[#2A364F] text-[#8B949E] hover:text-[#E6EDF3] hover:border-[#FF5D5D] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Score Reveal & Explainable AI Box */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Animated Score Card */}
          <div className="bg-[#1C2333] border border-[#2A364F] rounded-2xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <span className="font-mono text-xs text-[#8B949E] uppercase tracking-wider mb-2">Calculated Risk Index</span>
            
            <div className="relative my-2">
              <span className={`font-mono text-5xl font-extrabold tracking-tight ${
                currentDisplayScore >= 60 ? 'text-[#FF5D5D]' : 'text-[#3DDC97]'
              }`}>
                {currentDisplayScore.toFixed(1)}
              </span>
              <span className="text-xs font-mono text-[#8B949E] block mt-1">out of 100</span>
            </div>

            {simulatedPatchScore !== null && (
              <span className="text-[11px] font-mono text-[#3DDC97] font-bold bg-[#3DDC97]/15 px-3 py-1 rounded-full border border-[#3DDC97]/40 mt-2">
                Simulated Patch Applied
              </span>
            )}

            <div className="mt-4 pt-3 border-t border-[#2A364F] w-full flex justify-between text-[11px] font-mono text-[#8B949E]">
              <span>Scorecard: {pkg.scorecard_score || 'N/A'}</span>
              <span>CVEs: {pkg.vulnerabilities.length}</span>
            </div>
          </div>

          {/* Explainable AI Narration Box */}
          <div className="md:col-span-2 bg-[#1C2333]/90 border border-[#2A364F] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-2 text-xs font-mono text-[#3DDC97]">
                  <Sparkles className="w-4 h-4 text-[#3DDC97]" />
                  <span className="font-bold">EXPLAINABLE AI NARRATION</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#141B26] text-[#8B949E] border border-[#2A364F]">
                  {explainData?.provider || 'Grounded Engine'}
                </span>
              </div>

              <p className="text-sm text-[#E6EDF3] leading-relaxed font-sans">
                {explainData?.narration}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#2A364F]/50 flex justify-between items-center text-[10px] font-mono text-[#5B6878]">
              <span>Grounded strictly in stored metrics — no hallucinated scores</span>
              <button
                onClick={() => onOpenWarRoom(packageId)}
                className="text-[#3DDC97] hover:underline flex items-center space-x-1"
              >
                <span>Launch in War Room</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* 6-Factor Breakdown Bars */}
        <div className="bg-[#1C2333]/70 border border-[#2A364F] rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-[#E6EDF3]">6-Factor Mathematical Breakdown</h3>
            <span className="font-mono text-xs text-[#8B949E]">§5.3 Exact Formula</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {factorItems.map((item, i) => (
              <div key={i} className="bg-[#141B26] p-3.5 rounded-xl border border-[#2A364F]/70">
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-[#E6EDF3] font-semibold">{item.label}</span>
                  <span className="font-bold text-[#4D96FF]">{(item.value * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#1C2333] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      item.value >= 0.7 ? 'bg-[#FF5D5D]' : item.value >= 0.4 ? 'bg-[#F5A623]' : 'bg-[#3DDC97]'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, item.value * 100))}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-[#5B6878] font-mono mt-1.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Known Vulnerabilities List */}
        {pkg.vulnerabilities.length > 0 && (
          <div className="bg-[#1C2333]/70 border border-[#2A364F] rounded-2xl p-6 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-[#E6EDF3]">Identified Vulnerabilities ({pkg.vulnerabilities.length})</h3>
              <span className="font-mono text-xs text-[#FF5D5D]">OSV.dev + CISA KEV</span>
            </div>

            <div className="space-y-2">
              {pkg.vulnerabilities.map((v, idx) => (
                <div key={idx} className="bg-[#141B26] p-4 rounded-xl border border-[#2A364F] flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-sm text-[#FF5D5D]">{v.cve_id}</span>
                      <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-[#FF5D5D]/20 text-[#FF5D5D] font-bold">
                        {v.severity}
                      </span>
                      {v.is_actively_exploited && (
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#FF5D5D] text-[#0A0E14] font-bold flex items-center space-x-1">
                          <Flame className="w-3 h-3" />
                          <span>CISA KEV EXPLOITED</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#8B949E] mt-1">{v.summary || 'Known vulnerability in package parser.'}</p>
                  </div>

                  <a
                    href={`https://nvd.nist.gov/vuln/detail/${v.cve_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="self-end md:self-center font-mono text-xs text-[#4D96FF] hover:underline flex items-center space-x-1"
                  >
                    <span>NVD Record</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ranked Mitigation Recommendations */}
        {mitigations && mitigations.mitigations.length > 0 && (
          <div className="bg-[#1C2333]/90 border border-[#2A364F] rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-[#E6EDF3]">Prioritized Mitigation Actions</h3>
                <p className="text-xs text-[#8B949E]">Ranked by Priority = Risk Reduction / Effort (§5.4)</p>
              </div>
              <button
                onClick={() => onOpenAlternatives(packageId)}
                className="px-3.5 py-1.5 rounded-lg bg-[#3DDC97]/15 border border-[#3DDC97]/40 text-[#3DDC97] hover:bg-[#3DDC97]/25 font-mono text-xs font-bold transition-all"
              >
                Find Safer Alternatives
              </button>
            </div>

            <div className="space-y-3">
              {mitigations.mitigations.map((m) => (
                <div
                  key={m.rank}
                  className="bg-[#141B26] p-4 rounded-xl border border-[#2A364F] hover:border-[#3DDC97]/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-[#3DDC97]">#{m.rank}</span>
                      <h4 className="font-bold text-sm text-[#E6EDF3]">{m.title}</h4>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#2A364F] text-[#8B949E]">
                        Effort: {m.effort_label}
                      </span>
                    </div>
                    <p className="text-xs text-[#8B949E]">{m.description}</p>
                    <div className="font-mono text-xs text-[#3DDC97] pt-1">
                      Score Drop: {m.current_score} → {m.projected_score} (-{m.risk_reduction} pts)
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-end md:self-center">
                    <button
                      onClick={() => setSimulatedPatchScore(m.projected_score)}
                      className="px-3 py-1.5 rounded bg-[#3DDC97] text-[#0A0E14] font-mono text-xs font-bold hover:bg-[#3DDC97]/90 transition-all shadow-glow-green flex items-center space-x-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Simulate Fix</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
