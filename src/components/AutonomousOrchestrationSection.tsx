"use client";
import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Compass, 
  Cpu, 
  Layers, 
  Sliders, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  Zap,
  Globe,
  Radio,
  FileCode
} from 'lucide-react';

interface AutonomousOrchestrationProps {
  onOpenPlayground: () => void;
}

export const AutonomousOrchestrationSection: React.FC<AutonomousOrchestrationProps> = ({
  onOpenPlayground
}) => {
  const [activeOrbitNode, setActiveOrbitNode] = useState<string>('gemini');

  const capabilities = [
    {
      title: 'Understanding',
      desc: 'Collaborates with incoming payloads to evaluate prompt tokens, reasoning depth, context limit, and latency targets.',
      icon: Cpu,
    },
    {
      title: 'Sourcing & Routing',
      desc: 'Searches across 50+ available frontier and open-source models to score eligible models against your live constraints.',
      icon: Compass,
    },
    {
      title: 'Calibration',
      desc: 'Adapts and calibrates from real-time feedback, TTFT benchmarks, token burn rates, and provider outages.',
      icon: Sliders,
    },
    {
      title: 'Execution & Resilience',
      desc: 'Applies deterministic fallback chains and token budget limits before executing, eliminating dropouts.',
      icon: ShieldCheck,
    },
  ];

  const models = [
    { id: 'claude', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', angle: '0deg', radius: '140px', color: '#f59e0b', latency: '410ms' },
    { id: 'gemini', name: 'Gemini 1.5 Pro', provider: 'DeepMind', angle: '72deg', radius: '140px', color: '#fbbf24', latency: '190ms' },
    { id: 'gpt4o', name: 'GPT-4o', provider: 'OpenAI', angle: '144deg', radius: '140px', color: '#f97316', latency: '310ms' },
    { id: 'deepseek', name: 'DeepSeek V3', provider: 'DeepSeek', angle: '216deg', radius: '140px', color: '#eab308', latency: '240ms' },
    { id: 'llama', name: 'Llama 3 70B', provider: 'Meta AI', angle: '288deg', radius: '140px', color: '#d97706', latency: '180ms' },
  ];

  return (
    <div className="relative py-20 px-4 sm:px-8 max-w-7xl mx-auto text-stone-100">
      
      {/* 1. Section Eyebrow & Title (Matching Noon "Meet Noon, the world's first autonomous sourcer") */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4 font-display">
          Meet NEXUS ROUTER, the world's{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-300 to-amber-500">
            first autonomous orchestrator
          </span>
        </h2>
        <p className="text-stone-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          An AI orchestration engine that performs the end-to-end role of model evaluation, latency arbitrage, and policy execution.
        </p>
      </div>

      {/* 2. Interactive Centerpiece: Orbital Console + 4 Capability Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-24">
        
        {/* Left Orbital Visual (Matching Noon's Dark Concentric Orbital Dial Mockup) */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="relative w-full max-w-[480px] aspect-square rounded-2xl glass-card-transparent p-6 shadow-2xl flex flex-col items-center justify-center overflow-hidden">
            
            {/* Top Bar of Window */}
            <div className="absolute top-0 inset-x-0 h-10 px-4 border-b border-amber-500/15 bg-stone-950/70 flex items-center justify-between text-xs text-stone-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                <span className="font-mono text-[11px] text-stone-300">NEXUS · Autonomous Radar</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-mono">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>Scanning 50+ Models</span>
              </div>
            </div>

            {/* Concentric Orbital Rings */}
            <div className="relative w-72 h-72 rounded-full border border-amber-500/20 flex items-center justify-center animate-spin-slow">
              <div className="w-56 h-56 rounded-full border border-dashed border-amber-500/30 flex items-center justify-center">
                <div className="w-36 h-36 rounded-full border border-amber-500/40 flex items-center justify-center bg-amber-950/20">
                  
                  {/* Central Autonomous Core Dial */}
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 p-[2px] shadow-[0_0_25px_rgba(245,158,11,0.6)]">
                    <div className="w-full h-full bg-[#0d0805] rounded-full flex flex-col items-center justify-center">
                      <Zap className="w-5 h-5 text-amber-300" />
                      <span className="text-[9px] font-mono text-amber-200 mt-0.5">CORE</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Orbiting Model Nodes */}
              {models.map((m, idx) => (
                <button
                  key={m.id}
                  onClick={() => setActiveOrbitNode(m.id)}
                  style={{
                    transform: `rotate(${idx * 72}deg) translate(110px) rotate(-${idx * 72}deg)`
                  }}
                  className={`absolute w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-300 cursor-pointer ${
                    activeOrbitNode === m.id
                      ? 'bg-amber-500 text-stone-950 border-white shadow-[0_0_15px_rgba(245,158,11,0.8)] scale-110'
                      : 'bg-[#150e09] text-amber-300 border-amber-500/40 hover:border-amber-300 hover:scale-105'
                  }`}
                  title={`${m.name} (${m.latency})`}
                >
                  <span className="text-[10px] font-bold font-mono">{m.name.charAt(0)}</span>
                </button>
              ))}
            </div>

            {/* Bottom Telemetry Chip */}
            <div className="absolute bottom-3 inset-x-4 px-3 py-1.5 rounded-lg bg-stone-950/80 border border-amber-500/20 flex items-center justify-between text-[11px] text-stone-300">
              <span className="text-amber-400 font-mono">Active Target:</span>
              <span className="font-semibold text-white">
                {models.find(m => m.id === activeOrbitNode)?.name}
              </span>
              <span className="font-mono text-emerald-400">
                {models.find(m => m.id === activeOrbitNode)?.latency} avg
              </span>
            </div>

          </div>
        </div>

        {/* Right 4 Capability Items (Matching Noon's clean 4-step vertical list) */}
        <div className="lg:col-span-5 space-y-6">
          {capabilities.map((cap, idx) => {
            const Icon = cap.icon;
            return (
              <div key={idx} className="flex items-start gap-4 group">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:bg-amber-500/20 group-hover:border-amber-400/60 transition-all duration-300">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-1 tracking-tight flex items-center gap-2">
                    <span>{cap.title}</span>
                  </h3>
                  <p className="text-xs text-stone-400 leading-relaxed font-light">
                    {cap.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* 3. Dramatic Curved Solar Horizon Arc Banner (Matching Noon's "Welcome to the era of autonomous recruiters") */}
      <div className="relative my-20 py-16 px-6 sm:px-12 rounded-3xl overflow-hidden glass-card-transparent text-center shadow-[0_0_80px_rgba(245,158,11,0.2)]">
        
        {/* Curved Solar Horizon Arc Light */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[300px] horizon-arc blur-[60px] pointer-events-none rounded-full" />
        <div className="absolute top-0 inset-x-0 h-[1px] horizon-line-glow" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">
            Welcome to the era of{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-300 to-amber-500">
              autonomous orchestrators
            </span>
          </h2>

          <p className="text-stone-300 text-sm sm:text-base font-light">
            AI that matches every task dynamically, eliminates vendor lock-in, and optimizes latency.
          </p>

          <div className="pt-4">
            <button
              onClick={onOpenPlayground}
              className="px-7 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-semibold text-xs tracking-wide shadow-[0_0_25px_rgba(245,158,11,0.5)] border border-amber-300/60 hover:shadow-[0_0_35px_rgba(245,158,11,0.7)] active:scale-95 inline-flex items-center gap-2 cursor-pointer transition-all"
            >
              <span>Test on Playground</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom subtle arc */}
        <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
      </div>

    </div>
  );
};
