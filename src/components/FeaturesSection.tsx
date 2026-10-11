"use client";
import React, { useState } from 'react';
import { 
  Sparkles, 
  Cpu, 
  Sliders, 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  Check, 
  Search,
  Zap,
  DollarSign,
  Clock,
  Database,
  GitBranch,
  Bot,
  Brain,
  TrendingUp,
  Activity,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  // Card 2 interactive slider state
  const [tradeoffSetting, setTradeoffSetting] = useState<'speed' | 'balanced' | 'cost'>('balanced');
  const [activeScale, setActiveScale] = useState<string>('2x');

  const enterpriseCaseStudies = [
    { name: 'Carvana', topic: 'Autonomous Latency Arbitrage', metric: '62% Faster TTFT' },
    { name: 'Warner Bros', topic: 'Global Multi-Model Pipelines', metric: '99.99% Uptime' },
    { name: 'Novartis', topic: 'Biomedical Context Extraction', metric: '4.8M Tokens / day' },
    { name: 'JCPenney', topic: 'Customer Support Policy Routing', metric: '-71% Inference Spend' },
  ];

  return (
    <section id="features" className="relative py-20 px-4 sm:px-8 max-w-7xl mx-auto text-stone-100">
      
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-amber-600/10 blur-[130px] pointer-events-none rounded-full" />

      {/* 1. Header (Matching Reference Image Format: Pill + Big Headline + Subtitle) */}
      <div className="text-center max-w-3xl mx-auto mb-16 relative z-10">
        
        {/* Floating Sparkle Pill in Noon Amber */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-900/80 border border-amber-500/30 text-xs font-medium text-amber-300 mb-6 shadow-sm backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Key Features</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-5 font-display leading-[1.15] text-balance">
          Less Model Guesswork.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-300 to-amber-500">
            More Intelligent AI.
          </span>
        </h2>

        <p className="text-base text-stone-300 leading-relaxed max-w-2xl mx-auto">
          A unified orchestration layer for smarter model selection, grounded knowledge, and dependable execution.
        </p>
      </div>

      {/* 2. Four Feature Cards Grid (Matching the 4-Card 2x2 Layout from the Reference Image) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 mb-24">
        
        {/* Card 1: Intelligent Model Selection */}
        <div className="p-7 rounded-2xl glass-card-transparent transition-all flex flex-col justify-between shadow-xl min-h-[360px] group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-amber-400 font-mono">01. SELECTION</span>
              <span className="text-[11px] text-stone-400">Context & Capabilities</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-display group-hover:text-amber-300 transition-colors">
              Intelligent Model Selection
            </h3>
            <p className="text-sm text-stone-300 leading-relaxed mb-6 font-light">
              Describe your task and receive model recommendations based on its complexity, required capabilities, and your optimization preferences.
            </p>
          </div>

          {/* Interactive UI Mockup inside Card 1 */}
          <div className="p-4 rounded-xl bg-black/40 border border-amber-500/20 space-y-3 backdrop-blur-sm">
            <div className="p-2.5 rounded-lg bg-stone-900/60 border border-amber-500/15 text-xs text-stone-300 flex items-center justify-between">
              <span className="truncate">"Analyze technical spec and extract GraphQL schema"</span>
              <span className="text-[10px] text-amber-400 font-mono shrink-0 pl-2">Task Input</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/60 text-amber-300 border border-amber-500/30">
                Context: 42k
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/60 text-amber-300 border border-amber-500/30">
                Reasoning: High
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/60 text-amber-300 border border-amber-500/30">
                Code Capability
              </span>
            </div>

            <div className="p-2 rounded bg-stone-900/70 border border-amber-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-white font-medium">Selected: Claude 3.5 Sonnet</span>
              </div>
              <span className="text-amber-400 font-mono text-[11px]">99% Fit</span>
            </div>
          </div>
        </div>

        {/* Card 2: Cost & Latency Awareness */}
        <div className="p-7 rounded-2xl glass-card-transparent transition-all flex flex-col justify-between shadow-xl min-h-[360px] group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-orange-400 font-mono">02. OPTIMIZATION</span>
              <span className="text-[11px] text-stone-400">Trade-off Engine</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-display group-hover:text-amber-300 transition-colors">
              Cost & Latency Awareness
            </h3>
            <p className="text-sm text-stone-300 leading-relaxed mb-6 font-light">
              Compare available options and make informed trade-offs between speed, quality, and cost within your routing policies.
            </p>
          </div>

          {/* Interactive Trade-off Controls inside Card 2 */}
          <div className="p-4 rounded-xl bg-black/40 border border-amber-500/20 space-y-3 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-400 font-mono">Policy Objective:</span>
              <div className="flex gap-1">
                {(['speed', 'balanced', 'cost'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setTradeoffSetting(mode)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono capitalize transition-all cursor-pointer ${
                      tradeoffSetting === mode
                        ? 'bg-amber-500 text-stone-950 font-bold shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                        : 'bg-stone-900/60 text-stone-400 hover:text-white border border-stone-800'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2 rounded bg-stone-900/60 border border-stone-800">
                <div className="text-[10px] text-stone-400">Target Latency</div>
                <div className="text-sm font-bold text-amber-300 font-mono">
                  {tradeoffSetting === 'speed' ? '< 180ms' : tradeoffSetting === 'balanced' ? '280ms' : '450ms'}
                </div>
              </div>
              <div className="p-2 rounded bg-stone-900/60 border border-stone-800">
                <div className="text-[10px] text-stone-400">Avg Cost/Req</div>
                <div className="text-sm font-bold text-emerald-400 font-mono">
                  {tradeoffSetting === 'speed' ? '$0.0003' : tradeoffSetting === 'balanced' ? '$0.0008' : '$0.0001'}
                </div>
              </div>
              <div className="p-2 rounded bg-stone-900/60 border border-stone-800">
                <div className="text-[10px] text-stone-400">Quality Score</div>
                <div className="text-sm font-bold text-white font-mono">
                  {tradeoffSetting === 'speed' ? '92/100' : tradeoffSetting === 'balanced' ? '98/100' : '88/100'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Document Intelligence & RAG */}
        <div className="p-7 rounded-2xl glass-card-transparent transition-all flex flex-col justify-between shadow-xl min-h-[360px] group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-yellow-400 font-mono">03. GROUNDING</span>
              <span className="text-[11px] text-stone-400">Hybrid Search + Vector</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-display group-hover:text-amber-300 transition-colors">
              Document Intelligence & RAG
            </h3>
            <p className="text-sm text-stone-300 leading-relaxed mb-6 font-light">
              Turn PDFs, READMEs, and project documentation into searchable knowledge with answers grounded in retrieved sources.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-amber-500/20 space-y-2 backdrop-blur-sm">
            <div className="flex items-center gap-2 p-2 rounded bg-stone-900/60 border border-stone-800 text-xs">
              <FileText className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-stone-300 truncate font-mono text-[11px]">architecture_v4_draft.pdf</span>
              <span className="text-[10px] text-amber-400 ml-auto shrink-0 font-mono">Indexed</span>
            </div>
            <div className="p-2.5 rounded bg-stone-900/70 border border-stone-800 text-[11px] text-stone-300 font-light leading-relaxed">
              "Grounding verified across 18 retrieved chunk citations. Zero hallucinations detected."
            </div>
          </div>
        </div>

        {/* Card 4: Reliable AI Orchestration */}
        <div className="p-7 rounded-2xl glass-card-transparent transition-all flex flex-col justify-between shadow-xl min-h-[360px] group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-amber-300 font-mono">04. RELIABILITY</span>
              <span className="text-[11px] text-stone-400">Policy Engine</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-display group-hover:text-amber-300 transition-colors">
              Reliable AI Orchestration
            </h3>
            <p className="text-sm text-stone-300 leading-relaxed mb-6 font-light">
              Keep recommendations separate from final routing decisions, enforce hard constraints, and handle failures through defined fallback policies.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-amber-500/20 space-y-2 text-xs backdrop-blur-sm">
            <div className="flex items-center justify-between p-2 rounded bg-stone-900/60 border border-stone-800 font-mono text-[11px]">
              <span className="text-stone-300">Policy: Max Latency &lt; 250ms</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Enforced
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-stone-900/60 border border-stone-800 font-mono text-[11px]">
              <span className="text-stone-300">Fallback: Claude → Gemini</span>
              <span className="text-amber-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Noon-Style 3 Rich Showcase Windows */}
      
      {/* Showcase 1: Unprecedented Intelligence with Neural Net Mockup */}
      <div className="my-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center glass-card-transparent rounded-3xl p-6 sm:p-10 shadow-[0_0_60px_rgba(245,158,11,0.1)]">
        <div className="lg:col-span-5 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300">
            <Brain className="w-3.5 h-3.5" />
            <span>Multi-Model Network</span>
          </div>
          <h3 className="text-2xl sm:text-4xl font-bold text-white tracking-tight font-display">
            Unprecedented<br />Intelligence
          </h3>
          <p className="text-stone-300 text-sm leading-relaxed font-light">
            NEXUS ROUTER consistently outperforms human prompt engineers on multi-step, challenging routing jobs.
          </p>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 text-xs font-semibold text-amber-300 hover:text-amber-200 border-b border-amber-500/40 pb-0.5 pt-2"
          >
            <span>Show Me How</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="lg:col-span-7">
          <div className="rounded-2xl bg-[#0d0906] border border-amber-500/25 p-5 shadow-inner">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-amber-500/15 text-xs text-stone-400 font-mono">
              <span className="text-amber-300">✦ Noon Neural Router</span>
              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-200 text-[10px]">Intelligence: Active</span>
            </div>
            
            {/* Neural Net SVG visualization matching Noon's GUI */}
            <svg viewBox="0 0 500 200" className="w-full h-48">
              <g stroke="#f59e0b" strokeWidth="0.75" strokeOpacity="0.3">
                <line x1="60" y1="50" x2="220" y2="40" />
                <line x1="60" y1="50" x2="220" y2="100" />
                <line x1="60" y1="100" x2="220" y2="40" />
                <line x1="60" y1="100" x2="220" y2="100" />
                <line x1="60" y1="100" x2="220" y2="160" />
                <line x1="60" y1="150" x2="220" y2="100" />
                <line x1="60" y1="150" x2="220" y2="160" />

                <line x1="220" y1="40" x2="420" y2="70" />
                <line x1="220" y1="100" x2="420" y2="70" />
                <line x1="220" y1="100" x2="420" y2="130" />
                <line x1="220" y1="160" x2="420" y2="130" />
              </g>

              {/* Layer 1 nodes */}
              {[50, 100, 150].map((y, idx) => (
                <circle key={`l1-${idx}`} cx="60" cy={y} r="8" fill="#150e09" stroke="#f59e0b" strokeWidth="2" />
              ))}

              {/* Layer 2 hidden nodes */}
              {[40, 100, 160].map((y, idx) => (
                <circle key={`l2-${idx}`} cx="220" cy={y} r="9" fill="#291b10" stroke="#fbbf24" strokeWidth="2" />
              ))}

              {/* Layer 3 target model nodes */}
              {[70, 130].map((y, idx) => (
                <circle key={`l3-${idx}`} cx="420" cy={y} r="10" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
              ))}
            </svg>
          </div>
        </div>
      </div>

      {/* Showcase 2: Empathetic and Human / Dialogue Trade-off Window */}
      <div className="my-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center glass-card-transparent rounded-3xl p-6 sm:p-10 shadow-[0_0_60px_rgba(245,158,11,0.1)]">
        <div className="lg:col-span-7 order-2 lg:order-1">
          <div className="rounded-2xl bg-black/40 border border-amber-500/25 p-5 space-y-3 font-sans text-xs backdrop-blur-sm">
            <div className="flex items-center justify-between pb-2 border-b border-amber-500/15 text-[11px] text-stone-400">
              <span className="font-mono text-amber-300">Autonomous Dialogue Stream</span>
              <span>Latency: 142ms</span>
            </div>
            
            <div className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 text-stone-200">
              <span className="text-amber-400 font-mono text-[10px] block mb-1">User Query:</span>
              "Summarize Q3 enterprise financials with balance sheet citations."
            </div>

            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-100">
              <span className="text-amber-300 font-mono text-[10px] block mb-1">Router Decision:</span>
              "Task classified: Tabular financial synthesis with source grounding. Routed to Claude 3.5 Sonnet (Score 98.4%)."
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4 order-1 lg:order-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300">
            <Activity className="w-3.5 h-3.5" />
            <span>Tone & Precision Tuning</span>
          </div>
          <h3 className="text-2xl sm:text-4xl font-bold text-white tracking-tight font-display">
            Adaptive and<br />Precise
          </h3>
          <p className="text-stone-300 text-sm leading-relaxed font-light">
            Trained to capture your team's exact constraints, voice guidelines, and quality bars with transparent feedback.
          </p>
        </div>
      </div>

      {/* 4. Secondary Enterprise Brand Strip (Matching Noon's Carvana, Warner Bros, Novartis, JCPenney) */}
      <div className="my-20">
        <div className="text-center mb-8">
          <span className="text-xs font-mono text-amber-400 uppercase tracking-widest">
            Production-Tested Across Fortune 500 Workloads
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {enterpriseCaseStudies.map((item, idx) => (
            <div 
              key={idx}
              className="p-5 rounded-2xl glass-card-transparent text-center group"
            >
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 mx-auto mb-3 flex items-center justify-center text-amber-400 font-bold font-mono text-xs">
                {item.name.charAt(0)}
              </div>
              <h4 className="font-semibold text-white text-sm mb-1">{item.name}</h4>
              <p className="text-[11px] text-stone-400 mb-2 font-light">{item.topic}</p>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30">
                {item.metric}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. "Build an AI Workforce / Fleet" (Matching Noon's dual panel section) */}
      <div className="my-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h3 className="text-2xl sm:text-4xl font-bold text-white mb-3 font-display">
            Build an{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-300 to-amber-500">
              AI Workforce
            </span>
          </h3>
          <p className="text-stone-400 text-sm font-light">
            A hyper-accurate, elastic routing fleet that scales with your production API demand.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Panel 1 */}
          <div className="p-8 rounded-3xl glass-card-transparent shadow-xl space-y-4">
            <h4 className="text-lg font-bold text-white font-display">
              Clone Your Best Routing Policy
            </h4>
            <p className="text-xs text-stone-400 leading-relaxed font-light">
              NEXUS ROUTER observes and replicates your latency, cost, and accuracy preferences using Reinforcement Learning from Human Feedback (RLHF).
            </p>

            <div className="p-4 rounded-xl bg-black/40 border border-amber-500/15 space-y-2 backdrop-blur-sm">
              <div className="flex justify-between text-xs">
                <span className="text-amber-300 font-mono">Telemetry Track</span>
                <span className="text-emerald-400 font-mono">100% Policy Match</span>
              </div>
              <div className="w-full bg-stone-900/80 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full w-[84%]" />
              </div>
            </div>
          </div>

          {/* Panel 2 */}
          <div className="p-8 rounded-3xl glass-card-transparent shadow-xl space-y-4">
            <h4 className="text-lg font-bold text-white font-display">
              Dynamically Scale Your Multi-Model Fleet
            </h4>
            <p className="text-xs text-stone-400 leading-relaxed font-light">
              Activate or hibernate models based on traffic spikes, rate-limit thresholds, and regional pricing swings.
            </p>

            <div className="p-4 rounded-xl bg-black/40 border border-amber-500/15 flex items-center justify-between text-xs backdrop-blur-sm">
              <span className="text-stone-400 font-mono">Scale Factor:</span>
              <div className="flex gap-2">
                {['1x', '2x', '3x', '4x'].map((scale) => (
                  <button
                    key={scale}
                    onClick={() => setActiveScale(scale)}
                    className={`px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                      activeScale === scale
                        ? 'bg-amber-500 text-stone-950 font-bold shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                        : 'bg-stone-900/80 text-stone-400 hover:text-white'
                    }`}
                  >
                    {scale}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

    </section>
  );
};
