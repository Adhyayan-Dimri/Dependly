import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  ShieldAlert, 
  Flame, 
  Layers, 
  Compass, 
  ArrowRight, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle,
  Zap,
  Terminal,
  FileText
} from 'lucide-react';
import { SimulationResponse, ExecutionType, ApplicationSummary } from '../types';
import { api } from '../services/api';

interface WarRoomProps {
  initialPackageId?: string;
  applications: ApplicationSummary[];
  onOpenRiskReport: (packageId: string) => void;
}

export const WarRoom: React.FC<WarRoomProps> = ({
  initialPackageId,
  applications,
  onOpenRiskReport
}) => {
  const [selectedPkgId, setSelectedPkgId] = useState<string>(
    initialPackageId || '6aa6b17cac30621f3b833aa6' // default to lodash
  );
  const [executionType, setExecutionType] = useState<ExecutionType>('install_time');
  const [simulationResult, setSimulationResult] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isSimulatingWave, setIsSimulatingWave] = useState<boolean>(false);
  const [isPatched, setIsPatched] = useState<boolean>(false);

  // Quick preset targets for judge demo
  const demoTargets = [
    { id: '6aa6b17cac30621f3b833aa6', name: 'lodash@4.17.15', cve: 'CVE-2019-10744 (KEV)', type: 'Prototype Pollution' },
    { id: '6aa6b18c3b1930220947b459', name: 'jsonwebtoken@8.5.1', cve: 'CVE-2022-23529 (KEV)', type: 'RCE Key Bypass' },
    { id: '6aa6b18c3b1930220947b461', name: 'urllib3@1.26.4', cve: 'CVE-2021-33503 (KEV)', type: 'Catastrophic ReDoS' },
  ];

  // Run simulation
  const handleRunSimulation = async (pkgId: string = selectedPkgId, execType: ExecutionType = executionType) => {
    setLoading(true);
    setIsPatched(false);
    setIsSimulatingWave(true);
    setActiveStep(0);

    try {
      const res = await api.simulateCompromise(pkgId, execType);
      setSimulationResult(res);
      setLoading(false);

      // Animate wave step-by-step
      const totalSteps = res.propagation_paths.length || 3;
      for (let i = 1; i <= totalSteps; i++) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        setActiveStep(i);
      }
      setIsSimulatingWave(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
      setIsSimulatingWave(false);
    }
  };

  useEffect(() => {
    handleRunSimulation(selectedPkgId, executionType);
  }, [selectedPkgId, executionType]);

  // Live "Simulate Fix" action
  const handleSimulateFix = () => {
    setIsPatched(true);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#3DDC97', '#4D96FF', '#E6EDF3']
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* War Room Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#1C2333] pb-6 gap-4">
        <div>
          <div className="flex items-center space-x-2 font-mono text-xs text-[#FF5D5D] mb-1">
            <ShieldAlert className="w-4 h-4 animate-pulse" />
            <span>WAR ROOM &bull; COMPROMISE PROPAGATION ENGINE</span>
          </div>
          <h2 className="text-3xl font-extrabold text-[#E6EDF3] tracking-tight">
            Version-Filtered Blast Radius Engine
          </h2>
          <p className="text-sm text-[#8B949E] mt-1">
            Model how a supply chain compromise in an open-source dependency infects upstream applications through transitive dependency trees.
          </p>
        </div>

        {/* Execution Type Selector */}
        <div className="flex items-center space-x-2 bg-[#1C2333] p-1.5 rounded-xl border border-[#2A364F]">
          <span className="text-[11px] font-mono text-[#8B949E] px-2">EXECUTION:</span>
          <button
            onClick={() => setExecutionType('install_time')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              executionType === 'install_time'
                ? 'bg-[#FF5D5D] text-[#0A0E14] font-bold shadow-glow-red'
                : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            Install-Time
          </button>
          <button
            onClick={() => setExecutionType('runtime')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              executionType === 'runtime'
                ? 'bg-[#F5A623] text-[#0A0E14] font-bold shadow-glow-amber'
                : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            Runtime
          </button>
        </div>
      </div>

      {/* Target Package Selector & Demo Presets */}
      <div className="bg-[#1C2333]/90 border border-[#2A364F] rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <label className="font-mono text-xs text-[#8B949E] uppercase">Select Compromise Injection Target:</label>
          <span className="font-mono text-[11px] text-[#3DDC97]">Seeded with Real Citable CVEs</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {demoTargets.map((target) => (
            <button
              key={target.id}
              onClick={() => setSelectedPkgId(target.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedPkgId === target.id
                  ? 'bg-[#FF5D5D]/15 border-[#FF5D5D] shadow-glow-red'
                  : 'bg-[#141B26] border-[#2A364F] hover:border-[#4D96FF]'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="font-mono font-bold text-sm text-[#E6EDF3]">{target.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FF5D5D]/20 text-[#FF5D5D] font-bold">
                  {target.cve}
                </span>
              </div>
              <div className="mt-2 text-xs text-[#8B949E] font-mono">
                {target.type}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Blast Radius Dashboard */}
      {simulationResult && (
        <div className="space-y-6">
          {/* 4 Core Blast Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`border rounded-xl p-5 transition-all ${
              isPatched ? 'bg-[#3DDC97]/10 border-[#3DDC97]' : 'bg-[#FF5D5D]/10 border-[#FF5D5D]/50'
            }`}>
              <div className="flex justify-between items-center text-xs font-mono text-[#8B949E]">
                <span>BLAST RADIUS</span>
                <Layers className="w-4 h-4 text-[#FF5D5D]" />
              </div>
              <div className="mt-3 flex items-baseline space-x-2">
                <span className={`font-mono text-3xl font-bold ${isPatched ? 'text-[#3DDC97]' : 'text-[#FF5D5D]'}`}>
                  {isPatched ? 0 : simulationResult.blast_radius}
                </span>
                <span className="text-xs text-[#8B949E] font-mono">Affected Nodes</span>
              </div>
              <div className="mt-1 text-[11px] text-[#8B949E] font-mono">
                {isPatched ? 'Threat neutralized' : `${simulationResult.affected_packages.length} pkgs + ${simulationResult.affected_applications.length} apps`}
              </div>
            </div>

            <div className={`border rounded-xl p-5 transition-all ${
              isPatched ? 'bg-[#1C2333] border-[#2A364F]' : 'bg-[#FF5D5D]/10 border-[#FF5D5D]/50'
            }`}>
              <div className="flex justify-between items-center text-xs font-mono text-[#8B949E]">
                <span>CUSTOMER-FACING APPS</span>
                <ShieldAlert className="w-4 h-4 text-[#FF5D5D]" />
              </div>
              <div className="mt-3 flex items-baseline space-x-2">
                <span className={`font-mono text-3xl font-bold ${isPatched ? 'text-[#3DDC97]' : 'text-[#FF5D5D]'}`}>
                  {isPatched ? 0 : simulationResult.customer_facing_apps_count}
                </span>
                <span className="text-xs text-[#FF5D5D] font-mono font-bold">HIGH SEVERITY</span>
              </div>
              <div className="mt-1 text-[11px] text-[#8B949E] font-mono">
                Direct external exposure
              </div>
            </div>

            <div className="bg-[#1C2333] border border-[#2A364F] rounded-xl p-5">
              <div className="flex justify-between items-center text-xs font-mono text-[#8B949E]">
                <span>MAX PROPAGATION DEPTH</span>
                <Compass className="w-4 h-4 text-[#F5A623]" />
              </div>
              <div className="mt-3 flex items-baseline space-x-2">
                <span className="font-mono text-3xl font-bold text-[#F5A623]">
                  {simulationResult.max_depth}
                </span>
                <span className="text-xs text-[#8B949E] font-mono">Hops</span>
              </div>
              <div className="mt-1 text-[11px] text-[#8B949E] font-mono">
                Transitive tier distance
              </div>
            </div>

            <div className={`border rounded-xl p-5 transition-all ${
              isPatched ? 'bg-[#3DDC97]/10 border-[#3DDC97]' : 'bg-[#1C2333] border-[#2A364F]'
            }`}>
              <div className="flex justify-between items-center text-xs font-mono text-[#8B949E]">
                <span>ENVIRONMENT ISOLATION</span>
                <Zap className={`w-4 h-4 ${executionType === 'runtime' ? 'text-[#FF5D5D]' : 'text-[#F5A623]'}`} />
              </div>
              <div className="mt-3 flex items-baseline space-x-2">
                <span className={`font-mono text-xl font-bold ${executionType === 'runtime' ? 'text-[#FF5D5D]' : 'text-[#F5A623]'}`}>
                  {executionType === 'runtime' ? 'Runtime Service' : 'Build-Time Isolated'}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-[#8B949E] font-mono">
                {executionType === 'runtime' ? 'Live production HTTP server' : 'Dev dependency build container'}
              </div>
            </div>
          </div>

          {/* Fix Action Banner */}
          <div className="bg-[#141B26] border border-[#2A364F] rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-[#3DDC97]/15 border border-[#3DDC97]/40 text-[#3DDC97]">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-[#E6EDF3] text-sm font-mono">Simulate Remediation Patch</h4>
                <p className="text-xs text-[#8B949E]">
                  Test upgrading {simulationResult.compromised_package_name} to safe version and observe real-time blast radius collapse.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => onOpenRiskReport(selectedPkgId)}
                className="px-4 py-2 rounded-xl bg-[#1C2333] border border-[#2A364F] hover:border-[#4D96FF] text-[#E6EDF3] font-mono text-xs transition-all flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>Explainable AI Report</span>
              </button>

              <button
                onClick={handleSimulateFix}
                className="px-4 py-2 rounded-xl bg-[#3DDC97] text-[#0A0E14] font-mono text-xs font-bold hover:bg-[#3DDC97]/90 transition-all shadow-glow-green flex items-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Apply Simulation Patch</span>
              </button>
            </div>
          </div>

          {/* Sequential Propagation Path Inspector */}
          <div className="bg-[#1C2333]/80 border border-[#2A364F] rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#2A364F] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#E6EDF3]">Hop-by-Hop Propagation Paths</h3>
                <p className="text-xs text-[#8B949E]">
                  Traced NetworkX simple paths connecting {simulationResult.compromised_package_name} to reachable applications
                </p>
              </div>
              <span className="text-xs font-mono text-[#8B949E]">
                {simulationResult.propagation_paths.length} Active Infection Vector(s)
              </span>
            </div>

            <div className="space-y-3">
              {simulationResult.propagation_paths.map((pathItem, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-all ${
                    isPatched
                      ? 'bg-[#141B26] border-[#3DDC97]/40 opacity-75'
                      : 'bg-[#141B26] border-[#2A364F] hover:border-[#FF5D5D]/60'
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-mono text-xs text-[#8B949E]">VECTOR #{idx + 1} ({pathItem.depth} HOPS)</span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      pathItem.is_customer_facing
                        ? 'bg-[#FF5D5D]/20 text-[#FF5D5D] border border-[#FF5D5D]/40'
                        : 'bg-[#4D96FF]/20 text-[#4D96FF] border border-[#4D96FF]/40'
                    }`}>
                      TERMINATES AT: {pathItem.target_app_name}
                    </span>
                  </div>

                  {/* Flow Steps */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
                    {pathItem.path_names.map((nodeName, stepIdx) => (
                      <React.Fragment key={stepIdx}>
                        <div className={`px-3 py-1.5 rounded-lg border font-mono text-xs flex items-center space-x-1.5 ${
                          stepIdx === 0
                            ? 'bg-[#FF5D5D]/20 border-[#FF5D5D] text-[#FF5D5D] font-bold'
                            : stepIdx === pathItem.path_names.length - 1
                            ? 'bg-[#3DDC97]/15 border-[#3DDC97] text-[#3DDC97] font-bold'
                            : 'bg-[#1C2333] border-[#2A364F] text-[#E6EDF3]'
                        }`}>
                          <span>{nodeName}</span>
                        </div>

                        {stepIdx < pathItem.path_names.length - 1 && (
                          <ArrowRight className="w-3.5 h-3.5 text-[#8B949E]" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
