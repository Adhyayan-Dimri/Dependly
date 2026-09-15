import React, { useEffect, useState } from 'react';
import { X, Settings, CheckCircle2, Shield, Key, Cpu, RefreshCw, Server } from 'lucide-react';
import { SystemHealth } from '../types';
import { api } from '../services/api';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [openRouterKey, setOpenRouterKey] = useState<string>('');
  const [githubToken, setGithubToken] = useState<string>('');
  const [openRouterModel, setOpenRouterModel] = useState<string>('openai/gpt-4o-mini');
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchHealth = () => {
    setLoading(true);
    api.getSystemHealth()
      .then((res) => {
        setHealth(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, any> = {};
    if (openRouterKey.trim()) payload.openrouter_api_key = openRouterKey.trim();
    if (githubToken.trim()) payload.github_token = githubToken.trim();
    if (openRouterModel) payload.openrouter_model = openRouterModel;

    try {
      await api.updateSettings(payload);
      setSavedMsg('Settings and API credentials updated successfully.');
      fetchHealth();
      setTimeout(() => setSavedMsg(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0E14]/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#141B26] border border-[#2A364F] rounded-3xl max-w-xl w-full p-8 shadow-2xl space-y-6 my-auto animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-[#2A364F] pb-4">
          <div>
            <span className="font-mono text-xs text-[#3DDC97] uppercase">SYSTEM & CREDENTIALS</span>
            <h2 className="text-xl font-bold font-mono text-[#E6EDF3]">Control Room Configuration</h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1C2333] border border-[#2A364F] text-[#8B949E] hover:text-[#E6EDF3] hover:border-[#FF5D5D] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Operational Health Status */}
        {health && (
          <div className="bg-[#1C2333] border border-[#2A364F] rounded-2xl p-5 space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[#8B949E] uppercase">System Telemetry</span>
              <span className="flex items-center space-x-1 text-[#3DDC97] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#3DDC97] animate-ping"></span>
                <span>STATUS: OPERATIONAL</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="bg-[#141B26] p-2.5 rounded-lg border border-[#2A364F]">
                <span className="text-[#8B949E] block">DATABASE</span>
                <span className="text-[#3DDC97] font-bold">MongoDB Active (27017)</span>
              </div>
              <div className="bg-[#141B26] p-2.5 rounded-lg border border-[#2A364F]">
                <span className="text-[#8B949E] block">GRAPH ENGINE</span>
                <span className="text-[#4D96FF] font-bold">
                  {health.active_graph_nodes} nodes • {health.active_graph_edges} edges
                </span>
              </div>
              <div className="bg-[#141B26] p-2.5 rounded-lg border border-[#2A364F]">
                <span className="text-[#8B949E] block">OPENROUTER KEY</span>
                <span className={health.has_openrouter_key ? 'text-[#3DDC97] font-bold' : 'text-[#8B949E]'}>
                  {health.has_openrouter_key ? 'Configured & Active' : 'Not Provided (Offline Engine)'}
                </span>
              </div>
              <div className="bg-[#141B26] p-2.5 rounded-lg border border-[#2A364F]">
                <span className="text-[#8B949E] block">GITHUB TOKEN</span>
                <span className={health.has_github_token ? 'text-[#3DDC97] font-bold' : 'text-[#8B949E]'}>
                  {health.has_github_token ? 'Configured (Unlimited)' : 'Public (60 req/hr)'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-[#8B949E] mb-1">OPENROUTER API KEY</label>
            <div className="relative">
              <Key className="w-4 h-4 absolute left-3 top-2.5 text-[#8B949E]" />
              <input
                type="password"
                placeholder="sk-or-v1-..."
                value={openRouterKey}
                onChange={(e) => setOpenRouterKey(e.target.value)}
                className="w-full bg-[#1C2333] border border-[#2A364F] rounded-xl pl-9 pr-3 py-2 text-[#E6EDF3] placeholder-[#5B6878] focus:outline-none focus:border-[#3DDC97]"
              />
            </div>
            <p className="text-[10px] text-[#5B6878] mt-1">
              Provides live Claude / GPT-4o explainable narrations. Uses offline deterministic engine if omitted.
            </p>
          </div>

          <div>
            <label className="block text-[#8B949E] mb-1">OPENROUTER MODEL</label>
            <select
              value={openRouterModel}
              onChange={(e) => setOpenRouterModel(e.target.value)}
              className="w-full bg-[#1C2333] border border-[#2A364F] rounded-xl px-3 py-2 text-[#E6EDF3] focus:outline-none focus:border-[#3DDC97]"
            >
              <option value="openai/gpt-4o-mini">OpenAI GPT-4o Mini (Fast & Accurate)</option>
              <option value="meta-llama/llama-3.3-70b-instruct">Meta Llama 3.3 70B Instruct</option>
              <option value="anthropic/claude-3.5-sonnet:beta">Anthropic Claude 3.5 Sonnet</option>
              <option value="google/gemini-2.0-flash-001">Google Gemini 2.0 Flash</option>
            </select>
          </div>

          <div>
            <label className="block text-[#8B949E] mb-1">GITHUB PERSONAL ACCESS TOKEN (OPTIONAL)</label>
            <input
              type="password"
              placeholder="ghp_..."
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              className="w-full bg-[#1C2333] border border-[#2A364F] rounded-xl px-3 py-2 text-[#E6EDF3] placeholder-[#5B6878] focus:outline-none focus:border-[#3DDC97]"
            />
            <p className="text-[10px] text-[#5B6878] mt-1">
              Used strictly server-side to fetch manifests from public GitHub repositories without rate limits.
            </p>
          </div>

          {savedMsg && (
            <div className="p-3 rounded-xl bg-[#3DDC97]/15 border border-[#3DDC97]/40 text-[#3DDC97] text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{savedMsg}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#1C2333] border border-[#2A364F] text-[#8B949E] hover:text-[#E6EDF3]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#3DDC97] text-[#0A0E14] font-bold hover:bg-[#3DDC97]/90 shadow-glow-green"
            >
              Save Credentials
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
