import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Layers, 
  ShieldAlert, 
  Compass, 
  AlertOctagon, 
  PlusCircle, 
  Settings as SettingsIcon, 
  FileText,
  Search,
  Zap,
  ArrowRight,
  Sparkles,
  Home,
  BookOpen,
  ArrowUp,
  Sun,
  Moon
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { HeroGraphScroll } from './components/HeroGraphScroll';
import { DependencyExplorer } from './components/DependencyExplorer';
import { WarRoom } from './components/WarRoom';
import { TyposquatFeed } from './components/TyposquatFeed';
import { RiskReportModal } from './components/RiskReportModal';
import { SaferAlternatives } from './components/SaferAlternatives';
import { IngestionModal } from './components/IngestionModal';
import { SettingsModal } from './components/SettingsModal';
import { ThreatBriefModal } from './components/ThreatBriefModal';
import { ChatbotWidget } from './components/ChatbotWidget';
import { UserGuideModal } from './components/UserGuideModal';
import { AegisRippleStory } from './components/AegisRippleStory';
import { ApplicationSummary } from './types';
import { api } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<'story' | 'overview' | 'dashboard' | 'explorer' | 'warroom' | 'typosquat'>('overview');
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>('');

  // Light / Dark Theme Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('dependly_theme') !== 'light';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.remove('light-theme');
      localStorage.setItem('dependly_theme', 'dark');
    } else {
      document.body.classList.add('light-theme');
      localStorage.setItem('dependly_theme', 'light');
    }
  }, [isDarkMode]);
  
  // Modals
  const [inspectPkgId, setInspectPkgId] = useState<string | null>(null);
  const [alternativesPkgId, setAlternativesPkgId] = useState<string | null>(null);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isThreatBriefModalOpen, setIsThreatBriefModalOpen] = useState<boolean>(false);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState<boolean>(false);
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);

  // Target for War Room
  const [warRoomPkgId, setWarRoomPkgId] = useState<string | undefined>(undefined);

  const fetchApplications = () => {
    api.getApplications()
      .then((apps) => {
        setApplications(apps);
        if (apps.length > 0 && !selectedAppId) {
          setSelectedAppId(apps[0].id);
        }
      })
      .catch((err) => console.error('Failed to load applications:', err));
  };

  const handleDeleteApp = async (appId: string) => {
    try {
      await api.deleteApplication(appId);
      fetchApplications();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 250) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleOpenExplorer = (appId: string) => {
    setSelectedAppId(appId);
    setActiveTab('explorer');
  };

  const handleOpenWarRoom = (packageId?: string) => {
    if (packageId) setWarRoomPkgId(packageId);
    setActiveTab('warroom');
  };

  const handleOpenRiskReport = (packageId: string) => {
    setInspectPkgId(packageId);
  };

  const handleOpenAlternatives = (packageId: string) => {
    setInspectPkgId(null);
    setAlternativesPkgId(packageId);
  };

  return (
    <div className="min-h-screen bg-[#0A0E14] text-[#E6EDF3] font-sans flex flex-col selection:bg-[#3DDC97]/20 selection:text-[#3DDC97]">
      
      {/* Top Application Bar */}
      <header className="sticky top-0 z-40 bg-[#0A0E14]/90 backdrop-blur-xl border-b border-[#1C2333] px-6 py-3 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
          <div className="w-8 h-8 rounded-lg bg-[#1C2333] border border-[#2A364F] flex items-center justify-center text-[#3DDC97] shadow-glow-green">
            <Activity className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-[#E6EDF3] flex items-center space-x-1.5">
              <span>DEPENDLY</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#3DDC97] animate-pulse"></span>
            </span>
            <span className="text-[10px] text-[#8B949E]">Supply Chain Risk Intelligence</span>
          </div>
        </div>

        {/* Navigation Tabs (Overview First, Story Tour Second) */}
        <nav className="hidden md:flex items-center space-x-1 bg-[#141B26] p-1 rounded-xl border border-[#1C2333]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center space-x-1.5 ${
              activeTab === 'overview'
                ? 'bg-[#3DDC97] text-[#0A0E14] font-bold shadow-glow-green'
                : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('story')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center space-x-1.5 ${
              activeTab === 'story'
                ? 'bg-[#1C2333] text-[#E6EDF3] font-bold border border-[#2A364F] shadow-sm'
                : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Domino Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center space-x-1.5 ${
              activeTab === 'dashboard'
                ? 'bg-[#1C2333] text-[#3DDC97] font-bold border border-[#2A364F] shadow-sm'
                : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('explorer')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center space-x-1.5 ${
              activeTab === 'explorer'
                ? 'bg-[#1C2333] text-[#4D96FF] font-bold border border-[#2A364F] shadow-sm'
                : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Dependency Explorer</span>
          </button>

          <button
            onClick={() => setActiveTab('warroom')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center space-x-1.5 ${
              activeTab === 'warroom'
                ? 'bg-[#FF5D5D]/15 text-[#FF5D5D] font-bold border border-[#FF5D5D]/40 shadow-sm'
                : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>War Room</span>
          </button>

          <button
            onClick={() => setActiveTab('typosquat')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center space-x-1.5 ${
              activeTab === 'typosquat'
                ? 'bg-[#F5A623]/15 text-[#F5A623] font-bold border border-[#F5A623]/40 shadow-sm'
                : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Typosquat Monitor</span>
          </button>
        </nav>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-3 text-xs">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="p-2 rounded-lg bg-[#1C2333] hover:bg-[#2A364F] border border-[#2A364F] text-[#8B949E] hover:text-[#E6EDF3] transition-all flex items-center justify-center"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#3DDC97]" />}
          </button>

          <button
            onClick={() => setIsUserGuideOpen(true)}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1C2333] hover:bg-[#2A364F] text-[#E6EDF3] border border-[#2A364F] transition-all"
            title="How to Use Dependly Guide"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#4D96FF]" />
            <span>How to Use</span>
          </button>

          <button
            onClick={() => setIsThreatBriefModalOpen(true)}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1C2333] hover:bg-[#2A364F] text-[#E6EDF3] border border-[#2A364F] transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-[#3DDC97]" />
            <span>Threat Brief</span>
          </button>

          <button
            onClick={() => setIsIngestModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-[#3DDC97] text-[#0A0E14] font-bold hover:bg-[#3DDC97]/90 transition-all shadow-glow-green flex items-center space-x-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add App</span>
          </button>

          <button
            onClick={() => setIsSettingsModalOpen(true)}
            title="System Settings & API Keys"
            className="p-2 rounded-lg bg-[#1C2333] hover:bg-[#2A364F] border border-[#2A364F] text-[#8B949E] hover:text-[#E6EDF3] transition-all"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'story' && (
          <AegisRippleStory 
            applications={applications}
            selectedAppId={selectedAppId}
            onSelectApp={(appId) => setSelectedAppId(appId)}
            onOpenAdvanced={() => setActiveTab('dashboard')} 
            onOpenWarRoom={handleOpenWarRoom} 
          />
        )}

        {activeTab === 'overview' && (
          <div className="flex-1 flex flex-col space-y-8">
            <HeroGraphScroll
              applications={applications}
              onExploreClick={() => setActiveTab('explorer')}
              onWarRoomClick={() => handleOpenWarRoom()}
              onIngestClick={() => setIsIngestModalOpen(true)}
            />

            {/* First Time User Onboarding Section */}
            <section className="w-full max-w-6xl mx-auto px-6 py-12 space-y-10">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center space-x-2 font-mono text-xs text-[#3DDC97]">
                  <Sparkles className="w-4 h-4" />
                  <span>GET STARTED IN 3 STEPS</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#E6EDF3]">
                  How to Analyze &amp; Protect Your Dependencies
                </h2>
                <p className="text-sm text-[#8B949E] max-w-xl mx-auto">
                  Dependly replaces black-box scoring with deterministic graph telemetry and plain-language explainability.
                </p>
              </div>

              {/* 3 Step Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#1C2333] border border-[#2A364F] hover:border-[#4D96FF]/60 rounded-2xl p-6 flex flex-col justify-between transition-all space-y-4">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-[#4D96FF]/10 border border-[#4D96FF]/30 flex items-center justify-center text-[#4D96FF] font-mono font-bold text-sm">
                      01
                    </div>
                    <h3 className="text-lg font-bold text-[#E6EDF3]">Search Any Package</h3>
                    <p className="text-xs text-[#8B949E] leading-relaxed">
                      Type any npm or PyPI package (e.g. <code className="text-[#4D96FF]">lodash</code>, <code className="text-[#4D96FF]">requests</code>) to instantly inspect its CVE count, CISA KEV status, and structural risk score.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="w-full py-2.5 rounded-lg bg-[#141B26] hover:bg-[#4D96FF]/20 text-[#4D96FF] font-mono text-xs font-bold transition-all border border-[#2A364F] hover:border-[#4D96FF] flex items-center justify-center space-x-2"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search Package Index</span>
                  </button>
                </div>

                <div className="bg-[#1C2333] border border-[#2A364F] hover:border-[#3DDC97]/60 rounded-2xl p-6 flex flex-col justify-between transition-all space-y-4">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-[#3DDC97]/10 border border-[#3DDC97]/30 flex items-center justify-center text-[#3DDC97] font-mono font-bold text-sm">
                      02
                    </div>
                    <h3 className="text-lg font-bold text-[#E6EDF3]">Ingest Application Manifest</h3>
                    <p className="text-xs text-[#8B949E] leading-relaxed">
                      Upload your <code className="text-[#3DDC97]">package.json</code> or <code className="text-[#3DDC97]">requirements.txt</code> or paste a public GitHub URL to model your exact application topology.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsIngestModalOpen(true)}
                    className="w-full py-2.5 rounded-lg bg-[#3DDC97] text-[#0A0E14] font-mono text-xs font-bold hover:bg-[#3DDC97]/90 transition-all shadow-glow-green flex items-center justify-center space-x-2"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Ingest App Manifest</span>
                  </button>
                </div>

                <div className="bg-[#1C2333] border border-[#2A364F] hover:border-[#FF5D5D]/60 rounded-2xl p-6 flex flex-col justify-between transition-all space-y-4">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FF5D5D]/10 border border-[#FF5D5D]/30 flex items-center justify-center text-[#FF5D5D] font-mono font-bold text-sm">
                      03
                    </div>
                    <h3 className="text-lg font-bold text-[#E6EDF3]">War Room</h3>
                    <p className="text-xs text-[#8B949E] leading-relaxed">
                      Simulate zero-day compromise propagation. Distinguish between runtime production threats vs. build-time dev dependency isolation.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('warroom')}
                    className="w-full py-2.5 rounded-lg bg-[#FF5D5D]/15 border border-[#FF5D5D]/40 text-[#FF5D5D] hover:bg-[#FF5D5D]/25 font-mono text-xs font-bold transition-all flex items-center justify-center space-x-2"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Launch War Room</span>
                  </button>
                </div>
              </div>

              {/* Seeded Sample Applications Section */}
              <div className="pt-6 border-t border-[#1C2333] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xl font-bold text-[#E6EDF3]">Explore Seeded Demo Applications</h3>
                    <p className="text-xs text-[#8B949E]">Select any pre-analyzed application below to explore its live dependency graph immediately.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="font-mono text-xs text-[#3DDC97] hover:underline flex items-center space-x-1"
                  >
                    <span>View all applications</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="bg-[#1C2333] border border-[#2A364F] hover:border-[#3DDC97]/60 rounded-xl p-5 flex flex-col justify-between transition-all group"
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
                          Ref: {app.source_ref || 'Seeded Manifest'}
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
                      </div>

                      <div className="mt-5 pt-3 border-t border-[#2A364F]/50 flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenExplorer(app.id)}
                          className="flex-1 py-2 rounded bg-[#141B26] hover:bg-[#3DDC97] text-[#8B949E] hover:text-[#0A0E14] font-mono text-xs font-bold transition-all border border-[#2A364F] hover:border-[#3DDC97] flex items-center justify-center space-x-1.5"
                        >
                          <Compass className="w-3.5 h-3.5" />
                          <span>Explore Graph</span>
                        </button>
                        <button
                          onClick={() => handleOpenWarRoom()}
                          className="py-2 px-3 rounded bg-[#FF5D5D]/15 hover:bg-[#FF5D5D]/30 text-[#FF5D5D] font-mono text-xs font-semibold transition-all border border-[#FF5D5D]/40"
                          title="Simulate Compromise"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            applications={applications}
            onSelectApp={handleOpenExplorer}
            onOpenIngestModal={() => setIsIngestModalOpen(true)}
            onOpenWarRoom={handleOpenWarRoom}
            onOpenRiskReport={handleOpenRiskReport}
            onOpenExplorer={handleOpenExplorer}
            onDeleteApp={handleDeleteApp}
          />
        )}

        {activeTab === 'explorer' && (
          <DependencyExplorer
            applications={applications}
            selectedAppId={selectedAppId}
            onSelectApp={setSelectedAppId}
            onOpenWarRoom={handleOpenWarRoom}
            onOpenRiskReport={handleOpenRiskReport}
          />
        )}

        {activeTab === 'warroom' && (
          <WarRoom
            initialPackageId={warRoomPkgId}
            applications={applications}
            onOpenRiskReport={handleOpenRiskReport}
          />
        )}

        {activeTab === 'typosquat' && (
          <TyposquatFeed />
        )}
      </main>

      {/* FLOATING BACK TO TOP BUTTON */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-6 z-40 p-3 rounded-full bg-[#1C2333] border border-[#2A364F] hover:border-[#3DDC97] text-[#E6EDF3] shadow-2xl transition-all hover:scale-110 flex items-center justify-center text-xs font-bold"
          title="Back to Top"
        >
          <ArrowUp className="w-4 h-4 text-[#3DDC97]" />
        </button>
      )}

      {/* AI CHATBOT WIDGET */}
      <ChatbotWidget
        applications={applications}
        onOpenIngest={() => setIsIngestModalOpen(true)}
        onOpenWarRoom={() => setActiveTab('warroom')}
        onOpenExplorer={() => setActiveTab('explorer')}
      />

      {/* MODALS */}
      {isUserGuideOpen && (
        <UserGuideModal
          onClose={() => setIsUserGuideOpen(false)}
          onOpenIngest={() => setIsIngestModalOpen(true)}
        />
      )}

      {inspectPkgId && (
        <RiskReportModal
          packageId={inspectPkgId}
          onClose={() => setInspectPkgId(null)}
          onOpenAlternatives={handleOpenAlternatives}
          onOpenWarRoom={(pid) => {
            setInspectPkgId(null);
            handleOpenWarRoom(pid);
          }}
        />
      )}

      {alternativesPkgId && (
        <SaferAlternatives
          packageId={alternativesPkgId}
          onClose={() => setAlternativesPkgId(null)}
        />
      )}

      {isIngestModalOpen && (
        <IngestionModal
          onClose={() => setIsIngestModalOpen(false)}
          onSuccess={(newId) => {
            fetchApplications();
            setSelectedAppId(newId);
            setActiveTab('explorer');
          }}
        />
      )}

      {isSettingsModalOpen && (
        <SettingsModal
          onClose={() => setIsSettingsModalOpen(false)}
        />
      )}

      {isThreatBriefModalOpen && (
        <ThreatBriefModal
          applications={applications}
          onClose={() => setIsThreatBriefModalOpen(false)}
        />
      )}
    </div>
  );
}
export default App;

