import React, { useEffect, useState } from 'react';
import { X, Sparkles, Award, ArrowRight, CheckCircle2, ShieldCheck, Download } from 'lucide-react';
import { AlternativesResponse, PackageAlternative } from '../types';
import { api } from '../services/api';

interface SaferAlternativesProps {
  packageId: string;
  onClose: () => void;
  onSelectAlternative?: (altName: string) => void;
}

export const SaferAlternatives: React.FC<SaferAlternativesProps> = ({
  packageId,
  onClose,
  onSelectAlternative
}) => {
  const [data, setData] = useState<AlternativesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api.getAlternatives(packageId)
      .then((res) => {
        if (isMounted) {
          setData(res);
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
          <p className="font-mono text-xs text-[#3DDC97]">EVALUATING ECOSYSTEM REPLACEMENTS...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0E14]/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#141B26] border border-[#2A364F] rounded-3xl max-w-3xl w-full p-8 shadow-2xl space-y-6 my-auto animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-[#2A364F] pb-4">
          <div>
            <div className="flex items-center space-x-2 font-mono text-xs text-[#3DDC97] mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>SAFER ALTERNATIVE CANDIDATE ENGINE</span>
            </div>
            <h2 className="text-xl font-bold font-mono text-[#E6EDF3]">
              Replacement Options for {data.package_name}
            </h2>
            <p className="text-xs text-[#8B949E]">
              Current Risk Score: <strong className="text-[#FF5D5D]">{data.current_score.toFixed(1)} / 100</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1C2333] border border-[#2A364F] text-[#8B949E] hover:text-[#E6EDF3] hover:border-[#FF5D5D] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alternatives List */}
        <div className="space-y-4">
          {data.alternatives.map((alt, idx) => (
            <div
              key={idx}
              className="bg-[#1C2333] border border-[#2A364F] hover:border-[#3DDC97] rounded-2xl p-6 transition-all space-y-4 shadow-lg group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-3">
                    <h3 className="font-mono font-bold text-lg text-[#E6EDF3] group-hover:text-[#3DDC97] transition-colors">
                      {alt.name}
                    </h3>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#141B26] text-[#8B949E] border border-[#2A364F]">
                      v{alt.recommended_version}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#3DDC97]/15 text-[#3DDC97] font-bold">
                      {alt.maintenance_status}
                    </span>
                  </div>
                  <p className="text-xs text-[#8B949E] font-mono mt-1">
                    Downloads: {alt.downloads_summary || 'Active'}
                  </p>
                </div>

                <div className="text-right">
                  <div className="font-mono text-sm font-bold text-[#3DDC97]">
                    Risk: {alt.score.toFixed(1)} / 100
                  </div>
                  <div className="text-[11px] font-mono text-[#8B949E]">
                    Scorecard: {alt.scorecard_score ? `${alt.scorecard_score}/10` : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Tradeoff Summary */}
              <div className="bg-[#141B26] p-4 rounded-xl border border-[#2A364F] text-xs text-[#E6EDF3] leading-relaxed">
                <span className="font-bold text-[#3DDC97] font-mono block mb-1">Architectural Tradeoff:</span>
                {alt.tradeoff_summary}
              </div>

              {/* Action */}
              <div className="flex justify-between items-center pt-2 font-mono text-xs">
                <span className="text-[#8B949E]">
                  Migration Effort: Level {alt.effort_estimate} (Standard API Bump)
                </span>

                <button
                  onClick={() => {
                    if (onSelectAlternative) onSelectAlternative(alt.name);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-[#3DDC97] text-[#0A0E14] font-bold hover:bg-[#3DDC97]/90 transition-all shadow-glow-green flex items-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Adopt {alt.name}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
