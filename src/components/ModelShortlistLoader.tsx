"use client";
import React, { useState, useEffect } from 'react';
import { ArrowRight, Radio, CheckCircle2 } from 'lucide-react';

interface ModelShortlistLoaderProps {
  taskQuery?: string;
  onComplete: () => void;
}

export const ModelShortlistLoader: React.FC<ModelShortlistLoaderProps> = ({
  taskQuery = '',
  onComplete,
}) => {
  const [progress, setProgress] = useState(15);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  const stages = [
    { title: 'Task & Intent Deconstruction', sub: 'Analyzing context length, latency limits, and coding requirements' },
    { title: 'Global Model Space Evaluation', sub: 'Scanning 50+ frontier models across Anthropic, DeepMind, OpenAI & Meta' },
    { title: 'Benchmark Telemetry & Cost Scoring', sub: 'Calibrating TTFT, throughput, token economics, and reliability policies' },
    { title: 'Shortlist Synthesized', sub: 'Preparing recommended model candidates...' },
  ];

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setProgress(45);
      setCurrentStageIndex(1);
    }, 600);

    const timer2 = setTimeout(() => {
      setProgress(80);
      setCurrentStageIndex(2);
    }, 1300);

    const timer3 = setTimeout(() => {
      setProgress(100);
      setCurrentStageIndex(3);
    }, 1900);

    const finishTimer = setTimeout(() => {
      onComplete();
    }, 2400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(finishTimer);
    };
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 selection:bg-white selection:text-black relative overflow-hidden font-sans">
      
      {/* Subtle radial dark glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-zinc-900/40 blur-[140px] pointer-events-none rounded-full" />

      <div className="relative z-10 flex flex-col items-center max-w-lg w-full text-center space-y-7 animate-in fade-in duration-500">
        
        {/* Top Eyebrow Badge - Standard SaaS Monochrome */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-mono text-zinc-300 shadow-sm">
          <Radio className="w-3.5 h-3.5 text-white animate-pulse" />
          <span>AUTONOMOUS MODEL SOURCING</span>
        </div>

        {/* 1. Uiverse.io Concentric Ripple Circle Loader in Black & White */}
        <div className="py-2 flex justify-center">
          <div className="loader loader-bw">
            <div className="box"></div>
            <div className="box"></div>
            <div className="box"></div>
            <div className="box"></div>
            <div className="box"></div>
            <div className="logo">
              {/* Geometric Rhombus AI Routing Emblem in White */}
              <svg 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]"
              >
                <path d="M12 2L2 12l10 10 10-10L12 2zm0 4.2L17.8 12 12 17.8 6.2 12 12 6.2z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            </div>
          </div>
        </div>

        {/* 2. Headline & Current Stage */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
            Shortlisting Optimal Models
          </h2>

          {taskQuery ? (
            <p className="text-xs sm:text-sm text-zinc-400 font-mono">
              Target Task: <span className="text-white font-semibold font-sans">"{taskQuery}"</span>
            </p>
          ) : (
            <p className="text-xs sm:text-sm text-zinc-400 font-light">
              Evaluating global frontier & open-source model catalog
            </p>
          )}
        </div>

        {/* 3. Stage Details & Progress Bar - Standard SaaS Card */}
        <div className="w-full bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 shadow-xl text-left space-y-3 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span className="font-semibold text-white">
                {stages[currentStageIndex]?.title}
              </span>
            </div>
            <span className="font-mono text-white font-bold text-xs">{progress}%</span>
          </div>

          <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
            {stages[currentStageIndex]?.sub}
          </p>

          {/* Clean White Progress Track */}
          <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-white h-1.5 rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(255,255,255,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 4. Quick Skip Control */}
        <button
          onClick={onComplete}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer py-1"
        >
          <span>Skip loading and view models</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

      </div>

    </div>
  );
};
