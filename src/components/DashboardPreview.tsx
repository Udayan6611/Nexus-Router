"use client";
import React, { useState } from 'react';
import { 
  BarChart3, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  Sliders, 
  Layers, 
  Cpu, 
  CheckCircle2, 
  ArrowUpRight, 
  RefreshCw, 
  Search, 
  Plus, 
  ChevronRight,
  Terminal,
  Activity,
  Zap
} from 'lucide-react';

interface ModelStat {
  name: string;
  provider: string;
  share: number;
  barHeight: string;
  latency: string;
  cost: string;
  bestFor: string;
  color: string;
}

export const DashboardPreview: React.FC = () => {
  const [selectedPillar, setSelectedPillar] = useState<number>(0);
  const [activeTaskPreset, setActiveTaskPreset] = useState<string>('doc');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const modelStats: ModelStat[] = [
    { name: 'Gemini 3.1', provider: 'Google', share: 34, barHeight: 'h-28', latency: '185ms', cost: '$0.15/1M', bestFor: 'Low latency & Long context', color: 'from-blue-600 to-cyan-400' },
    { name: 'Claude Opus 4.7', provider: 'Anthropic', share: 26, barHeight: 'h-22', latency: '420ms', cost: '$15.00/1M', bestFor: 'Deep reasoning & Complex analysis', color: 'from-indigo-600 to-sky-400' },
    { name: 'GPT-5.5', provider: 'OpenAI', share: 22, barHeight: 'h-18', latency: '310ms', cost: '$5.00/1M', bestFor: 'Multimodal vision & General knowledge', color: 'from-cyan-600 to-blue-500' },
    { name: 'DeepSeek V4', provider: 'DeepSeek', share: 12, barHeight: 'h-12', latency: '260ms', cost: '$0.28/1M', bestFor: 'Code generation & Math logic', color: 'from-blue-700 to-indigo-500' },
    { name: 'Grok 4.20', provider: 'xAI', share: 6, barHeight: 'h-7', latency: '290ms', cost: '$2.00/1M', bestFor: 'Live data synthesis', color: 'from-slate-700 to-blue-900' },
  ];

  const recentDecisions = [
    { id: '#8942', task: 'RAG Ingestion: 84-page Tech Spec', selected: 'Gemini 3.1', latency: '194ms', cost: '$0.0004', reason: 'Context > 100k tokens + cost optimization' },
    { id: '#8941', task: 'Customer Support Realtime Agent', selected: 'Gemini 3.1', latency: '162ms', cost: '$0.0001', reason: 'Strict latency threshold < 200ms' },
    { id: '#8940', task: 'Architecture Trade-off Analysis', selected: 'Claude Opus 4.7', latency: '412ms', cost: '$0.0032', reason: 'High-order analytical depth required' },
    { id: '#8939', task: 'Python AST Refactor & Unit Tests', selected: 'DeepSeek V4', latency: '248ms', cost: '$0.0003', reason: 'Code evaluation policy match' },
  ];

  const pillars = [
    {
      title: 'Model Routing',
      desc: 'Match each request to eligible models based on its requirements.',
      icon: Layers,
    },
    {
      title: 'Performance Insights',
      desc: 'Understand latency, usage, and cost through measurable telemetry.',
      icon: Activity,
    },
    {
      title: 'AI Recommendations',
      desc: 'Discover suitable models with transparent reasons and trade-offs.',
      icon: Sparkles,
    },
    {
      title: 'Reliable Execution',
      desc: 'Apply hard constraints and routing policies before execution.',
      icon: ShieldCheck,
    },
  ];

  const triggerSimulation = (presetKey: string) => {
    setActiveTaskPreset(presetKey);
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
    }, 600);
  };

  return (
    <section id="dashboard" className="relative py-20 px-6 sm:px-10 max-w-7xl mx-auto">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-4 font-display text-balance">
          Your entire AI stack. One intelligent control layer.
        </h2>
        <p className="text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
          See how requests flow across your available models, compare recommendations, track performance, and understand the trade-offs behind every routing decision.
        </p>
      </div>

      {/* Main Dashboard Preview Container (Matches Noon's Large Obsidian Glass Frame) */}
      <div className="relative rounded-2xl glass-card-transparent border border-amber-500/25 shadow-[0_20px_90px_rgba(245,158,11,0.18)] overflow-hidden">
        
        {/* Background glow flare radiating behind the dashboard */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[300px] glow-solar-flare blur-[100px] pointer-events-none" />

        {/* 1. Dashboard Top Header Bar */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-amber-500/15 bg-black/40 backdrop-blur-md text-xs">
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border border-amber-400 rotate-45 flex items-center justify-center">
                <div className="w-1 h-1 bg-amber-200" />
              </div>
              <span className="font-bold text-white tracking-wide font-display">NEXUS CONTROL</span>
            </div>

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-900/60 border border-stone-800 text-[11px] text-stone-400 w-64 backdrop-blur-sm">
              <Search className="w-3 h-3 text-stone-500" />
              <span>Search routing logs or policies...</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[11px] text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Router Active · Zero Dropouts</span>
            </div>

            <button
              onClick={() => triggerSimulation('live')}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>Simulate Request</span>
            </button>
          </div>

        </div>

        {/* 2. Interactive Task Preset Tester Strip */}
        <div className="relative z-10 px-6 py-3 bg-black/30 backdrop-blur-sm border-b border-amber-500/15 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-stone-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium text-stone-300">Test Routing Preset:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'doc', label: '84-Page PDF Document (RAG)' },
              { id: 'speed', label: 'Realtime Voice/Chat (< 200ms)' },
              { id: 'code', label: 'Code Refactor & AST Logic' },
              { id: 'reason', label: 'Deep Multi-Step Reasoning' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => triggerSimulation(preset.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                  activeTaskPreset === preset.id
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-[0_0_12px_rgba(245,158,11,0.5)] border border-amber-300/60'
                    : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Dashboard Grid Body */}
        <div className="relative z-10 flex flex-col lg:flex-row min-h-[460px]">
          
          {/* Left Sidebar (Matching Reference Image Sidebar Structure) */}
          <div className="w-full lg:w-52 p-4 border-b lg:border-b-0 lg:border-r border-slate-800 bg-[#040814]/70 flex flex-col justify-between text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-blue-600/20 border border-blue-500/40 text-cyan-300 font-semibold">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>Router Console</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900/60 transition-colors cursor-pointer">
                <Layers className="w-4 h-4 text-slate-400" />
                <span>Model Catalog</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900/60 transition-colors cursor-pointer">
                <Sliders className="w-4 h-4 text-slate-400" />
                <span>Routing Policies</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900/60 transition-colors cursor-pointer">
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                <span>Fallback Chains</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900/60 transition-colors cursor-pointer">
                <Activity className="w-4 h-4 text-slate-400" />
                <span>Telemetry & Logs</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900/60 transition-colors cursor-pointer">
                <Terminal className="w-4 h-4 text-slate-400" />
                <span>API Keys</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Active Region:</span>
                <span className="text-slate-200 font-mono">us-central</span>
              </div>
              <div className="flex justify-between">
                <span>Engine Version:</span>
                <span className="text-cyan-400 font-mono">v4.8-nexus</span>
              </div>
            </div>
          </div>

          {/* Center Main Stage */}
          <div className="flex-1 p-5 sm:p-6 bg-[#060a17]/90 space-y-5">
            
            {/* Top 3 Metric Cards (Matching Reference Image Metric Cards 42 / 21 / 68) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex justify-between items-start text-xs text-slate-400">
                  <span>Available Model Catalog</span>
                  <span className="text-cyan-400 text-[11px] font-mono">12 Models</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white font-mono-code mt-1">
                  5 Tier-1
                </div>
                <p className="text-[11px] text-slate-400 mt-1">GPT-5.5 · Claude · Gemini · DeepSeek</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex justify-between items-start text-xs text-slate-400">
                  <span>Measured Median Latency</span>
                  <span className="text-emerald-400 text-[11px] font-mono">P50</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white font-mono-code mt-1">
                  218ms
                </div>
                <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Within strict &lt; 300ms SLA target</span>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex justify-between items-start text-xs text-slate-400">
                  <span>Policy Enforced Accuracy</span>
                  <span className="text-cyan-400 text-[11px] font-mono">Deterministic</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white font-mono-code mt-1">
                  100%
                </div>
                <p className="text-[11px] text-slate-400 mt-1">0 unconstrained fallbacks triggered</p>
              </div>

            </div>

            {/* 2 Main Visual Widgets (Chart on Left, Decisions Stream on Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left Widget: Live Traffic Routing Distribution Chart (Matching Reference Image Chart) */}
              <div className="lg:col-span-7 p-4 sm:p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-sm font-semibold text-white">Model Traffic Distribution</h4>
                    </div>
                    <span className="text-[11px] text-cyan-300 font-mono bg-blue-950/80 px-2 py-0.5 rounded border border-blue-500/30">
                      Live Telemetry
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Requests matched to models based on task requirements and optimization preferences.
                  </p>
                </div>

                {/* Glowing Bar Chart Representation */}
                <div className="relative pt-6 pb-2">
                  <div className="flex items-end justify-between gap-3 h-36 px-2 border-b border-slate-800">
                    {modelStats.map((model) => (
                      <div key={model.name} className="flex-1 flex flex-col items-center gap-1.5 group cursor-pointer">
                        {/* Hover tag showing share */}
                        <span className="text-[10px] font-mono text-cyan-300 opacity-90 group-hover:scale-110 transition-transform">
                          {model.share}%
                        </span>
                        {/* Bar */}
                        <div
                          className={`w-full max-w-[42px] ${model.barHeight} rounded-t bg-gradient-to-t ${model.color} shadow-[0_0_15px_rgba(56,189,248,0.25)] group-hover:brightness-125 transition-all`}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Horizontal Labels */}
                  <div className="flex justify-between gap-3 px-2 pt-2 text-[10px] text-slate-400 font-mono">
                    {modelStats.map((m) => (
                      <div key={m.name} className="flex-1 text-center truncate">
                        {m.name.split(' ')[0]}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Insight */}
                <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80">
                  <span>Routing Strategy: <strong>Cost-aware latency balance</strong></span>
                  <span className="text-cyan-400 font-mono">Active Engine</span>
                </div>
              </div>

              {/* Right Widget: Real-time Routing Decisions Stream */}
              <div className="lg:col-span-5 p-4 sm:p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <h4 className="text-sm font-semibold text-white">Live Decision Stream</h4>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-mono">Real-time</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Transparent routing reasons behind every decision.
                  </p>
                </div>

                {/* Log Feed */}
                <div className="space-y-2.5 text-xs">
                  {recentDecisions.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-200 truncate max-w-[170px]">
                          {item.task}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-950 text-cyan-300 border border-blue-500/30">
                          {item.selected}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="truncate pr-2">{item.reason}</span>
                        <span className="font-mono text-slate-500 shrink-0">{item.latency}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Micro status */}
                <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5 border-t border-slate-800/80">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Fallback safety active: Automatic reroute on timeout</span>
                </div>
              </div>

            </div>

            {/* Bottom Telemetry Bar (Matching Reference Image "Task progress" bar) */}
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Deterministic routing policies: <strong>All constraints satisfied</strong></span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
                <span>Total Telemetry: 142k requests</span>
                <span className="text-cyan-400">Connected to 5 Model Providers</span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* 4. The 4 Product Pillars (Underneath the preview, highlighting product capabilities) */}
      <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {pillars.map((pillar, idx) => {
          const Icon = pillar.icon;
          const isSelected = selectedPillar === idx;
          return (
            <div
              key={pillar.title}
              onClick={() => setSelectedPillar(idx)}
              className={`p-5 rounded-xl glass-card-transparent transition-all cursor-pointer ${
                isSelected
                  ? 'border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/40 bg-white/[0.08]'
                  : 'hover:border-amber-400/40'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3">
                <Icon className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5 font-display">
                {pillar.title}
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed font-light">
                {pillar.desc}
              </p>
            </div>
          );
        })}
      </div>

    </section>
  );
};
