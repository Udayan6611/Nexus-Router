"use client";
import React, { useState } from 'react';
import { 
  FileCode, 
  Cpu, 
  ShieldCheck, 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  Terminal,
  Zap
} from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);

  const steps = [
    {
      number: '01',
      title: 'Describe Your Task',
      desc: 'Submit a prompt, explain your requirements, or provide a supported document.',
      icon: Terminal,
      details: 'Accepts raw text prompts, document attachments (PDF, Markdown, JSON), or programmatic API requests with structured schemas.',
      badge: 'Task Ingestion'
    },
    {
      number: '02',
      title: 'Understand & Recommend',
      desc: 'AI analyzes the task and recommends suitable models from the available catalogue.',
      icon: Sparkles,
      details: 'Evaluates required context window length, multimodal vision needs, reasoning depth, and syntactic code capabilities against the live model catalog.',
      badge: 'Intent Analysis'
    },
    {
      number: '03',
      title: 'Apply Routing Policies',
      desc: 'The deterministic routing engine evaluates hard constraints and makes the final routing decision.',
      icon: ShieldCheck,
      details: 'Validates strict SLA latency ceilings, per-token cost caps, provider failover rules, and data residency compliance before releasing execution.',
      badge: 'Policy Enforcement'
    },
    {
      number: '04',
      title: 'Execute & Learn',
      desc: 'Execute the request, capture available telemetry, and use performance insights to inform future decisions.',
      icon: Activity,
      details: 'Captures end-to-end token latency, response quality feedback, and execution costs to continuously calibrate future routing confidence.',
      badge: 'Telemetry & Tuning'
    },
  ];

  return (
    <section id="how-it-works" className="relative py-24 px-4 sm:px-8 max-w-7xl mx-auto border-t border-amber-500/20 text-stone-100">
      
      {/* Background solar flare */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] glow-solar-flare blur-[120px] pointer-events-none rounded-full" />

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16 relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-900 border border-amber-500/30 text-xs font-medium text-amber-300 mb-4">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Deterministic Pipeline</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4 font-display">
          How It Works
        </h2>

        <p className="text-stone-300 text-sm sm:text-base font-light">
          A four-stage deterministic pipeline from request ingestion to policy-enforced execution.
        </p>
      </div>

      {/* 4 Steps Horizontal / Vertical Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isSelected = activeStep === idx;
          return (
            <div
              key={step.number}
              onClick={() => setActiveStep(idx)}
              className={`p-6 rounded-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[300px] glass-card-transparent ${
                isSelected
                  ? 'border-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/40 bg-white/[0.07]'
                  : 'hover:border-amber-400/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-2xl font-bold font-mono ${isSelected ? 'text-amber-400' : 'text-stone-500'}`}>
                    {step.number}
                  </span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-amber-500/20 text-amber-300' : 'bg-stone-900 text-stone-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="text-[11px] font-mono text-amber-400/80 uppercase tracking-wider mb-1">
                  {step.badge}
                </div>

                <h3 className="text-base font-bold text-white mb-2 font-display">
                  {step.title}
                </h3>

                <p className="text-xs text-stone-300 leading-relaxed font-light">
                  {step.desc}
                </p>
              </div>

              {isSelected && (
                <div className="mt-4 pt-4 border-t border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed font-mono">
                  {step.details}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </section>
  );
};
