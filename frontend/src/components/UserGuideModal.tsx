import React from 'react';
import { X, BookOpen, Layers, ShieldAlert, Compass, Search, AlertOctagon } from 'lucide-react';

interface UserGuideModalProps {
  onClose: () => void;
  onOpenIngest: () => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ onClose, onOpenIngest }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0E14]/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#141B26] border border-[#2A364F] rounded-3xl max-w-3xl w-full p-8 shadow-2xl space-y-6 my-auto max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-[#2A364F] pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#3DDC97]/15 border border-[#3DDC97]/40 flex items-center justify-center text-[#3DDC97]">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="font-mono text-xs text-[#3DDC97] uppercase">USER GUIDE & WALKTHROUGH</span>
              <h2 className="text-2xl font-bold font-mono text-[#E6EDF3]">How to Use Dependly</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1C2333] border border-[#2A364F] text-[#8B949E] hover:text-[#E6EDF3] hover:border-[#FF5D5D] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Key Steps */}
        <div className="space-y-4 font-sans text-xs text-[#8B949E]">
          <div className="bg-[#1C2333] border border-[#2A364F] rounded-2xl p-5 space-y-2">
            <div className="flex items-center space-x-2 text-[#3DDC97] font-bold text-sm">
              <Layers className="w-4 h-4" />
              <span>Step 1: Ingest an Application Manifest</span>
            </div>
            <p className="leading-relaxed">
              Click <strong>"Add App"</strong> in the top right header. You can upload a <code className="text-[#3DDC97]">package.json</code> or <code className="text-[#3DDC97]">requirements.txt</code> file, OR paste a public GitHub URL (e.g. <code className="text-[#3DDC97]">https://github.com/expressjs/express</code>).
            </p>
          </div>

          <div className="bg-[#1C2333] border border-[#2A364F] rounded-2xl p-5 space-y-2">
            <div className="flex items-center space-x-2 text-[#4D96FF] font-bold text-sm">
              <Compass className="w-4 h-4" />
              <span>Step 2: Explore Cytoscape Dependency Graph</span>
            </div>
            <p className="leading-relaxed">
              Go to <strong>"Dependency Explorer"</strong> to view your application's 2D multi-tier graph map. Inspect direct dependencies vs deep transitive sub-packages, toggle Orbits/Tree layouts, and view risk scores.
            </p>
          </div>

          <div className="bg-[#1C2333] border border-[#2A364F] rounded-2xl p-5 space-y-2">
            <div className="flex items-center space-x-2 text-[#FF5D5D] font-bold text-sm">
              <ShieldAlert className="w-4 h-4" />
              <span>Step 3: Run Zero-Day Hacking Simulations in War Room</span>
            </div>
            <p className="leading-relaxed">
              Navigate to <strong>"War Room"</strong> to simulate what happens if a package gets compromised. Switch between <strong>Runtime (Production)</strong> vs <strong>Install Time (Build)</strong> environments and click <strong>Simulate Fix</strong> for a 1-click patch.
            </p>
          </div>

          <div className="bg-[#1C2333] border border-[#2A364F] rounded-2xl p-5 space-y-2">
            <div className="flex items-center space-x-2 text-[#F5A623] font-bold text-sm">
              <AlertOctagon className="w-4 h-4" />
              <span>Step 4: Monitor Typosquats & Generate Threat Briefs</span>
            </div>
            <p className="leading-relaxed">
              Check <strong>"Typosquat Monitor"</strong> for fake package impersonation warnings. Click <strong>"Threat Brief"</strong> at any time to generate an executive-ready PDF report card summarizing your overall security posture.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#2A364F] flex justify-between items-center">
          <button
            onClick={() => {
              onClose();
              onOpenIngest();
            }}
            className="px-5 py-2.5 rounded-xl bg-[#3DDC97] text-[#0A0E14] font-bold text-xs hover:bg-[#3DDC97]/90 transition-all shadow-glow-green"
          >
            Start by Ingesting App
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[#1C2333] border border-[#2A364F] text-[#E6EDF3] text-xs font-semibold hover:border-[#3DDC97]"
          >
            Got it, Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
