import React, { useState } from 'react';
import { X, Upload, GitBranch, Layers, CheckCircle2, ShieldAlert } from 'lucide-react';
import { CriticalityTag } from '../types';
import { api } from '../services/api';

interface IngestionModalProps {
  onClose: () => void;
  onSuccess: (newAppId: string) => void;
}

export const IngestionModal: React.FC<IngestionModalProps> = ({ onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'demo' | 'upload' | 'github'>('upload');
  
  // Upload State
  const [file, setFile] = useState<File | null>(null);
  const [uploadCriticality, setUploadCriticality] = useState<CriticalityTag>('customer_facing');
  const [appNameOverride, setAppNameOverride] = useState<string>('');
  
  // GitHub State
  const [repoUrl, setRepoUrl] = useState<string>('https://github.com/expressjs/express');
  const [githubCriticality, setGithubCriticality] = useState<CriticalityTag>('customer_facing');
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Handle Manifest Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a package.json or requirements.txt file.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.uploadManifest(file, uploadCriticality, appNameOverride);
      setLoading(false);
      onSuccess(res.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Manifest upload failed.');
      setLoading(false);
    }
  };

  // Handle GitHub Ingestion
  const handleGithubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) {
      setError('Please provide a valid public GitHub repository URL.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.ingestGitHubRepo(repoUrl, githubCriticality);
      setLoading(false);
      onSuccess(res.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'GitHub repository ingestion failed.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0E14]/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#141B26] border border-[#2A364F] rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 my-auto animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-[#2A364F] pb-4">
          <div>
            <span className="font-mono text-xs text-[#3DDC97] uppercase">UNIFIED INGESTION PIPELINE</span>
            <h2 className="text-xl font-bold font-mono text-[#E6EDF3]">Add Application for Risk Analysis</h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1C2333] border border-[#2A364F] text-[#8B949E] hover:text-[#E6EDF3] hover:border-[#FF5D5D] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-[#1C2333] p-1.5 rounded-xl border border-[#2A364F]">
          <button
            onClick={() => { setActiveTab('upload'); setError(null); }}
            className={`py-2 rounded-lg font-mono text-xs flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'upload'
                ? 'bg-[#3DDC97] text-[#0A0E14] font-bold shadow-glow-green'
                : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Manifest</span>
          </button>

          <button
            onClick={() => { setActiveTab('github'); setError(null); }}
            className={`py-2 rounded-lg font-mono text-xs flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'github'
                ? 'bg-[#4D96FF] text-[#0A0E14] font-bold shadow-glow-blue'
                : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>GitHub URL</span>
          </button>

          <button
            onClick={() => { setActiveTab('demo'); setError(null); }}
            className={`py-2 rounded-lg font-mono text-xs flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'demo'
                ? 'bg-[#F5A623] text-[#0A0E14] font-bold shadow-glow-amber'
                : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Demo Apps</span>
          </button>
        </div>

        {error && (
          <div className="bg-[#FF5D5D]/15 border border-[#FF5D5D]/50 rounded-xl p-3.5 text-xs text-[#FF5D5D] flex items-center space-x-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab 1: Upload Manifest */}
        {activeTab === 'upload' && (
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div>
              <label className="block font-mono text-xs text-[#8B949E] mb-1.5">
                SELECT MANIFEST FILE (PACKAGE.JSON OR REQUIREMENTS.TXT)
              </label>
              <div className="border-2 border-dashed border-[#2A364F] hover:border-[#3DDC97] rounded-2xl p-6 text-center cursor-pointer bg-[#1C2333]/50 transition-all">
                <input
                  type="file"
                  accept=".json,.txt"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="manifest-file-input"
                />
                <label htmlFor="manifest-file-input" className="cursor-pointer space-y-2 block">
                  <Upload className="w-8 h-8 text-[#3DDC97] mx-auto opacity-80" />
                  <p className="text-sm font-bold text-[#E6EDF3]">
                    {file ? file.name : 'Click to select or drag & drop manifest'}
                  </p>
                  <p className="text-[11px] text-[#8B949E] font-mono">
                    Supported formats: npm (package.json) or PyPI (requirements.txt) • Max 1MB
                  </p>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 font-mono text-xs">
              <div>
                <label className="block text-[#8B949E] mb-1">APPLICATION NAME (OPTIONAL)</label>
                <input
                  type="text"
                  placeholder="Auto-detected if empty"
                  value={appNameOverride}
                  onChange={(e) => setAppNameOverride(e.target.value)}
                  className="w-full bg-[#1C2333] border border-[#2A364F] rounded-xl px-3 py-2 text-[#E6EDF3] placeholder-[#5B6878] focus:outline-none focus:border-[#3DDC97]"
                />
              </div>

              <div>
                <label className="block text-[#8B949E] mb-1">CRITICALITY TIER</label>
                <select
                  value={uploadCriticality}
                  onChange={(e) => setUploadCriticality(e.target.value as CriticalityTag)}
                  className="w-full bg-[#1C2333] border border-[#2A364F] rounded-xl px-3 py-2 text-[#E6EDF3] focus:outline-none focus:border-[#3DDC97]"
                >
                  <option value="customer_facing">Customer Facing (High Severity)</option>
                  <option value="internal">Internal Infrastructure</option>
                  <option value="experimental">Experimental / Staging</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !file}
              className="w-full py-3 rounded-xl bg-[#3DDC97] text-[#0A0E14] font-mono text-xs font-bold hover:bg-[#3DDC97]/90 disabled:opacity-50 transition-all shadow-glow-green flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-[#0A0E14] border-t-transparent animate-spin"></div>
                  <span>Resolving deps.dev Graph & CVEs...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ingest & Calculate Risk</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: GitHub Ingestion */}
        {activeTab === 'github' && (
          <form onSubmit={handleGithubSubmit} className="space-y-4">
            <div>
              <label className="block font-mono text-xs text-[#8B949E] mb-1.5">
                PUBLIC GITHUB REPOSITORY URL
              </label>
              <div className="relative">
                <GitBranch className="w-4 h-4 absolute left-3.5 top-3 text-[#8B949E]" />
                <input
                  type="url"
                  placeholder="https://github.com/owner/repository"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="w-full bg-[#1C2333] border border-[#2A364F] rounded-xl pl-10 pr-3 py-2.5 text-xs text-[#E6EDF3] font-mono focus:outline-none focus:border-[#4D96FF]"
                />
              </div>
              <p className="text-[11px] text-[#5B6878] font-mono mt-1">
                Dependly automatically discovers package.json or requirements.txt from the repository root.
              </p>
            </div>

            <div className="font-mono text-xs">
              <label className="block text-[#8B949E] mb-1">CRITICALITY TIER</label>
              <select
                value={githubCriticality}
                onChange={(e) => setGithubCriticality(e.target.value as CriticalityTag)}
                className="w-full bg-[#1C2333] border border-[#2A364F] rounded-xl px-3 py-2 text-[#E6EDF3] focus:outline-none focus:border-[#4D96FF]"
              >
                <option value="customer_facing">Customer Facing (High Severity)</option>
                <option value="internal">Internal Infrastructure</option>
                <option value="experimental">Experimental / Staging</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !repoUrl.trim()}
              className="w-full py-3 rounded-xl bg-[#4D96FF] text-[#0A0E14] font-mono text-xs font-bold hover:bg-[#4D96FF]/90 disabled:opacity-50 transition-all shadow-glow-blue flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-[#0A0E14] border-t-transparent animate-spin"></div>
                  <span>Fetching Repository & Resolving Graph...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ingest from GitHub</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 3: Demo Apps Selector */}
        {activeTab === 'demo' && (
          <div className="space-y-3 font-mono text-xs">
            <p className="text-[#8B949E] text-xs">
              Pre-resolved, offline-safe demo applications with real, citable CVEs (§3.1):
            </p>

            <div className="space-y-2">
              <div className="bg-[#1C2333] p-4 rounded-xl border border-[#2A364F] flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-[#E6EDF3]">ShopSphere E-Commerce Backend</h4>
                  <p className="text-[#8B949E] text-[11px]">Includes lodash@4.17.15 (CVE-2019-10744 Prototype Pollution)</p>
                </div>
                <span className="text-[10px] text-[#3DDC97] bg-[#3DDC97]/10 px-2 py-1 rounded">Pre-Loaded</span>
              </div>

              <div className="bg-[#1C2333] p-4 rounded-xl border border-[#2A364F] flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-[#E6EDF3]">CloudAuth Identity Gateway</h4>
                  <p className="text-[#8B949E] text-[11px]">Includes jsonwebtoken@8.5.1 (CVE-2022-23529 RCE Key Bypass)</p>
                </div>
                <span className="text-[10px] text-[#3DDC97] bg-[#3DDC97]/10 px-2 py-1 rounded">Pre-Loaded</span>
              </div>

              <div className="bg-[#1C2333] p-4 rounded-xl border border-[#2A364F] flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-[#E6EDF3]">Telemetry Data Pipeline</h4>
                  <p className="text-[#8B949E] text-[11px]">Includes urllib3@1.26.4 (CVE-2021-33503 ReDoS)</p>
                </div>
                <span className="text-[10px] text-[#3DDC97] bg-[#3DDC97]/10 px-2 py-1 rounded">Pre-Loaded</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-[#1C2333] hover:bg-[#2A364F] text-[#E6EDF3] font-bold transition-all border border-[#2A364F] mt-2"
            >
              Close & View Seeded Apps
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
