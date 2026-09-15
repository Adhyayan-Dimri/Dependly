import React, { useEffect, useState } from 'react';
import { AlertOctagon, ShieldAlert, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { TyposquatFlag } from '../types';
import { api } from '../services/api';

export const TyposquatFeed: React.FC = () => {
  const [flags, setFlags] = useState<TyposquatFlag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchFlags = () => {
    setLoading(true);
    api.getTyposquatFlags()
      .then((res) => {
        setFlags(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#1C2333] pb-6 gap-4">
        <div>
          <div className="flex items-center space-x-2 font-mono text-xs text-[#F5A623] mb-1">
            <AlertOctagon className="w-4 h-4" />
            <span>SIGNAL INTELLIGENCE &bull; TYPOSQUAT SURVEILLANCE FEED</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#E6EDF3] tracking-tight">
            Typosquatting & Impersonation Alert Monitor
          </h2>
          <p className="text-xs text-[#8B949E] mt-1">
            Levenshtein edit-distance heuristics evaluated against the top-2000 package registries per ecosystem.
          </p>
        </div>

        <button
          onClick={fetchFlags}
          className="px-4 py-2 rounded-xl bg-[#1C2333] border border-[#2A364F] hover:border-[#3DDC97] text-[#E6EDF3] font-mono text-xs flex items-center space-x-2 transition-all self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Registry Feed</span>
        </button>
      </div>

      {flags.length === 0 ? (
        <div className="bg-[#1C2333]/60 border border-[#2A364F] rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#3DDC97]/15 border border-[#3DDC97]/40 text-[#3DDC97] flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#E6EDF3]">No Active Typosquat Threats Detected</h3>
          <p className="text-xs text-[#8B949E] max-w-md mx-auto">
            All dependencies in your current applications resolve cleanly against known canonical packages.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {flags.map((flag) => (
            <div
              key={flag.id}
              className="bg-[#1C2333] border border-[#FF5D5D]/50 rounded-2xl p-6 space-y-3 shadow-glow-red"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-[#FF5D5D] text-base">{flag.package_name}</span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#2A364F] text-[#8B949E]">
                    {flag.ecosystem}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-[#FF5D5D]/20 text-[#FF5D5D] border border-[#FF5D5D]/40">
                  EDIT DISTANCE: {flag.edit_distance}
                </span>
              </div>

              <div className="bg-[#141B26] p-3.5 rounded-xl border border-[#2A364F] text-xs font-mono">
                <span className="text-[#8B949E] block mb-1">Suspected Target Impersonation:</span>
                <span className="text-[#3DDC97] font-bold text-sm">{flag.suspected_target}</span>
              </div>

              <p className="text-xs text-[#8B949E]">
                Package name matches a high-download canonical package within Levenshtein threshold (1–2). Potential malicious dependency confusion or typosquatting vector.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
