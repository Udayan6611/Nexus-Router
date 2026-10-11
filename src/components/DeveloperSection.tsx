"use client";
import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  Play, 
  Terminal, 
  Layers, 
  Sliders, 
  Activity, 
  Plug,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export const DeveloperSection: React.FC = () => {
  const [activeLang, setActiveLang] = useState<'ts' | 'python' | 'curl'>('ts');
  const [copied, setCopied] = useState<boolean>(false);
  const [hasExecuted, setHasExecuted] = useState<boolean>(false);
  const [executing, setExecuting] = useState<boolean>(false);

  const codeSnippets = {
    ts: `import { NexusRouter } from "@nexus/sdk";

const nexus = new NexusRouter({
  apiKey: process.env.NEXUS_API_KEY
});

// Example workflow: Route request deterministically
const result = await nexus.route({
  task: "Analyze this document",
  optimizeFor: "balanced"
});

console.log(result.selectedModel); // "claude-3.5-sonnet"
console.log(result.metrics.latencyMs); // 218ms`,

    python: `from nexus_router import NexusRouter
import os

nexus = NexusRouter(api_key=os.environ.get("NEXUS_API_KEY"))

# Example workflow: Route request deterministically
result = await nexus.route(
    task="Analyze this document",
    optimize_for="balanced"
)

print(result.selected_model) # "claude-3.5-sonnet"
print(result.metrics.latency_ms) # 218ms`,

    curl: `curl https://api.nexusrouter.ai/v1/route \\
  -H "Authorization: Bearer $NEXUS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "task": "Analyze this document",
    "optimizeFor": "balanced"
  }'`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippets[activeLang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRun = () => {
    setExecuting(true);
    setTimeout(() => {
      setExecuting(false);
      setHasExecuted(true);
    }, 450);
  };

  return (
    <section id="developers" className="relative py-24 px-4 sm:px-8 max-w-7xl mx-auto border-t border-amber-500/20 text-stone-100">
      
      {/* Background ambient solar glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] glow-solar-flare blur-[130px] pointer-events-none rounded-full" />

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16 relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-900 border border-amber-500/30 text-xs font-medium text-amber-300 mb-4">
          <Code2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Built for Developers</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4 font-display">
          Your models. Your policies.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-300 to-amber-500">
            One routing layer.
          </span>
        </h2>

        <p className="text-stone-300 text-sm sm:text-base font-light">
          Integrate multi-model intelligence into your applications without scattering model-selection logic across your codebase.
        </p>
      </div>

      {/* Interactive Code Terminal Sandbox */}
      <div className="relative z-10 rounded-2xl glass-card-transparent shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden max-w-4xl mx-auto">
        
        {/* Terminal Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-amber-500/20 bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            </div>
            <span className="text-xs text-stone-400 font-mono">Example Workflow</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-stone-900/60 rounded-lg p-0.5 border border-amber-500/20 text-xs backdrop-blur-sm">
              {(['ts', 'python', 'curl'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={`px-3 py-1 rounded font-mono text-[11px] transition-all cursor-pointer ${
                    activeLang === lang
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              onClick={handleCopy}
              className="p-1.5 text-stone-400 hover:text-white rounded bg-stone-900/60 border border-amber-500/20 transition-colors cursor-pointer"
              title="Copy code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleRun}
              className="px-3 py-1 rounded bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
            >
              <Play className="w-3 h-3 fill-stone-950" />
              <span>{executing ? 'Routing...' : 'Run'}</span>
            </button>
          </div>
        </div>

        {/* Code View */}
        <div className="p-6 overflow-x-auto text-xs font-mono bg-black/30 backdrop-blur-sm leading-relaxed text-amber-100">
          <pre>
            <code>{codeSnippets[activeLang]}</code>
          </pre>
        </div>

        {/* Interactive Simulated Execution Output */}
        {hasExecuted && (
          <div className="p-4 border-t border-amber-500/20 bg-stone-950/95 font-mono text-xs text-emerald-400 space-y-1">
            <div className="flex items-center gap-2 text-stone-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Execution verified: 200 OK</span>
            </div>
            <div className="text-[11px] text-stone-400 pl-5">
              Target matched: <span className="text-amber-300 font-bold">Claude 3.5 Sonnet</span> (latency: 218ms, cost: $0.0008, fallback: standby)
            </div>
          </div>
        )}

      </div>

      {/* 4 Pillars in Noon Amber */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-4xl mx-auto text-center">
        {[
          { label: 'Multi-model', desc: '50+ Frontier & OSS Models' },
          { label: 'Policy-driven', desc: 'Latency, Cost & Quality SLA' },
          { label: 'Observable', desc: 'Full-trace Telemetry' },
          { label: 'Extensible', desc: 'Plug & Play SDK' },
        ].map((item, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-[#090604] border border-amber-500/20">
            <div className="font-bold text-white text-sm mb-0.5 font-display">{item.label}</div>
            <div className="text-[11px] text-stone-400 font-light">{item.desc}</div>
          </div>
        ))}
      </div>

    </section>
  );
};
