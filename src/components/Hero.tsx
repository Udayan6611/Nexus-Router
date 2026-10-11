"use client";
import React from 'react';
import { Sparkles, ArrowRight, Terminal, Layers, Zap, Star } from 'lucide-react';
import { ExpandableExploreInput } from './ExpandableExploreInput';
import { GoldenRibbonWave } from './GoldenRibbonWave';

interface HeroProps {
  onOpenPlayground: (prompt?: string) => void;
  onOpenExploreModels: (query?: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenPlayground, onOpenExploreModels }) => {
  const enterpriseQuotes = [
    {
      company: 'Goldman Sachs',
      logo: 'GS',
      name: 'Vicki Tung',
      role: 'Global Head of Talent & AI Systems',
      highlight: 'Routed 25M+ financial compliance queries across frontier models with zero dropped tokens.'
    },
    {
      company: 'Logitech',
      logo: 'G',
      name: 'Kolena Maxwell',
      role: 'Head of Enterprise Intelligence',
      highlight: 'Reduced inference costs by 64% while maintaining sub-200ms latency across our edge fleet.'
    },
    {
      company: 'MetLife',
      logo: 'ML',
      name: 'Patricia Porter',
      role: 'VP, Global Head of AI Engineering',
      highlight: 'Policy-based deterministic fallbacks gave our underwriting pipeline 99.99% uptime.'
    }
  ];

  return (
    <section className="relative pt-10 pb-20 px-4 sm:px-8 lg:px-12 overflow-hidden flex flex-col items-center text-center">
      
      {/* 1. Noon-inspired Solar Golden Radiant Flare */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] glow-solar-flare pointer-events-none rounded-full" />
      <div className="absolute top-[140px] left-1/2 -translate-x-1/2 w-[450px] h-[220px] glow-solar-beam blur-[80px] pointer-events-none rounded-full opacity-60" />

      {/* Warm Golden Starlight / Ember Field */}
      <div className="absolute inset-0 bg-amber-starfield opacity-40 pointer-events-none" />

      {/* 2. Eyebrow Pill in Noon Luxury Gold Style */}
      <div className="relative z-10 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-900/80 border border-amber-500/30 text-xs font-medium text-amber-300 mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(245,158,11,0.2)]">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Intelligent AI Orchestration · Autonomous Model Gateway</span>
      </div>

      {/* 3. Main Headline (Large Centered Typography with Noon Warm Golden Highlights) */}
      <h1 className="relative z-10 text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.12] mb-6 font-display max-w-4xl text-balance">
        One Request. The Right AI.<br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-300 to-amber-500 drop-shadow-[0_0_25px_rgba(245,158,11,0.4)]">
          Every Time.
        </span>
      </h1>

      {/* 4. Subtitle Body Prose */}
      <p className="relative z-10 text-base sm:text-lg text-stone-300 max-w-2xl mb-10 leading-relaxed font-normal">
        Stop guessing which model to use. NEXUS ROUTER intelligently matches every task with the right AI model based on cost, latency, capabilities, and quality.
      </p>

      {/* 5. Dual Action: Test on Playground + Expandable Explore Models Input */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 w-full max-w-2xl">
        <button
          onClick={() => onOpenPlayground()}
          className="w-full sm:w-auto shrink-0 px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-sm font-semibold text-stone-950 transition-all shadow-[0_0_30px_rgba(245,158,11,0.55)] border border-amber-300/60 hover:shadow-[0_0_40px_rgba(245,158,11,0.8)] active:scale-95 flex items-center justify-center gap-2 cursor-pointer group"
        >
          <span>Test on Playground</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Expandable Button at the reference image location */}
        <div className="w-full sm:w-auto flex justify-center">
          <ExpandableExploreInput 
            onOpenExploreModels={onOpenExploreModels}
            onOpenPlayground={onOpenPlayground}
          />
        </div>
      </div>

      {/* 6. Signature Noon Undulating Golden Ribbon Mesh Wave */}
      <div className="relative z-10 w-full max-w-5xl my-2">
        <GoldenRibbonWave />
      </div>

      {/* 7. Enterprise Proof Cards (Matching Noon row right below golden wave) */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {enterpriseQuotes.map((item, idx) => (
          <div 
            key={idx}
            className="glass-card-transparent rounded-2xl p-5 text-left transition-all duration-300 hover:-translate-y-0.5 group"
          >
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs font-mono">
                {item.logo}
              </div>
              <div>
                <div className="text-white text-xs font-semibold tracking-wide flex items-center gap-1.5">
                  <span>{item.company}</span>
                  <span className="w-1 h-1 rounded-full bg-amber-400/80" />
                </div>
                <div className="text-stone-400 text-[11px]">{item.name}</div>
              </div>
            </div>
            <p className="text-stone-300 text-xs leading-relaxed font-light">
              "{item.highlight}"
            </p>
          </div>
        ))}
      </div>

      {/* 8. Quiet Developer Proof Kicker */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 text-xs text-stone-400 font-mono tracking-wide mt-10">
        <span className="flex items-center gap-1.5 text-stone-300">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          Multi-model intelligence
        </span>
        <span aria-hidden="true" className="text-stone-700">·</span>
        <span className="flex items-center gap-1.5 text-stone-300">
          <Zap className="w-3.5 h-3.5 text-orange-400" />
          Cost-aware routing
        </span>
        <span aria-hidden="true" className="text-stone-700">·</span>
        <span className="flex items-center gap-1.5 text-stone-300">
          <Terminal className="w-3.5 h-3.5 text-amber-300" />
          Built for developers
        </span>
      </div>

    </section>
  );
};
