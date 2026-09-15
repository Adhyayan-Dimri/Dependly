import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ShieldAlert, Activity, Zap, Layers, Play, Pause, RefreshCw, Terminal } from 'lucide-react';

import { ApplicationSummary } from '../types';

gsap.registerPlugin(ScrollTrigger);

interface HeroGraphScrollProps {
  applications?: ApplicationSummary[];
  onExploreClick: () => void;
  onWarRoomClick: () => void;
  onIngestClick: () => void;
}

export const HeroGraphScroll: React.FC<HeroGraphScrollProps> = ({
  applications = [],
  onExploreClick,
  onWarRoomClick,
  onIngestClick,
}) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const graphCardRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeStage, setActiveStage] = useState<number>(1);
  const [selectedAppId, setSelectedAppId] = useState<string>(applications[0]?.id || '6aa6b17cac30621f3b833aa6');
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const selectedApp = applications.find(a => a.id === selectedAppId) || {
    id: '6aa6b17cac30621f3b833aa6',
    name: 'ShopSphere e-Commerce',
    source: 'package.json',
    direct_deps_count: 3,
    total_deps_count: 14,
    criticality_tag: 'customer_facing'
  };

  const getAppDeps = (appName: string, appId: string = '') => {
    const name = appName.toLowerCase();
    if (name.includes('finflow') || name.includes('fintech') || name.includes('bank')) {
      return {
        direct: [
          { name: 'jsonwebtoken', ver: 'v8.5.1' },
          { name: 'axios-proxy', ver: 'v0.21.1' },
          { name: 'pg-driver', ver: 'v8.7.3' },
        ],
        vuln: { name: 'semver', ver: 'v5.7.0', cve: 'CVE-2022-23529' },
        transitive: ['buffer', 'ecdsa', 'asn1', 'ws-engine']
      };
    }
    if (name.includes('devops') || name.includes('agent') || name.includes('pipeline')) {
      return {
        direct: [
          { name: 'commander', ver: 'v9.2.0' },
          { name: 'pyyaml', ver: 'v5.3.1' },
          { name: 'docker-api', ver: 'v2.1.0' },
        ],
        vuln: { name: 'qs', ver: 'v6.5.2', cve: 'CVE-2017-1000048' },
        transitive: ['certifi', 'idna', 'six', 'chardet']
      };
    }
    if (name.includes('health') || name.includes('patient') || name.includes('med')) {
      return {
        direct: [
          { name: 'requests-http', ver: 'v2.28.1' },
          { name: 'flask-cors', ver: 'v3.0.10' },
          { name: 'pydantic', ver: 'v1.10.2' },
        ],
        vuln: { name: 'urllib3', ver: 'v1.26.4', cve: 'CVE-2021-33503' },
        transitive: ['charset-norm', 'idna-core', 'urllib3-core', 'certifi']
      };
    }
    if (name.includes('express') || name.includes('shop') || name.includes('commerce')) {
      return {
        direct: [
          { name: 'express', ver: 'v4.18.2' },
          { name: 'stripe', ver: 'v10.4.0' },
          { name: 'dotenv', ver: 'v16.0.3' },
        ],
        vuln: { name: 'lodash', ver: 'v4.17.15', cve: 'CVE-2019-10744' },
        transitive: ['qs', 'follow-red', 'debug', 'ms']
      };
    }
    // Fallback for custom ingested apps: deterministic generation from appId/name
    const charSum = appId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return {
      direct: [
        { name: `${appName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 10)}-core`, ver: 'v2.1.0' },
        { name: 'config-loader', ver: 'v1.4.0' },
        { name: 'http-client', ver: 'v3.2.1' },
      ],
      vuln: { name: `transitive-pkg-${charSum % 99}`, ver: 'v1.0.4', cve: `CVE-2023-${1000 + (charSum % 8999)}` },
      transitive: ['utils-common', 'parser-base', 'async-queue', 'logger-sys']
    };
  };

  const appData = getAppDeps(selectedApp.name, selectedApp.id);

  // 3D Perspective Mouse Tilt Effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!graphCardRef.current) return;
    const rect = graphCardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotateX = (-y / rect.height) * 12;
    const rotateY = (x / rect.width) * 12;

    gsap.to(graphCardRef.current, {
      rotateX: rotateX,
      rotateY: rotateY,
      duration: 0.5,
      ease: 'power2.out',
      transformPerspective: 1000,
    });
  };

  const handleMouseLeave = () => {
    if (!graphCardRef.current) return;
    gsap.to(graphCardRef.current, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.8,
      ease: 'power2.out',
    });
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      gsap.set('.node-app, .node-direct, .node-transitive, .edge-direct, .edge-transitive, .edge-propagation', {
        opacity: 1,
        scale: 1,
        strokeDashoffset: 0,
      });
      gsap.set('.node-compromised', { fill: '#FF5D5D' });
      gsap.set('.node-affected', { fill: '#F5A623' });
      return;
    }

    const ctx = gsap.context(() => {
      // Set initial states
      gsap.set('.node-app', { opacity: 0, scale: 0.3, transformOrigin: 'center center' });
      gsap.set('.node-direct', { opacity: 0, scale: 0.2, transformOrigin: 'center center' });
      gsap.set('.node-transitive', { opacity: 0, scale: 0.2, transformOrigin: 'center center' });
      gsap.set('.edge-direct', { strokeDasharray: 240, strokeDashoffset: 240, opacity: 0.8 });
      gsap.set('.edge-transitive', { strokeDasharray: 180, strokeDashoffset: 180, opacity: 0.8 });
      gsap.set('.edge-propagation', { strokeDasharray: 240, strokeDashoffset: 240, stroke: '#FF5D5D' });
      gsap.set('.ripple-circle', { scale: 0, opacity: 0, transformOrigin: 'center center' });
      gsap.set('.compromise-badge', { opacity: 0, y: 15 });

      const tl = gsap.timeline({
        repeat: -1,
        repeatDelay: 2.5,
        onUpdate: () => {
          const prog = tl.progress();
          if (prog < 0.25) setActiveStage(1);
          else if (prog < 0.50) setActiveStage(2);
          else if (prog < 0.75) setActiveStage(3);
          else setActiveStage(4);
        }
      });

      timelineRef.current = tl;

      // Stage 1 (0–25%): Application Root node appears
      tl.to('.node-app', { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.5)' })
        .to('.stage-card-1', { opacity: 1, y: 0, duration: 0.4 }, '<')

        // Stage 2 (25–50%): Direct Manifest Dependencies connect
        .to('.stage-card-1', { opacity: 0, y: -8, duration: 0.3, delay: 1.2 })
        .to('.stage-card-2', { opacity: 1, y: 0, duration: 0.4 }, '<')
        .to('.edge-direct', { strokeDashoffset: 0, duration: 1.2, stagger: 0.1, ease: 'power2.out' })
        .to('.node-direct', { opacity: 1, scale: 1, stagger: 0.1, duration: 0.8, ease: 'back.out(1.2)' }, '<0.2')

        // Stage 3 (50–75%): Deep Transitive Graph Cascades
        .to('.stage-card-2', { opacity: 0, y: -8, duration: 0.3, delay: 1.2 })
        .to('.stage-card-3', { opacity: 1, y: 0, duration: 0.4 }, '<')
        .to('.edge-transitive', { strokeDashoffset: 0, duration: 1.2, stagger: 0.08, ease: 'power2.out' })
        .to('.node-transitive', { opacity: 1, scale: 1, stagger: 0.08, duration: 0.8, ease: 'back.out(1.2)' }, '<0.2')

        // Stage 4 (75–100%): Zero-Day Compromise Propagation Wave
        .to('.stage-card-3', { opacity: 0, y: -8, duration: 0.3, delay: 1.2 })
        .to('.stage-card-4', { opacity: 1, y: 0, duration: 0.4 }, '<')
        .to('.node-compromised-circle', { fill: '#FF5D5D', stroke: '#FF5D5D', duration: 0.4 })
        .to('.compromise-badge', { opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.4)' }, '<')
        .to('.ripple-circle', { scale: 2.5, opacity: 0.9, duration: 1.4, stagger: 0.2 }, '<')
        .to('.edge-propagation', { strokeDashoffset: 0, stagger: 0.1, duration: 1.2, stroke: '#FF5D5D', strokeWidth: 3 }, '<0.2')
        .to('.node-affected-circle', { fill: '#F5A623', stroke: '#FF5D5D', stagger: 0.1, duration: 0.4 }, '<0.3')
        .to('.node-app-circle', { stroke: '#FF5D5D', strokeWidth: 4, duration: 0.5 }, '<0.2')
        .to({}, { duration: 2.5 });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const togglePlay = () => {
    if (!timelineRef.current) return;
    if (isPlaying) {
      timelineRef.current.pause();
    } else {
      timelineRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const restartTimeline = () => {
    if (!timelineRef.current) return;
    timelineRef.current.restart();
    setIsPlaying(true);
  };

  const goToStage = (stage: number) => {
    if (!timelineRef.current) return;
    const progressMap: Record<number, number> = {
      1: 0.1,
      2: 0.35,
      3: 0.60,
      4: 0.85
    };
    timelineRef.current.pause();
    timelineRef.current.progress(progressMap[stage]);
    setIsPlaying(false);
    setActiveStage(stage);
  };

  return (
    <section ref={sectionRef} className="relative w-full bg-[#0A0E14] border-b border-[#1C2333] select-none py-10 px-6 overflow-hidden">
      {/* Dynamic Animated Grid & Neon Atmospheric Backdrop */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-25 animate-pulse"></div>
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#3DDC97]/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-6">
        {/* Top Header Title & Actions */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#1C2333] border border-[#2A364F] text-[#3DDC97] font-mono text-xs shadow-glow-green">
            <span>3D INTERACTIVE DEPENDENCY GRAPH ENGINE</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#E6EDF3] tracking-tight">
            Interactive <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3DDC97] via-[#4D96FF] to-[#FF5D5D]">Compromise Wave</span> Simulator
          </h1>

          <p className="text-sm md:text-base text-[#8B949E] max-w-2xl mx-auto font-sans leading-relaxed">
            Hover over the graph to inspect 3D perspective depth. Click any stage pill to jump directly to that phase of compromise wave simulation.
          </p>

          {/* Quick Action Controls */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={togglePlay}
              className="px-4 py-2 rounded-lg bg-[#1C2333] border border-[#2A364F] hover:border-[#3DDC97] text-[#E6EDF3] font-mono text-xs font-bold transition-all flex items-center space-x-2"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-[#F5A623]" /> : <Play className="w-3.5 h-3.5 text-[#3DDC97]" />}
              <span>{isPlaying ? 'Pause Simulation' : 'Play Simulation'}</span>
            </button>

            <button
              onClick={restartTimeline}
              className="px-4 py-2 rounded-lg bg-[#1C2333] border border-[#2A364F] hover:border-[#4D96FF] text-[#8B949E] hover:text-[#E6EDF3] font-mono text-xs transition-all flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Replay Sequence</span>
            </button>

            <button
              onClick={onIngestClick}
              className="px-5 py-2 rounded-lg bg-[#3DDC97] text-[#0A0E14] font-mono text-xs font-bold hover:bg-[#3DDC97]/90 transition-all shadow-glow-green flex items-center space-x-2"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Ingest App</span>
            </button>

            <button
              onClick={onWarRoomClick}
              className="px-5 py-2 rounded-lg bg-[#FF5D5D]/15 border border-[#FF5D5D]/40 text-[#FF5D5D] hover:bg-[#FF5D5D]/25 font-mono text-xs font-bold transition-all flex items-center space-x-2"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Launch War Room</span>
            </button>
          </div>
        </div>

        {/* HIGH CONTRAST READABLE STAGE NARRATION HUD PANEL */}
        <div className="relative h-16 w-full max-w-3xl mx-auto flex items-center justify-center">
          <div className="stage-card-1 opacity-0 transform translate-y-2 absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="px-5 py-2.5 rounded-xl bg-[#141B26] border border-[#3DDC97]/60 text-center shadow-2xl flex items-center space-x-3">
              <span className="px-2.5 py-0.5 rounded font-mono text-[11px] bg-[#3DDC97]/20 border border-[#3DDC97]/50 text-[#3DDC97] font-bold">STAGE 01</span>
              <span className="text-xs font-mono text-[#E6EDF3]">Root target service (<strong className="text-[#3DDC97]">{selectedApp.name}</strong>) initialized in production</span>
            </div>
          </div>

          <div className="stage-card-2 opacity-0 transform translate-y-2 absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="px-5 py-2.5 rounded-xl bg-[#141B26] border border-[#4D96FF]/60 text-center shadow-2xl flex items-center space-x-3">
              <span className="px-2.5 py-0.5 rounded font-mono text-[11px] bg-[#4D96FF]/20 border border-[#4D96FF]/50 text-[#4D96FF] font-bold">STAGE 02</span>
              <span className="text-xs font-mono text-[#E6EDF3]">Direct manifest dependencies resolved (<strong className="text-[#4D96FF]">{appData.direct.map(d => d.name).join(', ')}</strong>)</span>
            </div>
          </div>

          <div className="stage-card-3 opacity-0 transform translate-y-2 absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="px-5 py-2.5 rounded-xl bg-[#141B26] border border-[#F5A623]/60 text-center shadow-2xl flex items-center space-x-3">
              <span className="px-2.5 py-0.5 rounded font-mono text-[11px] bg-[#F5A623]/20 border border-[#F5A623]/50 text-[#F5A623] font-bold">STAGE 03</span>
              <span className="text-xs font-mono text-[#E6EDF3]">Deep transitive dependencies cascaded (<strong className="text-[#F5A623]">{appData.vuln.name}, {appData.transitive.join(', ')}</strong>)</span>
            </div>
          </div>

          {/* STAGE 4 HIGH CONTRAST SUPER READABLE BANNER */}
          <div className="stage-card-4 opacity-0 transform translate-y-2 absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="px-5 py-2.5 rounded-xl bg-[#141B26] border-2 border-[#FF5D5D] text-center shadow-2xl flex items-center space-x-3">
              <span className="px-2.5 py-1 rounded-md text-xs bg-[#FF5D5D] text-[#0A0E14] font-extrabold tracking-wide">Stage 04</span>
              <span className="text-xs text-[#E6EDF3] font-semibold">
                Compromised transitive CVE (<strong className="text-[#FF5D5D] underline font-bold">{appData.vuln.name} {appData.vuln.ver}</strong>) sweeps upstream to {selectedApp.name}!
              </span>
            </div>
          </div>
        </div>

        {/* 3D Tilt Perspective Container */}
        <div className="perspective-1000 flex justify-center">
          <div
            ref={graphCardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="relative w-full bg-[#141B26]/90 border border-[#1C2333] hover:border-[#2A364F] rounded-2xl p-6 shadow-2xl transition-shadow duration-300 transform-gpu flex flex-col items-center cursor-pointer"
          >
            {/* CLICKABLE STAGE SELECTION BUTTONS AT TOP OF CARD */}
            <div className="w-full flex flex-wrap items-center justify-between pb-4 mb-2 border-b border-[#1C2333] text-xs gap-3">
              <div className="flex items-center space-x-3 text-[#8B949E]">
                <div className="flex items-center space-x-1.5 bg-[#1C2333] px-3 py-1 rounded-xl border border-[#2A364F]">
                  <Layers className="w-3.5 h-3.5 text-[#3DDC97]" />
                  <span className="text-[11px] text-[#8B949E] font-medium">Target App:</span>
                  <select
                    value={selectedAppId}
                    onChange={(e) => {
                      e.stopPropagation();
                      setSelectedAppId(e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-transparent text-[#E6EDF3] font-bold text-xs focus:outline-none cursor-pointer"
                  >
                    {applications.length > 0 ? (
                      applications.map(app => (
                        <option key={app.id} value={app.id} className="bg-[#141B26] text-[#E6EDF3]">
                          {app.name}
                        </option>
                      ))
                    ) : (
                      <option value="6aa6b17cac30621f3b833aa6" className="bg-[#141B26] text-[#E6EDF3]">
                        ShopSphere e-Commerce
                      </option>
                    )}
                  </select>
                </div>
                <span className="font-medium text-[#E6EDF3] hidden sm:inline">&bull; Click stage pill to jump:</span>
              </div>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4].map(s => (
                  <button
                    key={s}
                    onClick={(e) => {
                      e.stopPropagation();
                      goToStage(s);
                    }}
                    className={`px-3 py-1 rounded-lg font-bold transition-all text-xs border ${
                      activeStage === s
                        ? s === 4
                          ? 'bg-[#FF5D5D] text-[#0A0E14] border-[#FF5D5D] shadow-glow-red scale-105'
                          : 'bg-[#3DDC97] text-[#0A0E14] border-[#3DDC97] shadow-glow-green scale-105'
                        : 'bg-[#1C2333] border-[#2A364F] text-[#8B949E] hover:text-[#E6EDF3] hover:border-[#3DDC97]'
                    }`}
                  >
                    STAGE 0{s}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG GRAPH CANVAS WITH PERFECT EDGE ALIGNMENT */}
            <svg viewBox="0 0 1000 400" className="w-full max-w-4xl h-[360px] drop-shadow-2xl">
              <defs>
                <linearGradient id="edgeGradDirect" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4D96FF" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#3DDC97" stopOpacity="0.5" />
                </linearGradient>
                <linearGradient id="edgeGradTransitive" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F5A623" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#4D96FF" stopOpacity="0.4" />
                </linearGradient>

                <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Orbital Cyber Rings around Root App */}
              <circle cx="500" cy="70" r="54" fill="none" stroke="#3DDC97" strokeWidth="1" strokeDasharray="6 4" className="animate-spin-slow opacity-40" />
              <circle cx="500" cy="70" r="64" fill="none" stroke="#4D96FF" strokeWidth="0.8" strokeDasharray="12 6" className="animate-spin-reverse opacity-30" />

              {/* Shockwave rings around compromised node */}
              <circle cx="220" cy="320" r="35" fill="none" stroke="#FF5D5D" strokeWidth="2" className="ripple-circle pointer-events-none" />
              <circle cx="220" cy="320" r="70" fill="none" stroke="#FF5D5D" strokeWidth="1.5" className="ripple-circle pointer-events-none" />
              <circle cx="220" cy="320" r="105" fill="none" stroke="#FF5D5D" strokeWidth="1" className="ripple-circle pointer-events-none" />

              {/* EDGES: Direct -> Root App */}
              <path d="M 340 170 L 500 70" stroke="url(#edgeGradDirect)" strokeWidth="2.5" fill="none" className="edge-direct" />
              <path d="M 500.01 170 L 500 70" stroke="url(#edgeGradDirect)" strokeWidth="2.5" fill="none" className="edge-direct" />
              <path d="M 660 170 L 500 70" stroke="url(#edgeGradDirect)" strokeWidth="2.5" fill="none" className="edge-direct" />

              {/* EDGES: Transitive -> Direct */}
              <path d="M 220 320 L 340 170" stroke="url(#edgeGradTransitive)" strokeWidth="2" fill="none" className="edge-transitive edge-propagation" />
              <path d="M 370 300 L 340 170" stroke="url(#edgeGradTransitive)" strokeWidth="2" fill="none" className="edge-transitive" />
              <path d="M 500.01 310 L 500 170" stroke="url(#edgeGradTransitive)" strokeWidth="2" fill="none" className="edge-transitive" />
              <path d="M 630 300 L 660 170" stroke="url(#edgeGradTransitive)" strokeWidth="2" fill="none" className="edge-transitive" />
              <path d="M 780 320 L 660 170" stroke="url(#edgeGradTransitive)" strokeWidth="2" fill="none" className="edge-transitive" />

              {/* Stage 1: Central Root App Node */}
              <g className="node-app" filter="url(#glow)">
                <circle cx="500" cy="70" r="38" fill="#1C2333" stroke="#3DDC97" strokeWidth="3" className="node-app-circle" />
                <circle cx="500" cy="70" r="30" fill="#0A0E14" stroke="none" />
                <text x="500" y="67" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="800" fontFamily="Inter" stroke="none">{selectedApp.name}</text>
                <text x="500" y="80" textAnchor="middle" fill="#3DDC97" fontSize="8" fontWeight="700" fontFamily="JetBrains Mono" stroke="none">ROOT APP</text>
              </g>

              {/* Stage 2: Direct Dependencies */}
              <g className="node-direct" filter="url(#glow)">
                <circle cx="340" cy="170" r="28" fill="#1C2333" stroke="#4D96FF" strokeWidth="2.5" className="node-affected-circle" />
                <circle cx="340" cy="170" r="22" fill="#0A0E14" stroke="none" />
                <text x="340" y="167" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="700" fontFamily="Inter" stroke="none">{appData.direct[0].name}</text>
                <text x="340" y="179" textAnchor="middle" fill="#8B949E" fontSize="8" fontFamily="JetBrains Mono" stroke="none">{appData.direct[0].ver}</text>
              </g>
              <g className="node-direct" filter="url(#glow)">
                <circle cx="500" cy="170" r="28" fill="#1C2333" stroke="#4D96FF" strokeWidth="2.5" className="node-direct-circle" />
                <circle cx="500" cy="170" r="22" fill="#0A0E14" stroke="none" />
                <text x="500" y="167" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="700" fontFamily="Inter" stroke="none">{appData.direct[1].name}</text>
                <text x="500" y="179" textAnchor="middle" fill="#8B949E" fontSize="8" fontFamily="JetBrains Mono" stroke="none">{appData.direct[1].ver}</text>
              </g>
              <g className="node-direct" filter="url(#glow)">
                <circle cx="660" cy="170" r="28" fill="#1C2333" stroke="#4D96FF" strokeWidth="2.5" className="node-direct-circle" />
                <circle cx="660" cy="170" r="22" fill="#0A0E14" stroke="none" />
                <text x="660" y="167" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="700" fontFamily="Inter" stroke="none">{appData.direct[2].name}</text>
                <text x="660" y="179" textAnchor="middle" fill="#8B949E" fontSize="8" fontFamily="JetBrains Mono" stroke="none">{appData.direct[2].ver}</text>
              </g>

              {/* Stage 3: Transitive Dependencies */}
              <g className="node-transitive" filter="url(#glow)">
                <circle cx="220" cy="320" r="30" fill="#1C2333" stroke="#F5A623" strokeWidth="2" className="node-compromised-circle" />
                <circle cx="220" cy="320" r="23" fill="#0A0E14" stroke="none" />
                <text x="220" y="316" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="800" fontFamily="Inter" stroke="none">{appData.vuln.name}</text>
                <text x="220" y="329" textAnchor="middle" fill="#E6EDF3" fontSize="8" fontFamily="JetBrains Mono" stroke="none">{appData.vuln.ver}</text>
              </g>
              <g className="node-transitive">
                <circle cx="370" cy="300" r="24" fill="#1C2333" stroke="#2A364F" strokeWidth="2" />
                <text x="370" y="298" textAnchor="middle" fill="#8B949E" fontSize="9" fontFamily="Inter" stroke="none">{appData.transitive[0]}</text>
                <text x="370" y="309" textAnchor="middle" fill="#5B6878" fontSize="7" fontFamily="JetBrains Mono" stroke="none">v1.2.0</text>
              </g>
              <g className="node-transitive">
                <circle cx="500" cy="310" r="24" fill="#1C2333" stroke="#2A364F" strokeWidth="2" />
                <text x="500" y="308" textAnchor="middle" fill="#8B949E" fontSize="9" fontFamily="Inter" stroke="none">{appData.transitive[1]}</text>
                <text x="500" y="319" textAnchor="middle" fill="#5B6878" fontSize="7" fontFamily="JetBrains Mono" stroke="none">v2.1.4</text>
              </g>
              <g className="node-transitive">
                <circle cx="630" cy="300" r="24" fill="#1C2333" stroke="#2A364F" strokeWidth="2" />
                <text x="630" y="298" textAnchor="middle" fill="#8B949E" fontSize="9" fontFamily="Inter" stroke="none">{appData.transitive[2]}</text>
                <text x="630" y="309" textAnchor="middle" fill="#5B6878" fontSize="7" fontFamily="JetBrains Mono" stroke="none">v0.8.1</text>
              </g>
              <g className="node-transitive">
                <circle cx="780" cy="320" r="24" fill="#1C2333" stroke="#2A364F" strokeWidth="2" />
                <text x="780" y="318" textAnchor="middle" fill="#8B949E" fontSize="9" fontFamily="Inter" stroke="none">{appData.transitive[3]}</text>
                <text x="780" y="329" textAnchor="middle" fill="#5B6878" fontSize="7" fontFamily="JetBrains Mono" stroke="none">v1.0.0</text>
              </g>

              {/* Compromise badge floating below vulnerable node */}
              <g className="compromise-badge" transform="translate(140, 355)">
                <rect width="170" height="24" rx="5" fill="#FF5D5D" fillOpacity="0.25" stroke="#FF5D5D" strokeWidth="1" />
                <text x="85" y="16" textAnchor="middle" fill="#FF5D5D" fontSize="9" fontWeight="700" fontFamily="JetBrains Mono">{appData.vuln.cve} (KEV)</text>
              </g>
            </svg>

            {/* Graph Legend */}
            <div className="pt-4 border-t border-[#1C2333] w-full flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-[#8B949E]">
              <span className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-[#3DDC97] shadow-glow-green"></span>
                <span>Root Microservice</span>
              </span>
              <span className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-[#4D96FF]"></span>
                <span>Direct Manifest Dependency</span>
              </span>
              <span className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-[#F5A623]"></span>
                <span>Transitive Cascade</span>
              </span>
              <span className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-[#FF5D5D] animate-pulse"></span>
                <span>Breached CVE Path</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};


