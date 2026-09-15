import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
// @ts-ignore
import dagre from 'cytoscape-dagre';
import { 
  Search, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  ShieldAlert, 
  FileText, 
  Flame, 
  Activity, 
  X, 
  Award, 
  Zap, 
  Compass, 
  Crosshair, 
  Box, 
  Radio, 
  Sliders, 
  CheckCircle2, 
  Layers
} from 'lucide-react';
import { ApplicationSummary, GraphResponse, CytoscapeNodeData } from '../types';
import { api } from '../services/api';

// Register dagre layout
cytoscape.use(dagre);

interface DependencyExplorerProps {
  applications: ApplicationSummary[];
  selectedAppId: string;
  onSelectApp: (appId: string) => void;
  onOpenWarRoom: (packageId: string) => void;
  onOpenRiskReport: (packageId: string) => void;
}

interface Particle {
  sourcePos: { x: number; y: number };
  targetPos: { x: number; y: number };
  progress: number;
  speed: number;
  color: string;
  size: number;
}

export const DependencyExplorer: React.FC<DependencyExplorerProps> = ({
  applications,
  selectedAppId,
  onSelectApp,
  onOpenWarRoom,
  onOpenRiskReport
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  const [graphData, setGraphData] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'high' | 'low'>('all');
  const [maxDepth, setMaxDepth] = useState<number>(3);
  const [selectedNode, setSelectedNode] = useState<CytoscapeNodeData | null>(null);
  
  // Real-time Viewport & Layout Controls
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [panCoords, setPanCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [layoutMode, setLayoutMode] = useState<'dagre' | 'concentric' | 'cose' | 'circle'>('dagre');
  const [heatmapMode, setHeatmapMode] = useState<boolean>(false);
  const [is3DTilt, setIs3DTilt] = useState<boolean>(false);
  const [activeShockwave, setActiveShockwave] = useState<{ x: number; y: number; r: number } | null>(null);
  
  // Interactive Hover Focus State
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoverTooltip, setHoverTooltip] = useState<{
    x: number;
    y: number;
    name: string;
    version?: string;
    risk_score: number;
    cve_count: number;
    has_kev: boolean;
    connectedCount: number;
    type: string;
  } | null>(null);

  // 3D Tilt perspective effect on cursor move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!is3DTilt || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotateX = (-y / rect.height) * 8;
    const rotateY = (x / rect.width) * 8;

    wrapperRef.current.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const handleMouseLeave = () => {
    if (!wrapperRef.current) return;
    wrapperRef.current.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg)';
  };

  // Fetch graph data when selectedAppId changes
  useEffect(() => {
    if (!selectedAppId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setSelectedNode(null);

    api.getApplicationGraph(selectedAppId)
      .then((data) => {
        if (isMounted) {
          setGraphData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load dependency graph');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedAppId]);

  // Cytoscape Canvas Initialization
  useEffect(() => {
    if (!containerRef.current || !graphData || loading) return;

    // Filter nodes by search, risk, and depth
    const filteredNodes = graphData.nodes.filter(({ data }) => {
      const matchesSearch = data.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            data.label.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (data.type === 'application') return true;

      // Calculate depth from node type (application: 0, direct_dep: 1, transitive_dep: 2)
      const calculatedDepth = data.depth !== undefined 
        ? data.depth 
        : data.type === 'direct_dep' ? 1 : 2;

      if (calculatedDepth > maxDepth) return false;

      if (riskFilter === 'critical') return data.risk_score >= 70 || data.has_kev;
      if (riskFilter === 'high') return data.risk_score >= 45;
      if (riskFilter === 'low') return data.risk_score < 45;
      return true;
    });

    const activeNodeIds = new Set(filteredNodes.map(n => n.data.id));

    const filteredEdges = graphData.edges.filter(({ data }) => {
      return activeNodeIds.has(data.source) && activeNodeIds.has(data.target);
    });

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...filteredNodes, ...filteredEdges],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#1C2333',
            'border-width': 2.5,
            'border-color': '#4D96FF',
            'label': 'data(label)',
            'color': '#E6EDF3',
            'font-family': 'Inter, sans-serif',
            'font-size': '11px',
            'font-weight': 600,
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'width': 42,
            'height': 42,
            'text-outline-color': '#0A0E14',
            'text-outline-width': 2,
            'underlay-shape': 'ellipse',
            'transition-property': 'background-color, border-color, width, height, opacity',
            'transition-duration': 0.25,
          }
        },
        {
          selector: 'node[type = "application"]',
          style: {
            'background-color': '#141B26',
            'border-color': '#3DDC97',
            'border-width': 4,
            'width': 62,
            'height': 62,
            'font-size': '13px',
            'font-weight': 800,
            'underlay-color': '#3DDC97',
            'underlay-padding': 12,
            'underlay-opacity': 0.3,
            'underlay-shape': 'ellipse',
          }
        },
        {
          selector: 'node[risk_score >= 70], node[has_kev = 1]',
          style: {
            'background-color': heatmapMode ? 'rgba(255, 93, 93, 0.45)' : 'rgba(255, 93, 93, 0.25)',
            'border-color': '#FF5D5D',
            'border-width': heatmapMode ? 5 : 3.5,
            'width': heatmapMode ? 54 : 48,
            'height': heatmapMode ? 54 : 48,
            'underlay-color': '#FF5D5D',
            'underlay-padding': heatmapMode ? 28 : 6,
            'underlay-opacity': heatmapMode ? 0.85 : 0.25,
            'underlay-shape': 'ellipse',
            'z-index': heatmapMode ? 999 : 10,
          }
        },
        {
          selector: 'node[risk_score >= 45][risk_score < 70]',
          style: {
            'background-color': heatmapMode ? 'rgba(245, 166, 35, 0.35)' : 'rgba(245, 166, 35, 0.2)',
            'border-color': '#F5A623',
            'border-width': heatmapMode ? 4 : 3,
            'width': heatmapMode ? 48 : 42,
            'height': heatmapMode ? 48 : 42,
            'underlay-color': '#F5A623',
            'underlay-padding': heatmapMode ? 20 : 4,
            'underlay-opacity': heatmapMode ? 0.75 : 0.15,
            'underlay-shape': 'ellipse',
            'z-index': heatmapMode ? 900 : 5,
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#FFFFFF',
            'border-width': 4,
            'underlay-color': '#3DDC97',
            'underlay-padding': 10,
            'underlay-opacity': 0.5,
            'underlay-shape': 'ellipse',
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2.5,
            'line-color': '#2A364F',
            'target-arrow-color': '#2A364F',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.1,
            'opacity': 0.8,
            'transition-property': 'line-color, target-arrow-color, width, opacity',
            'transition-duration': 0.25,
          }
        },
        {
          selector: 'node.dimmed, edge.dimmed',
          style: {
            'opacity': 0.08,
          }
        },
        {
          selector: 'node.hovered-node',
          style: {
            'border-color': '#FFFFFF',
            'border-width': 5,
            'underlay-color': '#3DDC97',
            'underlay-padding': 18,
            'underlay-opacity': 0.75,
            'underlay-shape': 'ellipse',
            'z-index': 9999,
          }
        },
        {
          selector: 'node.hover-neighbor',
          style: {
            'border-color': '#3DDC97',
            'border-width': 4,
            'underlay-color': '#3DDC97',
            'underlay-padding': 10,
            'underlay-opacity': 0.35,
            'underlay-shape': 'ellipse',
            'z-index': 999,
          }
        },
        {
          selector: 'edge.highlighted',
          style: {
            'width': 5,
            'line-color': '#3DDC97',
            'target-arrow-color': '#3DDC97',
            'line-style': 'dashed',
            'line-dash-pattern': [10, 5],
            'arrow-scale': 1.4,
            'opacity': 1,
            'z-index': 9999,
          }
        },
        {
          selector: 'edge.warning-path',
          style: {
            'width': 5.5,
            'line-color': '#F5A623',
            'target-arrow-color': '#F5A623',
            'line-style': 'dashed',
            'line-dash-pattern': [12, 6],
            'arrow-scale': 1.5,
            'opacity': 1,
            'z-index': 9999,
          }
        },
        {
          selector: 'edge.threat-path',
          style: {
            'width': 6,
            'line-color': '#FF5D5D',
            'target-arrow-color': '#FF5D5D',
            'line-style': 'dashed',
            'line-dash-pattern': [14, 7],
            'arrow-scale': 1.6,
            'opacity': 1,
            'z-index': 9999,
          }
        }
      ],
      layout: getLayoutOptions(layoutMode)
    });

    // Hover interactive path highlight & Holographic Cursor Badge
    cy.on('mouseover', 'node', (evt: EventObject) => {
      const node = evt.target;
      const id = node.id();
      setHoveredNodeId(id);

      const connected = node.neighborhood().add(node);
      const data = node.data() as CytoscapeNodeData;
      const renderedPos = node.renderedPosition();

      setHoverTooltip({
        x: renderedPos.x,
        y: renderedPos.y,
        name: data.name || data.label,
        version: data.version,
        risk_score: data.risk_score || 0,
        cve_count: data.vulnerability_count || 0,
        has_kev: !!data.has_kev,
        connectedCount: node.connectedEdges().length,
        type: data.type
      });

      cy.elements().addClass('dimmed');
      connected.removeClass('dimmed');

      node.addClass('hovered-node');
      node.neighborhood('node').addClass('hover-neighbor');

      node.connectedEdges().forEach((edge: any) => {
        const edgeTargetRisk = edge.target().data('risk_score') || 0;
        const edgeSourceRisk = edge.source().data('risk_score') || 0;
        const maxRisk = Math.max(edgeTargetRisk, edgeSourceRisk);

        if (maxRisk >= 70 || edge.source().data('has_kev') || edge.target().data('has_kev')) {
          edge.addClass('threat-path');
        } else if (maxRisk >= 45) {
          edge.addClass('warning-path');
        } else {
          edge.addClass('highlighted');
        }
      });
    });

    cy.on('mouseout', 'node', () => {
      setHoveredNodeId(null);
      setHoverTooltip(null);
      cy.elements().removeClass('dimmed').removeClass('hovered-node').removeClass('hover-neighbor');
      cy.edges().removeClass('highlighted').removeClass('threat-path').removeClass('warning-path');
    });

    // Node click handler
    cy.on('tap', 'node', (evt: EventObject) => {
      const node = evt.target;
      const data = node.data() as CytoscapeNodeData;
      setSelectedNode(data);

      // Trigger ripple shockwave effect at node position
      const renderedPos = node.renderedPosition();
      setActiveShockwave({ x: renderedPos.x, y: renderedPos.y, r: 10 });

      const neighborhood = node.neighborhood().add(node);
      cy.animate({
        fit: {
          eles: neighborhood,
          padding: 100,
        },
        duration: 500,
        easing: 'ease-in-out-cubic'
      });
    });

    cy.on('tap', (evt: EventObject) => {
      if (evt.target === cy) {
        setSelectedNode(null);
      }
    });

    // Viewport zoom & pan listener
    cy.on('zoom pan', () => {
      setZoomLevel(Math.round(cy.zoom() * 100));
      const p = cy.pan();
      setPanCoords({ x: Math.round(p.x), y: Math.round(p.y) });
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [graphData, searchQuery, riskFilter, maxDepth, layoutMode, heatmapMode, loading]);

  // Canvas Particle Animation Loop (Flowing energy packets along edges)
  useEffect(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas || !cyRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particles: Particle[] = [];

    const resizeCanvas = () => {
      if (canvas && containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle generator loop
    const generateParticles = () => {
      if (!cyRef.current) return;

      // High-frequency laser burst stream for hovered node
      if (hoveredNodeId) {
        const hoveredNode = cyRef.current.getElementById(hoveredNodeId);
        if (hoveredNode && hoveredNode.length > 0) {
          const connectedEdges = hoveredNode.connectedEdges();
          if (connectedEdges.length > 0 && particles.length < 50) {
            const edge = connectedEdges[Math.floor(Math.random() * connectedEdges.length)];
            const sourcePos = edge.source().renderedPosition();
            const targetPos = edge.target().renderedPosition();
            const maxRisk = Math.max(
              edge.source().data('risk_score') || 0,
              edge.target().data('risk_score') || 0
            );

            const isCritical = maxRisk >= 70 || edge.source().data('has_kev') || edge.target().data('has_kev');

            particles.push({
              sourcePos: { x: sourcePos.x, y: sourcePos.y },
              targetPos: { x: targetPos.x, y: targetPos.y },
              progress: 0,
              speed: 0.02 + Math.random() * 0.02,
              color: isCritical ? '#FF5D5D' : '#3DDC97',
              size: isCritical ? 5 : 4,
            });
          }
        }
      }

      // Background ambient energy particles
      const edges = cyRef.current.edges();
      if (edges.length === 0) return;

      if (particles.length < 35) {
        const randomEdge = edges[Math.floor(Math.random() * edges.length)];
        const sourcePos = randomEdge.source().renderedPosition();
        const targetPos = randomEdge.target().renderedPosition();
        const isCritical = randomEdge.source().data('risk_score') >= 70 || randomEdge.source().data('has_kev');

        particles.push({
          sourcePos: { x: sourcePos.x, y: sourcePos.y },
          targetPos: { x: targetPos.x, y: targetPos.y },
          progress: 0,
          speed: 0.008 + Math.random() * 0.012,
          color: isCritical ? '#FF5D5D' : '#3DDC97',
          size: isCritical ? 4 : 3,
        });
      }
    };

    const renderLoop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      generateParticles();

      // Render shockwave pulse if active
      if (activeShockwave) {
        ctx.beginPath();
        ctx.arc(activeShockwave.x, activeShockwave.y, activeShockwave.r, 0, Math.PI * 2);
        ctx.strokeStyle = '#FF5D5D';
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = Math.max(0, 1 - activeShockwave.r / 120);
        ctx.stroke();
        ctx.globalAlpha = 1;

        activeShockwave.r += 3;
        if (activeShockwave.r > 120) {
          setActiveShockwave(null);
        }
      }

      // Render Radar Heatmap threat beacons when Heatmap Mode is enabled
      if (heatmapMode && cyRef.current) {
        const threatNodes = cyRef.current.nodes('[risk_score >= 45], [has_kev = 1]');
        const time = Date.now() * 0.003;
        
        threatNodes.forEach((node: any) => {
          const pos = node.renderedPosition();
          const risk = node.data('risk_score') || 0;
          const isCritical = risk >= 70 || node.data('has_kev');
          const color = isCritical ? '#FF5D5D' : '#F5A623';
          
          const pulseRadius = (isCritical ? 35 : 24) + Math.sin(time + pos.x) * 10;
          
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.lineWidth = isCritical ? 2.5 : 1.5;
          ctx.globalAlpha = 0.65 + Math.sin(time + pos.y) * 0.25;
          ctx.stroke();
          ctx.globalAlpha = 1;
        });
      }

      // Render flowing edge particles
      particles.forEach((p, idx) => {
        p.progress += p.speed;
        if (p.progress >= 1) {
          particles.splice(idx, 1);
          return;
        }

        const currX = p.sourcePos.x + (p.targetPos.x - p.sourcePos.x) * p.progress;
        const currY = p.sourcePos.y + (p.targetPos.y - p.sourcePos.y) * p.progress;

        ctx.beginPath();
        ctx.arc(currX, currY, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [graphData, activeShockwave, heatmapMode, hoveredNodeId]);

  // Dedicated Layout Configuration Builder
  const getLayoutOptions = (mode: 'dagre' | 'concentric' | 'cose' | 'circle') => {
    switch (mode) {
      case 'dagre':
        return {
          name: 'dagre',
          // @ts-ignore
          rankDir: 'TB',
          nodeSep: 90,
          rankSep: 110,
          padding: 60,
          animate: true,
          animationDuration: 700,
        };
      case 'concentric':
        return {
          name: 'concentric',
          concentric: (node: any) => {
            const type = node.data('type');
            if (type === 'application') return 100;
            if (type === 'direct_dep') return 60;
            return 20;
          },
          levelWidth: () => 30,
          minNodeSpacing: 65,
          startAngle: (3 * Math.PI) / 2,
          sweep: Math.PI * 2,
          clockwise: true,
          padding: 60,
          animate: true,
          animationDuration: 750,
        };
      case 'cose':
        return {
          name: 'cose',
          idealEdgeLength: () => 110,
          nodeOverlap: 20,
          refresh: 20,
          fit: true,
          padding: 60,
          randomize: false,
          componentSpacing: 100,
          nodeRepulsion: () => 450000,
          edgeElasticity: () => 100,
          nestingFactor: 5,
          gravity: 80,
          numIter: 1000,
          initialTemp: 200,
          coolingFactor: 0.95,
          animate: true,
          animationDuration: 850,
        };
      case 'circle':
        return {
          name: 'breadthfirst',
          directed: true,
          circle: true,
          spacingFactor: 1.5,
          padding: 60,
          animate: true,
          animationDuration: 750,
        };
    }
  };

  // Layout Switcher
  const handleLayoutChange = (mode: 'dagre' | 'concentric' | 'cose' | 'circle') => {
    setLayoutMode(mode);
    if (cyRef.current) {
      cyRef.current.layout(getLayoutOptions(mode)).run();
    }
  };

  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => cyRef.current?.fit(undefined, 50);
  const handleReset = () => {
    handleLayoutChange('dagre');
    cyRef.current?.fit(undefined, 50);
  };

  const handleFocusRoot = () => {
    if (!cyRef.current) return;
    const rootNode = cyRef.current.nodes('[type = "application"]');
    if (rootNode.length > 0) {
      cyRef.current.animate({
        center: { eles: rootNode },
        zoom: 1.2,
        duration: 600
      });
    }
  };

  const handleFocusCritical = () => {
    if (!cyRef.current) return;
    const criticalNodes = cyRef.current.nodes('[risk_score >= 70], [has_kev = 1]');
    if (criticalNodes.length > 0) {
      cyRef.current.animate({
        fit: { eles: criticalNodes, padding: 100 },
        duration: 650,
        easing: 'ease-in-out-cubic'
      });
    } else {
      cyRef.current.fit(undefined, 50);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-70px)] bg-[#0A0E14] overflow-hidden flex flex-col select-none">
      {/* Top Holographic Control Bar */}
      <div className="z-20 bg-[#141B26]/90 border-b border-[#1C2333] px-6 py-3 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md">
        {/* App Selector & 3D Toggle */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-[#1C2333] border border-[#2A364F] px-3 py-1.5 rounded-xl text-xs font-mono text-[#E6EDF3]">
            <Box className="w-3.5 h-3.5 text-[#3DDC97]" />
            <select
              value={selectedAppId}
              onChange={(e) => onSelectApp(e.target.value)}
              className="bg-transparent text-[#E6EDF3] focus:outline-none cursor-pointer"
            >
              {applications.map((app) => (
                <option key={app.id} value={app.id} className="bg-[#141B26]">
                  {app.name} ({app.criticality_tag})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Layout Switcher */}
        <div className="flex items-center space-x-1 bg-[#1C2333] p-1 rounded-xl border border-[#2A364F] font-mono text-xs">
          <span className="text-[10px] text-[#5B6878] px-2 font-bold uppercase">LAYOUT:</span>
          <button
            onClick={() => handleLayoutChange('dagre')}
            className={`px-2.5 py-1 rounded-lg transition-all text-[11px] ${
              layoutMode === 'dagre' ? 'bg-[#3DDC97] text-[#0A0E14] font-bold shadow-glow-green' : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            Tree
          </button>
          <button
            onClick={() => handleLayoutChange('concentric')}
            className={`px-2.5 py-1 rounded-lg transition-all text-[11px] ${
              layoutMode === 'concentric' ? 'bg-[#4D96FF] text-[#0A0E14] font-bold shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            Orbits
          </button>
          <button
            onClick={() => handleLayoutChange('cose')}
            className={`px-2.5 py-1 rounded-lg transition-all text-[11px] ${
              layoutMode === 'cose' ? 'bg-[#F5A623] text-[#0A0E14] font-bold shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            Physics
          </button>
          <button
            onClick={() => handleLayoutChange('circle')}
            className={`px-2.5 py-1 rounded-lg transition-all text-[11px] ${
              layoutMode === 'circle' ? 'bg-[#3DDC97] text-[#0A0E14] font-bold shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            Cluster
          </button>
        </div>

        {/* Depth Filter & Search */}
        <div className="flex items-center space-x-3 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#8B949E]" />
            <input
              type="text"
              placeholder="Search package name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1C2333] border border-[#2A364F] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#E6EDF3] placeholder-[#5B6878] font-mono focus:outline-none focus:border-[#3DDC97]"
            />
          </div>

          {/* Graph Depth Toggle Buttons */}
          <div className="hidden sm:flex items-center space-x-1 bg-[#1C2333] border border-[#2A364F] p-1 rounded-xl font-mono text-xs">
            <span className="text-[10px] text-[#5B6878] px-1 font-bold uppercase">DEPTH:</span>
            <button
              onClick={() => setMaxDepth(1)}
              className={`px-2 py-0.5 rounded text-[11px] transition-all ${
                maxDepth === 1 ? 'bg-[#4D96FF] text-[#0A0E14] font-bold shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              1 Direct
            </button>
            <button
              onClick={() => setMaxDepth(2)}
              className={`px-2 py-0.5 rounded text-[11px] transition-all ${
                maxDepth === 2 ? 'bg-[#F5A623] text-[#0A0E14] font-bold shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              2 Transitive
            </button>
            <button
              onClick={() => setMaxDepth(5)}
              className={`px-2 py-0.5 rounded text-[11px] transition-all ${
                maxDepth >= 3 ? 'bg-[#3DDC97] text-[#0A0E14] font-bold shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Radar Heatmap & Canvas Navigation Buttons */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <button
            onClick={() => setHeatmapMode(!heatmapMode)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center space-x-1.5 ${
              heatmapMode
                ? 'bg-[#FF5D5D]/20 border-[#FF5D5D] text-[#FF5D5D] shadow-glow-red animate-pulse'
                : 'bg-[#1C2333] border-[#2A364F] text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Radar Heatmap</span>
          </button>

          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-2 rounded-xl bg-[#1C2333] border border-[#2A364F] text-[#8B949E] hover:text-[#E6EDF3] hover:border-[#3DDC97] transition-all"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-2 rounded-xl bg-[#1C2333] border border-[#2A364F] text-[#8B949E] hover:text-[#E6EDF3] hover:border-[#3DDC97] transition-all"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleFit}
            title="Fit Canvas"
            className="p-2 rounded-xl bg-[#1C2333] border border-[#2A364F] text-[#8B949E] hover:text-[#E6EDF3] hover:border-[#3DDC97] transition-all"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Full-Bleed 3D Tilt Viewport Canvas */}
      <div 
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative flex-1 w-full h-full bg-[#0A0E14] overflow-hidden"
      >
        {/* Animated Cyber Grid & Radar Backdrop */}
        <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-25 animate-pulse"></div>
        <div className="absolute inset-0 bg-radial-gradient pointer-events-none"></div>

        {/* Ambient Center Radar Rings SVG in Canvas Background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <svg className="w-[850px] h-[850px]">
            <circle cx="425" cy="425" r="400" fill="none" stroke="#3DDC97" strokeWidth="1" strokeDasharray="14 7" className="animate-spin-slow" />
            <circle cx="425" cy="425" r="290" fill="none" stroke="#4D96FF" strokeWidth="1" strokeDasharray="10 5" className="animate-spin-reverse" />
            <circle cx="425" cy="425" r="180" fill="none" stroke="#FF5D5D" strokeWidth="0.8" strokeDasharray="6 3" />
            <circle cx="425" cy="425" r="90" fill="none" stroke="#3DDC97" strokeWidth="0.5" />
          </svg>
        </div>

        {/* REAL-TIME SCROLL & VIEWPORT TELEMETRY HUD BAR (Top Center) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-[#141B26]/90 border border-[#2A364F] rounded-full px-5 py-2 backdrop-blur-md font-sans text-xs text-[#8B949E] flex items-center space-x-4 shadow-2xl pointer-events-auto">
          <span className="flex items-center space-x-1.5 text-[#3DDC97]">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span className="font-bold">Viewport: {zoomLevel}%</span>
          </span>
          <span className="hidden sm:inline text-[#5B6878]">|</span>
          <span className="hidden sm:inline text-[#E6EDF3]">Position: ({panCoords.x}, {panCoords.y})</span>
          <span className="text-[#5B6878]">|</span>
          <button
            onClick={handleFocusRoot}
            className="px-2.5 py-0.5 rounded-lg bg-[#3DDC97]/20 border border-[#3DDC97]/50 text-[#3DDC97] hover:bg-[#3DDC97]/30 font-bold transition-all text-[11px]"
          >
            Root App
          </button>
          <button
            onClick={handleFocusCritical}
            className="px-2.5 py-0.5 rounded-lg bg-[#FF5D5D]/20 border border-[#FF5D5D]/50 text-[#FF5D5D] hover:bg-[#FF5D5D]/30 font-bold transition-all text-[11px] flex items-center space-x-1"
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Focus Threats</span>
          </button>
        </div>

        {/* TOP-RIGHT LIVE GRAPH STATS PANEL */}
        <div className="absolute top-4 right-6 z-20 hidden lg:flex flex-col space-y-1.5 bg-[#141B26]/85 border border-[#2A364F] rounded-2xl p-3.5 backdrop-blur-md font-mono text-[11px] text-[#8B949E] pointer-events-none shadow-2xl">
          <div className="text-[#3DDC97] font-bold flex items-center justify-between space-x-6">
            <span>TOTAL GRAPH NODES:</span>
            <span className="text-[#E6EDF3]">{graphData?.nodes.length || 0}</span>
          </div>
          <div className="text-[#4D96FF] font-bold flex items-center justify-between space-x-6">
            <span>ACTIVE DEPENDENCY EDGES:</span>
            <span className="text-[#E6EDF3]">{graphData?.edges.length || 0}</span>
          </div>
          <div className="text-[#FF5D5D] font-bold flex items-center justify-between space-x-6">
            <span>CRITICAL CVE VECTORS:</span>
            <span className="text-[#FF5D5D]">
              {graphData?.nodes.filter(n => n.data.risk_score >= 70 || n.data.has_kev).length || 0}
            </span>
          </div>
        </div>

        {loading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0A0E14]/85 backdrop-blur-md">
            <div className="w-14 h-14 rounded-full border-3 border-[#3DDC97] border-t-transparent animate-spin mb-4 shadow-glow-green"></div>
            <p className="font-mono text-xs text-[#3DDC97] tracking-widest uppercase font-bold">Assembling Cytoscape 3D Matrix...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center">
            <ShieldAlert className="w-12 h-12 text-[#FF5D5D] mb-3 animate-bounce" />
            <h4 className="text-xl font-bold text-[#E6EDF3]">Graph Resolution Failed</h4>
            <p className="text-xs text-[#8B949E] max-w-md mt-1">{error}</p>
          </div>
        )}

        {/* 3D Transform Wrapper Card */}
        <div ref={wrapperRef} className="w-full h-full transition-transform duration-200 ease-out transform-gpu">
          {/* Flowing Energy Packet Overlay Canvas */}
          <canvas ref={particleCanvasRef} className="absolute inset-0 pointer-events-none z-10 w-full h-full" />

          {/* Cytoscape Container Element */}
          <div ref={containerRef} className="w-full h-full relative z-0" />
        </div>

        {/* DYNAMIC FLOATING HOVER HUD CARD TOOLTIP */}
        {hoverTooltip && (
          <div 
            style={{ 
              left: `${hoverTooltip.x + 20}px`, 
              top: `${hoverTooltip.y - 30}px` 
            }} 
            className="absolute z-40 pointer-events-none bg-[#141B26]/95 border-2 border-[#3DDC97] rounded-xl px-4 py-2.5 shadow-2xl backdrop-blur-xl font-mono text-xs animate-in fade-in zoom-in-95 duration-150 max-w-xs"
          >
            <div className="flex items-center space-x-2 pb-1 border-b border-[#2A364F]">
              <Zap className="w-3.5 h-3.5 text-[#3DDC97] animate-pulse" />
              <span className="font-bold text-[#E6EDF3] truncate">{hoverTooltip.name}</span>
              {hoverTooltip.version && (
                <span className="text-[10px] text-[#8B949E]">v{hoverTooltip.version}</span>
              )}
            </div>

            <div className="pt-2 space-y-1 text-[11px]">
              <div className="flex justify-between items-center space-x-4">
                <span className="text-[#8B949E]">Connected Edges:</span>
                <span className="font-bold text-[#4D96FF]">{hoverTooltip.connectedCount} active paths</span>
              </div>

              {hoverTooltip.type !== 'application' && (
                <div className="flex justify-between items-center space-x-4">
                  <span className="text-[#8B949E]">Risk Index:</span>
                  <span className={`font-extrabold ${
                    hoverTooltip.risk_score >= 70 ? 'text-[#FF5D5D]' : 'text-[#3DDC97]'
                  }`}>
                    {hoverTooltip.risk_score.toFixed(1)} / 100
                  </span>
                </div>
              )}

              {hoverTooltip.has_kev && (
                <div className="mt-1 text-[10px] text-[#FF5D5D] font-bold flex items-center space-x-1">
                  <Flame className="w-3 h-3" />
                  <span>CISA KEV EXPLOIT ACTIVE</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Graph Legend Overlay */}
        <div className="absolute bottom-6 left-6 z-20 bg-[#141B26]/90 border border-[#2A364F] rounded-2xl p-4 backdrop-blur-md font-mono text-[11px] space-y-2 shadow-2xl">
          <div className="text-[#8B949E] uppercase text-[10px] font-bold tracking-wider mb-2 flex items-center justify-between">
            <span>Topology Legend</span>
            <Radio className="w-3 h-3 text-[#3DDC97] animate-pulse" />
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-[#3DDC97] bg-[#141B26] shadow-glow-green"></span>
            <span className="text-[#E6EDF3] font-bold">Application Root</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-[#4D96FF] bg-[#1C2333]"></span>
            <span className="text-[#8B949E]">Direct Dependency</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-[#F5A623] bg-[#1C2333]"></span>
            <span className="text-[#8B949E]">Transitive (Medium Risk)</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-[#FF5D5D] bg-[#FF5D5D]/25 shadow-glow-red"></span>
            <span className="text-[#FF5D5D] font-extrabold">Critical / CISA KEV Exploited</span>
          </div>
        </div>

        {/* Node Detail Inspector Drawer */}
        {selectedNode && (
          <div className="absolute top-6 right-6 z-30 w-96 bg-[#141B26]/95 border-2 border-[#2A364F] rounded-2xl p-6 shadow-2xl backdrop-blur-2xl animate-in slide-in-from-right duration-250">
            <div className="flex justify-between items-start pb-4 border-b border-[#2A364F]">
              <div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#2A364F] text-[#8B949E]">
                  {selectedNode.type.replace('_', ' ')}
                </span>
                <h3 className="text-xl font-extrabold text-[#E6EDF3] mt-1 font-mono tracking-tight">
                  {selectedNode.name}
                </h3>
                {selectedNode.version && (
                  <span className="text-xs text-[#8B949E] font-mono">
                    v{selectedNode.version} ({selectedNode.ecosystem})
                  </span>
                )}
              </div>

              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-lg text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#1C2333]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If package node */}
            {selectedNode.type !== 'application' ? (
              <div className="mt-4 space-y-4 font-mono text-xs">
                {/* Risk Score */}
                <div className="flex justify-between items-center bg-[#1C2333] p-3.5 rounded-xl border border-[#2A364F]">
                  <span className="text-[#8B949E]">Risk Exposure Score:</span>
                  <span className={`font-extrabold text-lg ${
                    selectedNode.risk_score >= 70 ? 'text-[#FF5D5D]' : 'text-[#3DDC97]'
                  }`}>
                    {selectedNode.risk_score.toFixed(1)} / 100
                  </span>
                </div>

                {/* Scorecard & CVEs */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-[#1C2333] p-3 rounded-xl border border-[#2A364F]">
                    <div className="flex items-center space-x-1.5 text-[#8B949E] text-[10px]">
                      <Award className="w-3.5 h-3.5 text-[#4D96FF]" />
                      <span>SCORECARD</span>
                    </div>
                    <span className="text-base font-bold text-[#E6EDF3] mt-1 block">
                      {selectedNode.scorecard_score ? `${selectedNode.scorecard_score} / 10` : 'N/A'}
                    </span>
                  </div>

                  <div className="bg-[#1C2333] p-3 rounded-xl border border-[#2A364F]">
                    <div className="flex items-center space-x-1.5 text-[#8B949E] text-[10px]">
                      <Flame className="w-3.5 h-3.5 text-[#FF5D5D]" />
                      <span>KNOWN CVES</span>
                    </div>
                    <span className={`text-base font-bold mt-1 block ${
                      selectedNode.vulnerability_count > 0 ? 'text-[#FF5D5D]' : 'text-[#3DDC97]'
                    }`}>
                      {selectedNode.vulnerability_count} CVEs
                    </span>
                  </div>
                </div>

                {selectedNode.has_kev && (
                  <div className="bg-[#FF5D5D]/15 border border-[#FF5D5D]/40 rounded-xl p-3 text-[#FF5D5D] flex items-center space-x-2 shadow-glow-red">
                    <Flame className="w-4 h-4 shrink-0 animate-pulse" />
                    <span className="text-[11px] font-bold">Actively exploited in the wild (CISA KEV)</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 space-y-2.5">
                  <button
                    onClick={() => onOpenWarRoom(selectedNode.id.replace('pkg:', ''))}
                    className="w-full py-3 rounded-xl bg-[#FF5D5D]/20 border border-[#FF5D5D]/60 text-[#FF5D5D] hover:bg-[#FF5D5D]/30 font-bold flex items-center justify-center space-x-2 transition-all shadow-glow-red"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>Simulate Compromise in War Room</span>
                  </button>

                  <button
                    onClick={() => onOpenRiskReport(selectedNode.id.replace('pkg:', ''))}
                    className="w-full py-3 rounded-xl bg-[#1C2333] hover:bg-[#2A364F] border border-[#2A364F] text-[#E6EDF3] font-bold flex items-center justify-center space-x-2 transition-all"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View Explainable AI Risk Report</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3.5 text-xs font-mono">
                <div className="bg-[#1C2333] p-3.5 rounded-xl border border-[#2A364F]">
                  <span className="text-[#8B949E] block text-[10px]">CRITICALITY TAG</span>
                  <span className="font-extrabold text-[#3DDC97] uppercase mt-1 block text-sm">
                    {selectedNode.criticality_tag?.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-[#8B949E] text-xs leading-relaxed">
                  This is the root target application. All compromise propagation vectors originate from its deep transitive dependency tree and sweep upstream to this microservice.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
