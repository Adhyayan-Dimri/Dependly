import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  ShieldCheck, 
  Info, 
  X, 
  ArrowRight, 
  Layers, 
  Activity,
  Sparkles,
  ChevronRight,
  HelpCircle,
  TrendingDown,
  Sliders,
  ChevronDown,
  Building,
  Server,
  BookOpen
} from 'lucide-react';
import { ApplicationSummary } from '../types';

interface AegisRippleStoryProps {
  applications: ApplicationSummary[];
  selectedAppId: string;
  onSelectApp: (appId: string) => void;
  onOpenAdvanced: () => void;
  onOpenWarRoom?: (pkgId?: string) => void;
}

interface AppTopologyProfile {
  patientZeroName: string;
  patientZeroVersion: string;
  patientZeroCve: string;
  junction1: string;
  junction2: string;
  downstream1: string;
  downstream2: string;
  pipServiceName: string;
  storyDescription: string;
}

export function AegisRippleStory({ 
  applications, 
  selectedAppId, 
  onSelectApp, 
  onOpenAdvanced, 
  onOpenWarRoom 
}: AegisRippleStoryProps) {
  // Banner state
  const [showJengaBanner, setShowJengaBanner] = useState<boolean>(() => {
    return localStorage.getItem('aegis_jenga_banner_dismissed') !== 'true';
  });

  // Tour state
  const [tourStep, setTourStep] = useState<number>(0); // 0 = off, 1 = Patient Zero, 2 = Propagation, 3 = Fallout, 4 = Shield

  // Simulation state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [rippleProgress, setRippleProgress] = useState<number>(0); // 0 to 100
  const [isFixed, setIsFixed] = useState<boolean>(false);

  // PiP Fallout state
  const [tps, setTps] = useState<number>(120);
  const [appStatus, setAppStatus] = useState<'Healthy' | 'Slowing' | 'Frozen' | 'Protected'>('Healthy');

  // Currently active app summary
  const currentApp = applications.find(a => a.id === selectedAppId) || applications[0] || {
    id: 'demo-app-1',
    name: 'ShopsHere E-Commerce',
    criticality_tag: 'customer_facing',
    source: 'seeded',
    direct_deps_count: 14,
    total_deps_count: 324,
    max_risk_score: 88
  };

  const appRiskScore = Math.round(currentApp.max_risk_score || 85);
  const directDeps = currentApp.direct_deps_count || 12;
  const transitiveDeps = Math.max(0, (currentApp.total_deps_count || 320) - directDeps);
  const cveCountEstimate = Math.max(3, Math.floor(appRiskScore / 6));
  const kevCountEstimate = appRiskScore > 75 ? 2 : 1;

  // Derive dynamic topology profile based on selected Dependly application
  const getAppProfile = (appName: string): AppTopologyProfile => {
    const lower = appName.toLowerCase();
    if (lower.includes('finflow') || lower.includes('fintech') || lower.includes('bank')) {
      return {
        patientZeroName: 'semver',
        patientZeroVersion: 'v7.5.1',
        patientZeroCve: 'CVE-2022-23529 (CISA KEV)',
        junction1: 'jsonwebtoken',
        junction2: 'axios-proxy',
        downstream1: `${appName} (Auth Vault)`,
        downstream2: `${appName} (Payment Gateway)`,
        pipServiceName: `${appName} Payment Processing`,
        storyDescription: `In ${appName}, a deeply hidden Regular Expression vulnerability in semver propagates up through jsonwebtoken, threatening high-volume financial transaction gateways.`
      };
    } else if (lower.includes('devops') || lower.includes('pipeline') || lower.includes('deploy')) {
      return {
        patientZeroName: 'qs',
        patientZeroVersion: 'v6.10.2',
        patientZeroCve: 'CVE-2017-1000048 (CISA KEV)',
        junction1: 'commander-cli',
        junction2: 'glob-stream',
        downstream1: `${appName} (Artifact Builder)`,
        downstream2: `${appName} (K8s Deployer)`,
        pipServiceName: `${appName} Deployment Worker`,
        storyDescription: `In ${appName}, a prototype pollution flaw in the parsing library qs ripples into CI/CD build scripts, compromising production Kubernetes cluster deployment triggers.`
      };
    } else if (lower.includes('health') || lower.includes('patient') || lower.includes('med')) {
      return {
        patientZeroName: 'urllib3',
        patientZeroVersion: 'v1.26.4',
        patientZeroCve: 'CVE-2021-33503 (CISA KEV)',
        junction1: 'requests-http',
        junction2: 'flask-cors',
        downstream1: `${appName} (EHR Database)`,
        downstream2: `${appName} (Patient Portal)`,
        pipServiceName: `${appName} Patient Records API`,
        storyDescription: `In ${appName}, a Denial of Service flaw in urllib3 propagates through backend microservices, causing response timeouts on HIPAA-compliant patient record queries.`
      };
    }
    // Default / ShopsHere E-Commerce / Custom App
    return {
      patientZeroName: 'lodash',
      patientZeroVersion: 'v4.17.15',
      patientZeroCve: 'CVE-2019-10744 (CISA KEV)',
      junction1: 'express-session',
      junction2: 'stripe-node',
      downstream1: `${appName} (Order Gateway)`,
      downstream2: `${appName} (Checkout Service)`,
      pipServiceName: `${appName} Checkout Engine`,
      storyDescription: `In ${appName}, a prototype pollution flaw in lodash travels 3 hops through session middleware, threatening real-time checkout and payment processing.`
    };
  };

  const profile = getAppProfile(currentApp.name);

  // Dismiss Jenga banner
  const dismissBanner = () => {
    setShowJengaBanner(false);
    localStorage.setItem('aegis_jenga_banner_dismissed', 'true');
  };

  // Keyboard controls (Space to play/pause, Esc to skip tour)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'Escape' && tourStep > 0) {
        setTourStep(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tourStep]);

  // Simulation Loop
  useEffect(() => {
    let interval: any = null;
    if (isPlaying && !isFixed) {
      interval = setInterval(() => {
        setRippleProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prev + 5;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isFixed]);

  // Sync PiP Fallout metrics with ripple progress
  useEffect(() => {
    if (isFixed) {
      setAppStatus('Protected');
      setTps(128);
    } else if (rippleProgress === 0) {
      setAppStatus('Healthy');
      setTps(120);
    } else if (rippleProgress < 50) {
      setAppStatus('Slowing');
      setTps(Math.max(45, Math.floor(120 - (rippleProgress * 1.5))));
    } else {
      setAppStatus('Frozen');
      setTps(0);
    }
  }, [rippleProgress, isFixed]);

  // Reset simulation when selected application changes
  useEffect(() => {
    resetSim();
  }, [selectedAppId]);

  // Guided Tour Step Handlers
  const startTour = () => {
    setShowJengaBanner(false);
    setIsFixed(false);
    setRippleProgress(0);
    setIsPlaying(false);
    setTourStep(1);
  };

  const nextTourStep = () => {
    if (tourStep === 1) {
      setTourStep(2);
      setIsPlaying(true);
    } else if (tourStep === 2) {
      setTourStep(3);
    } else if (tourStep === 3) {
      setTourStep(4);
    } else if (tourStep === 4) {
      setTourStep(0);
      applySmartFix();
    }
  };

  const prevTourStep = () => {
    if (tourStep > 1) {
      setTourStep((prev) => prev - 1);
    }
  };

  const applySmartFix = () => {
    setIsFixed(true);
    setIsPlaying(false);
    setRippleProgress(0);
  };

  const resetSim = () => {
    setIsFixed(false);
    setIsPlaying(false);
    setRippleProgress(0);
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] bg-[#070B12] text-slate-100 p-4 md:p-8 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Subtle Radial Glow */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        
        {/* A. "How it works in 30 seconds" Collapsible Banner */}
        {showJengaBanner && (
          <div className="glass-panel-accent p-5 md:p-6 rounded-2xl relative overflow-hidden transition-all duration-300">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full filter blur-3xl pointer-events-none" />
            <button 
              onClick={dismissBanner}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors"
              title="Dismiss banner"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pr-8">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 shrink-0">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold font-heading text-white flex items-center gap-2">
                    How Dependly Protects Your Projects in 30 Seconds
                  </h2>
                  <p className="text-slate-300 text-sm md:text-base mt-1 max-w-3xl leading-relaxed">
                    Modern apps are built like a tower of <span className="text-amber-400 font-semibold">Jenga blocks</span>. If a small block at the bottom (<code className="text-[#3DDC97] font-mono text-xs px-1.5 py-0.5 bg-slate-900/80 rounded">{profile.patientZeroName}</code>) is pulled or poisoned, the whole app tower crashes. Dependly simulates this domino effect across your real project repositories.
                  </p>
                </div>
              </div>
              <button
                onClick={startTour}
                className="shrink-0 px-5 py-2.5 bg-[#3DDC97] hover:bg-[#3DDC97]/90 text-[#0A0E14] font-bold rounded-xl shadow-glow-green flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-[#0A0E14]" />
                Guided Simulation (1-Min)
              </button>
            </div>
          </div>
        )}

        {/* B. Dynamic Project App Selector & Scenario Story Card */}
        <div className="glass-panel p-4 md:p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800/80">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#3DDC97]">
              <Building className="w-3.5 h-3.5" />
              <span>Domino Simulator • Active Application</span>
            </div>
            <h3 className="text-base md:text-lg font-bold text-white font-heading flex items-center gap-2">
              <span>{currentApp.name}</span>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-[#3DDC97] border border-slate-700 uppercase">
                {currentApp.criticality_tag ? currentApp.criticality_tag.replace('_', ' ') : 'Production App'}
              </span>
            </h3>
            <p className="text-slate-300 text-sm max-w-3xl leading-normal">
              {profile.storyDescription}
            </p>
          </div>

          {/* Project Application Dropdown */}
          <div className="flex items-center gap-3 shrink-0 self-end md:self-auto bg-slate-900/90 p-2 rounded-xl border border-slate-700/80">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <Server className="w-3.5 h-3.5 text-[#3DDC97]" />
              <span>Select App:</span>
            </span>
            <select
              value={selectedAppId}
              onChange={(e) => onSelectApp(e.target.value)}
              className="bg-slate-950 text-slate-100 text-xs font-semibold rounded-lg px-3 py-1.5 border border-[#3DDC97]/30 focus:outline-none focus:border-[#3DDC97] transition-colors"
            >
              {applications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.name} ({app.max_risk_score ? Math.round(app.max_risk_score) : 85} Risk Score)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* C. MAIN HERO GRID: Graph Canvas + Right Rail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* C1. Full-Width Hero Graph Canvas (8 Cols) */}
          <div className={`lg:col-span-8 glass-panel rounded-2xl relative overflow-hidden flex flex-col min-h-[480px] border border-slate-800/80 ${tourStep === 1 || tourStep === 2 ? 'tour-spotlight-highlight' : ''}`}>
            
            {/* Canvas Header & Play Controls */}
            <div className="p-4 border-b border-slate-800/60 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3DDC97] animate-pulse" />
                  <span>Dependly Domino Simulation Canvas: {currentApp.name}</span>
                </div>
                {isFixed && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Protected by Smart Fix
                  </span>
                )}
              </div>

              {/* Simulation Action Bar */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={isFixed}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                    isPlaying 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                      : isFixed
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
                  }`}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? 'Pause' : 'Play Ripple'}</span>
                </button>

                <button
                  onClick={resetSim}
                  className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700/60"
                  title="Reset simulation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Interactive Graph Canvas Background */}
            <div className="relative flex-1 bg-grid-pattern p-6 flex items-center justify-center min-h-[380px]">
              
              {/* SVG Link Connections */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {/* Link 1: Patient Zero -> Junction 1 */}
                <line 
                  x1="18%" y1="50%" x2="42%" y2="30%" 
                  stroke={isFixed ? '#10B981' : rippleProgress > 20 ? '#EF4444' : '#334155'} 
                  strokeWidth={rippleProgress > 20 ? '3' : '2'}
                  className={rippleProgress > 20 && !isFixed ? 'animate-domino-link' : ''}
                />
                {/* Link 2: Patient Zero -> Junction 2 */}
                <line 
                  x1="18%" y1="50%" x2="42%" y2="70%" 
                  stroke={isFixed ? '#10B981' : rippleProgress > 35 ? '#EF4444' : '#334155'} 
                  strokeWidth={rippleProgress > 35 ? '3' : '2'}
                  className={rippleProgress > 35 && !isFixed ? 'animate-domino-link' : ''}
                />
                {/* Link 3: Junction 1 -> Downstream App 1 */}
                <line 
                  x1="42%" y1="30%" x2="78%" y2="25%" 
                  stroke={isFixed ? '#10B981' : rippleProgress > 60 ? '#EF4444' : '#334155'} 
                  strokeWidth={rippleProgress > 60 ? '3' : '2'}
                  className={rippleProgress > 60 && !isFixed ? 'animate-domino-link' : ''}
                />
                {/* Link 4: Junction 2 -> Downstream App 2 */}
                <line 
                  x1="42%" y1="70%" x2="78%" y2="75%" 
                  stroke={isFixed ? '#10B981' : rippleProgress > 75 ? '#EF4444' : '#334155'} 
                  strokeWidth={rippleProgress > 75 ? '3' : '2'}
                  className={rippleProgress > 75 && !isFixed ? 'animate-domino-link' : ''}
                />
              </svg>

              {/* NODE 1: Patient Zero (Bottom-Load Brick) */}
              <div 
                className={`absolute left-[5%] md:left-[8%] top-[36%] w-44 md:w-52 p-3.5 rounded-2xl transition-all duration-500 flex flex-col items-center text-center border shadow-xl z-20 ${
                  isFixed 
                    ? 'bg-emerald-950/90 border-emerald-500/50 shadow-emerald-500/10' 
                    : rippleProgress > 0 
                    ? 'bg-rose-950/95 border-rose-500/80 shadow-rose-500/30 scale-105' 
                    : 'bg-slate-900/95 border-amber-500/60 shadow-amber-500/10'
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400 mb-1">
                  Patient Zero (Transitive)
                </div>
                <div className="font-mono text-xs md:text-sm font-bold text-white truncate w-full" title={profile.patientZeroName}>
                  {profile.patientZeroName}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{profile.patientZeroVersion}</div>
                {rippleProgress > 0 && !isFixed && (
                  <span className="mt-2 px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] font-bold rounded-md border border-rose-500/30 animate-pulse">
                    Flaw Exploited
                  </span>
                )}
                {isFixed && (
                  <span className="mt-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-md border border-emerald-500/30">
                    Patched &amp; Shielded
                  </span>
                )}
              </div>

              {/* NODE 2 & 3: Intermediate Choke Points */}
              <div className="absolute left-[36%] md:left-[38%] top-[18%] w-36 md:w-44 p-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-center shadow-lg z-20">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Direct Junction 1</div>
                <div className="font-mono text-xs font-semibold text-slate-200 truncate mt-0.5" title={profile.junction1}>{profile.junction1}</div>
              </div>

              <div className="absolute left-[36%] md:left-[38%] top-[68%] w-36 md:w-44 p-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-center shadow-lg z-20">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Direct Junction 2</div>
                <div className="font-mono text-xs font-semibold text-slate-200 truncate mt-0.5" title={profile.junction2}>{profile.junction2}</div>
              </div>

              {/* NODE 4 & 5: Downstream Core Business Apps */}
              <div 
                className={`absolute right-[5%] md:right-[8%] top-[14%] w-48 sm:w-56 md:w-64 p-3.5 rounded-2xl transition-all duration-500 border shadow-xl z-20 flex flex-col justify-center ${
                  isFixed
                    ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                    : rippleProgress > 60
                    ? 'bg-rose-950/90 border-rose-500/60 text-rose-200 animate-pulse'
                    : 'bg-slate-900/90 border-slate-700 text-slate-300'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#3DDC97] mb-0.5">Target Microservice</div>
                <div className="font-bold text-xs md:text-sm text-white truncate leading-tight" title={profile.downstream1}>{profile.downstream1}</div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Status:</span>
                  <span className={`font-semibold ${isFixed ? 'text-emerald-400' : rippleProgress > 60 ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                    {isFixed ? 'Secure' : rippleProgress > 60 ? 'Impacted' : 'Healthy'}
                  </span>
                </div>
              </div>

              <div 
                className={`absolute right-[5%] md:right-[8%] top-[66%] w-48 sm:w-56 md:w-64 p-3.5 rounded-2xl transition-all duration-500 border shadow-xl z-20 flex flex-col justify-center ${
                  isFixed
                    ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                    : rippleProgress > 75
                    ? 'bg-rose-950/90 border-rose-500/60 text-rose-200 animate-pulse'
                    : 'bg-slate-900/90 border-slate-700 text-slate-300'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#3DDC97] mb-0.5">Core Gateway Engine</div>
                <div className="font-bold text-xs md:text-sm text-white truncate leading-tight" title={profile.downstream2}>{profile.downstream2}</div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Status:</span>
                  <span className={`font-semibold ${isFixed ? 'text-emerald-400' : rippleProgress > 75 ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                    {isFixed ? 'Secure' : rippleProgress > 75 ? 'Frozen' : 'Healthy'}
                  </span>
                </div>
              </div>

              {/* D. Live PiP Business Fallout Widget (Bottom-Left Overlay) */}
              <div className={`absolute bottom-4 left-4 glass-panel p-3.5 md:p-4 rounded-2xl w-64 md:w-72 border transition-all duration-300 shadow-2xl ${tourStep === 3 ? 'tour-spotlight-highlight ring-2 ring-cyan-400' : ''} ${appStatus === 'Frozen' ? 'glass-panel-warning' : appStatus === 'Protected' ? 'glass-panel-success' : 'border-slate-700/80 bg-slate-950/90'}`}>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Activity className={`w-4 h-4 ${appStatus === 'Frozen' ? 'text-rose-400 animate-bounce' : appStatus === 'Protected' ? 'text-emerald-400' : 'text-cyan-400'}`} />
                    <span className="text-xs font-bold text-white font-heading">Live Business Fallout</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    appStatus === 'Frozen' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                    appStatus === 'Slowing' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                    appStatus === 'Protected' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                    'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  }`}>
                    {appStatus}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-slate-300 truncate">{profile.pipServiceName}</div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400">Live Throughput:</span>
                    <span className={`font-mono text-sm font-bold ${appStatus === 'Frozen' ? 'text-rose-400' : appStatus === 'Protected' ? 'text-emerald-400' : 'text-cyan-300'}`}>
                      {tps} req/sec
                    </span>
                  </div>
                  
                  {/* Sparkline Graphic */}
                  <div className="h-8 w-full mt-2 pt-1">
                    <svg className="w-full h-full overflow-visible">
                      <path 
                        d={
                          appStatus === 'Frozen'
                            ? "M 0 10 Q 40 10, 80 25 T 160 30 T 240 30"
                            : appStatus === 'Slowing'
                            ? "M 0 10 Q 60 12, 120 20 T 240 25"
                            : "M 0 20 Q 60 10, 120 15 T 240 8"
                        }
                        fill="none" 
                        stroke={appStatus === 'Frozen' ? '#EF4444' : appStatus === 'Protected' ? '#10B981' : '#00F2FE'} 
                        strokeWidth="2.5"
                      />
                    </svg>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* C2. Right Rail: Plain-English Project Stats + Smart Fix Button (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Plain-English Stats Card 1: Domino Risk Score */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 relative group hover:border-cyan-500/40 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  Domino Risk Score
                  <div className="relative group/tooltip">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-400 cursor-help" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/tooltip:block w-48 p-2 bg-slate-900 text-slate-300 text-xs rounded-lg border border-slate-700 shadow-xl z-50 pointer-events-none">
                      Technical term: <strong>Systemic Ripple Risk (RRI)</strong>. Calculated specifically for {currentApp.name}.
                    </div>
                  </div>
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                  appRiskScore > 70 
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' 
                    : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                }`}>
                  {appRiskScore > 70 ? 'High Risk' : 'Medium Risk'}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white font-heading">{appRiskScore}</span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
              <p className="text-slate-400 text-xs mt-1 leading-snug">
                How severely {currentApp.name} can break if {profile.patientZeroName} fails.
              </p>
            </div>

            {/* Plain-English Stats Card 2: Impact Zone */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 relative group hover:border-cyan-500/40 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  Project Dependency Count
                  <div className="relative group/tooltip">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-400 cursor-help" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/tooltip:block w-48 p-2 bg-slate-900 text-slate-300 text-xs rounded-lg border border-slate-700 shadow-xl z-50 pointer-events-none">
                      Includes {directDeps} direct + {transitiveDeps} hidden transitive libraries.
                    </div>
                  </div>
                </span>
                <span className="text-xs font-mono text-cyan-400">{cveCountEstimate} Active CVEs</span>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex-1 bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center">
                  <div className="text-lg font-bold text-white font-mono">{directDeps}</div>
                  <div className="text-[10px] text-slate-400">Direct</div>
                </div>
                <div className="flex-1 bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center">
                  <div className="text-lg font-bold text-cyan-300 font-mono">{transitiveDeps}</div>
                  <div className="text-[10px] text-slate-400">Transitive</div>
                </div>
                <div className="flex-1 bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center">
                  <div className="text-lg font-bold text-amber-400 font-mono">{kevCountEstimate}</div>
                  <div className="text-[10px] text-slate-400">CISA KEV</div>
                </div>
              </div>
            </div>

            {/* PRIMARY CTA: Apply Smart Fix */}
            <div className={`p-1 rounded-2xl transition-all duration-300 ${tourStep === 4 ? 'tour-spotlight-highlight' : ''}`}>
              <button
                onClick={applySmartFix}
                disabled={isFixed}
                className={`w-full py-4 px-6 rounded-2xl font-bold font-heading text-sm md:text-base flex items-center justify-center gap-2 shadow-xl transition-all transform active:scale-[0.98] ${
                  isFixed 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 cursor-default'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-500/20 hover:scale-[1.01]'
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
                <span>{isFixed ? `Smart Fix Applied to ${currentApp.name}` : `Apply Smart Fix to ${currentApp.name}`}</span>
              </button>
            </div>

            {/* Success Confirmation Toast */}
            {isFixed && (
              <div className="glass-panel-success p-4 rounded-xl flex items-start gap-3 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <div className="font-bold text-emerald-200">Protected {currentApp.name}!</div>
                  <div className="text-emerald-300/80 leading-relaxed">
                    Upgraded <code className="font-mono text-emerald-200">{profile.patientZeroName}</code>. One smart patch shielded all downstream services in {currentApp.name}.
                  </div>
                </div>
              </div>
            )}

            {/* SECONDARY LINK: Show Advanced Metrics */}
            <div className="text-center pt-2">
              <button
                onClick={onOpenAdvanced}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors py-1 px-3 rounded-lg hover:bg-slate-900"
              >
                <span>Open Advanced Dashboard for {currentApp.name}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>

        {/* E. 4-STEP GUIDED STORY TOUR OVERLAY */}
        {tourStep > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className="glass-panel-accent p-6 max-w-lg w-full rounded-2xl shadow-2xl relative space-y-4 border border-cyan-500/40">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-[#3DDC97] font-bold font-heading text-sm uppercase tracking-wider">
                  <BookOpen className="w-4 h-4" />
                  <span>Guided Simulation • Step {tourStep} of 4</span>
                </div>
                <button 
                  onClick={() => setTourStep(0)}
                  className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1 bg-slate-800/80 rounded-lg hover:bg-slate-700"
                >
                  Skip Simulation (Esc)
                </button>
              </div>

              {/* Step Content */}
              {tourStep === 1 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white font-heading flex items-center gap-2">
                    🧱 Step 1: Patient Zero in {currentApp.name}
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    This is <code className="text-amber-300 font-mono">{profile.patientZeroName} ({profile.patientZeroVersion})</code>, a transitive package inside <strong>{currentApp.name}</strong>. It carries <span className="text-rose-400 font-semibold">{profile.patientZeroCve}</span>.
                  </p>
                </div>
              )}

              {tourStep === 2 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white font-heading flex items-center gap-2">
                    🌊 Step 2: Propagation through {currentApp.name}
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Watch the red domino wave travel through direct dependencies (<code className="text-cyan-300 font-mono">{profile.junction1}</code>) into production services for <strong>{currentApp.name}</strong>.
                  </p>
                </div>
              )}

              {tourStep === 3 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white font-heading flex items-center gap-2">
                    📉 Step 3: Live Business Fallout
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Observe the bottom-left fallout widget for <strong>{profile.pipServiceName}</strong>. Throughput drops from <strong className="text-rose-400 font-mono">120 req/s to 0</strong> as the flaw impacts live requests.
                  </p>
                </div>
              )}

              {tourStep === 4 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white font-heading flex items-center gap-2">
                    🛡️ Step 4: Shield {currentApp.name}
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Click <strong>Apply Smart Fix</strong> to patch <code className="text-emerald-300 font-mono">{profile.patientZeroName}</code> and neutralize the domino wave across all services in <strong>{currentApp.name}</strong>.
                  </p>
                </div>
              )}

              {/* Tour Controls */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={prevTourStep}
                  disabled={tourStep === 1}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    tourStep === 1 
                      ? 'text-slate-600 cursor-not-allowed' 
                      : 'text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  Back
                </button>
                <button
                  onClick={nextTourStep}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
                >
                  <span>{tourStep === 4 ? 'Finish & Apply Fix' : 'Next Step'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
